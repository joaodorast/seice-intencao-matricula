import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  School,
  Search,
  Settings2,
  Square,
  SquareCheck,
} from "lucide-react";
import LoginForm from "../components/admin/LoginForm";
import PreMatriculaTable from "../components/admin/PreMatriculaTable";
import OverviewTab from "../components/admin/OverviewTab";
import TurmasTab from "../components/admin/TurmasTab";
import RelatoriosTab from "../components/admin/RelatoriosTab";
import ConfiguracoesTab from "../components/admin/ConfiguracoesTab";
import { Button, Spinner } from "../components/ui";
import logoIcon from "../assets/seice-icon.png";
import { UNIDADES } from "../config";
import { atualizarStatus, buscarPreMatriculas, verificarToken } from "../lib/adminApi";
import { listarTurmas } from "../lib/adminTurmasApi";
import { ouvirMudancaDeVagas } from "../lib/realtime";
import { STATUS_INFO, unidadeCurta } from "../lib/labels";
import { calcularPosicoesEspera, calcularPosicoesIntencao } from "../lib/format";
import { buscarConta, EMAIL_COM_CONFIGURACOES, soVePorSenha, type Conta } from "../lib/contas";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow, Unidade } from "../types";

const TOKEN_KEY = "seice_admin_token";
const CONTA_KEY = "seice_admin_conta_email";
// atualiza os números sozinho de tempos em tempos, mesmo se o aviso em tempo
// real (Supabase Realtime) falhar por algum motivo — é só uma rede de segurança
const AUTO_REFRESH_MS = 45_000;

type AbaAdmin = "visao" | "prematriculas" | "listaEspera" | "turmas" | "relatorios" | "configuracoes";

const ABAS: { key: AbaAdmin; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "visao", label: "Visão geral", icon: LayoutDashboard },
  { key: "prematriculas", label: "Intenções", icon: ClipboardList },
  { key: "listaEspera", label: "Lista de espera", icon: Clock },
  { key: "turmas", label: "Turmas", icon: School },
  { key: "relatorios", label: "Relatórios", icon: FileBarChart2 },
];

/** Rota de cada painel de unidade — dois dashboards próprios, fora do /admin. */
const ROTA_PAINEL_UNIDADE: Record<string, string> = {
  "campos-eliseos": "/seice-ce",
  "jardim-primavera": "/seice-jp",
};

/** Os três painéis: o geral (as duas unidades) e um dashboard só de cada unidade. */
const PAINEIS = [
  { rota: "/admin", slug: null as string | null, nome: "Todas" },
  ...UNIDADES.map((u) => ({ rota: ROTA_PAINEL_UNIDADE[u.slug], slug: u.slug, nome: unidadeCurta(u.slug) })),
];

export default function AdminPage({ unidade: unidadeFixa }: { unidade?: Unidade }) {
  const escopoSlug = unidadeFixa?.slug;
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [conta, setConta] = useState<Conta | null>(() => {
    const email = sessionStorage.getItem(CONTA_KEY);
    return email ? buscarConta(email) : null;
  });
  const [aba, setAba] = useState<AbaAdmin>("visao");
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>(escopoSlug ?? "todas");
  const [busca, setBusca] = useState("");
  // filtro de status pros botões de exportar PDF/Excel dessas duas abas — por
  // padrão não traz quem já cancelou; a pessoa pode desmarcar "Contatado"
  // pra não ver de novo quem já foi chamado, por exemplo
  const [statusExport, setStatusExport] = useState<Set<StatusPreMatricula>>(
    new Set<StatusPreMatricula>(["pendente", "contatado", "matriculado"])
  );
  // período (data de recebimento) pro mesmo filtro de exportação — opcional,
  // pode usar só "de", só "até" ou os dois
  const [dataInicioExport, setDataInicioExport] = useState("");
  const [dataFimExport, setDataFimExport] = useState("");
  const [registros, setRegistros] = useState<PreMatriculaAdminRow[]>([]);
  const [turmas, setTurmas] = useState<TurmaAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // aviso curto depois de mudar o status de alguém: a intenção continua com
  // os dados intactos (só sai da lista de "pendentes" quando deixa de ser
  // pendente), mas sem esse aviso a secretaria via só ela sumir da tela e
  // achava que tinha se perdido
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // trava o botão "voltar" do navegador enquanto estiver logado: sem isso,
  // dava pra sair do painel só apertando voltar (o login não muda de URL,
  // então o navegador manda de volta pra página de antes de entrar aqui)
  useEffect(() => {
    if (!token) return;
    window.history.pushState(null, "", window.location.href);
    const travar = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", travar);
    return () => window.removeEventListener("popstate", travar);
  }, [token]);

  // troca de painel (rota) recarrega os dados no escopo daquela unidade —
  // essa própria chamada já confirma se o token guardado ainda é válido, sem
  // precisar de uma segunda ida ao servidor só pra "verificar sessão" antes
  // (isso dobrava o tempo até a primeira tela aparecer)
  useEffect(() => {
    setUnidadeFiltro(escopoSlug ?? "todas");
    if (token) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, escopoSlug]);

  // conta presa numa unidade (secretaria de CE/JP): manda pro painel dela se
  // tentar abrir o geral ou o da outra unidade — endereçamento automático
  useEffect(() => {
    if (!conta || conta.escopo === "geral") return;
    const rotaCerta = ROTA_PAINEL_UNIDADE[conta.escopo];
    if (escopoSlug !== conta.escopo) navigate(rotaCerta, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta, escopoSlug]);

  // aviso em tempo real: uma intenção nova, um cancelamento ou um ajuste de
  // turma (neste painel ou em outro) recarrega os números sozinho, sem F5
  useEffect(() => {
    if (!token) return;
    return ouvirMudancaDeVagas(() => carregar(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, escopoSlug]);

  // rede de segurança: se o aviso em tempo real falhar, ainda assim atualiza
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") carregar(true);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, escopoSlug]);

  async function handleLogin(email: string, candidato: string): Promise<boolean> {
    const contaEncontrada = buscarConta(email);
    if (!contaEncontrada) return false;
    // conta presa numa unidade não consegue logar na tela da outra unidade
    // nem na do painel geral — barrado aqui, antes mesmo de checar a senha,
    // e não só redirecionado depois de já ter entrado
    const acessoPermitido = contaEncontrada.escopo === "geral" || contaEncontrada.escopo === escopoSlug;
    if (!acessoPermitido) return false;
    const ok = await verificarToken(candidato);
    if (ok) {
      sessionStorage.setItem(TOKEN_KEY, candidato);
      sessionStorage.setItem(CONTA_KEY, contaEncontrada.email);
      setToken(candidato);
      setConta(contaEncontrada);
    }
    return ok;
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(CONTA_KEY);
    setToken(null);
    setConta(null);
  }

  // várias coisas disparam carregar() (broadcast em tempo real, o poll de
  // segurança, e a troca de status) e podem responder fora de ordem — sem
  // essa trava, uma resposta antiga que chega depois de uma mais nova pisava
  // por cima dela, fazendo o status "voltar" sozinho na tela.
  const cargaSeq = useRef(0);

  async function carregar(silencioso = false) {
    if (!token) return;
    if (!silencioso) setLoading(true);
    setErro(null);
    const minhaSeq = ++cargaSeq.current;
    try {
      const [pm, tm] = await Promise.all([
        buscarPreMatriculas(token, escopoSlug),
        listarTurmas(token, escopoSlug),
      ]);
      if (minhaSeq !== cargaSeq.current) return; // já saiu uma carga mais nova, ignora só os dados desta
      setRegistros(pm);
      setTurmas(tm);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar dados";
      // token guardado não é mais válido (senha trocada, por exemplo) — essa
      // primeira tentativa de carregar dados já serve como checagem de
      // sessão, sem precisar de uma chamada extra só pra isso
      if (/não autorizado/i.test(msg)) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(CONTA_KEY);
        setToken(null);
        setConta(null);
        return;
      }
      // o spinner e o erro são sempre resolvidos pela própria chamada que os
      // abriu, nunca condicionados à trava de "carga mais nova" — senão uma
      // atualização silenciosa concorrente podia deixar o spinner girando
      // para sempre, sem nunca chamar setLoading(false)
      if (!silencioso) setErro(msg);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  function mostrarAviso(texto: string) {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    setAviso(texto);
    avisoTimer.current = setTimeout(() => setAviso(null), 3500);
  }

  async function handleStatusChange(id: string, status: StatusPreMatricula) {
    if (!token) return;
    const anterior = registros;
    const registro = registros.find((r) => r.id === id);
    cargaSeq.current++; // invalida qualquer carga em andamento: a otimista abaixo manda agora
    setRegistros((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    // some da lista de "pendentes" assim que deixa de ser pendente — os dados
    // continuam intactos na aba Intenções, só avisa pra não parecer que sumiu
    if (registro && status !== "pendente") {
      mostrarAviso(`${registro.aluno_nome} marcado como ${STATUS_INFO[status].label} — continua na aba Intenções.`);
    }
    try {
      await atualizarStatus(token, id, status);
      carregar(true); // cancelar libera vaga: as turmas mudam junto
    } catch (e) {
      setRegistros(anterior);
      alert("Não foi possível atualizar o status: " + (e instanceof Error ? e.message : ""));
    }
  }

  const registrosDaUnidade = registros.filter(
    (r) => unidadeFiltro === "todas" || r.unidade_id === unidadeFiltro
  );
  function combinaBusca(r: PreMatriculaAdminRow): boolean {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return (
      r.aluno_nome.toLowerCase().includes(termo) ||
      r.responsavel_nome.toLowerCase().includes(termo) ||
      (r.turmas?.serie ?? "").toLowerCase().includes(termo) ||
      (r.turmas?.serie_full ?? "").toLowerCase().includes(termo) ||
      (r.turmas?.codigo ?? "").toLowerCase().includes(termo)
    );
  }
  // calculada sobre todos os registros (não só os filtrados na tela), pra
  // posição não mudar dependendo de busca/filtro aplicado
  const posicoesEspera = calcularPosicoesEspera(registros);
  const posicoesIntencao = calcularPosicoesIntencao(registros);
  // duas telas separadas, igual no relatório em PDF: uma só com quem tem
  // vaga garantida, outra só com quem está na lista de espera — ordenadas
  // por ordem de chegada (senha/horário mais cedo primeiro), que é a ordem
  // de prioridade pra secretaria ligar.
  //
  // A senha "de verdade" (numero_senha) é sequencial pra TODO MUNDO junto —
  // por isso, depois de separar em duas telas (e com cancelamentos no meio),
  // ela fica cheia de buraco dentro de cada tela (01, 03, 05, 08...). Pra
  // essas duas telas específicas, a numeração exibida é recontada do zero,
  // só dentro da própria tela (01, 02, 03, 04...) — sem tocar no registro
  // real, só pra reordenar na exibição, do jeito que a secretaria liga.
  const registrosIntencoesTodos = registrosDaUnidade
    .filter((r) => !r.lista_espera)
    .sort((a, b) => a.numero_senha - b.numero_senha)
    .map((r, i) => ({ ...r, numero_senha: i + 1 }));
  const registrosListaEsperaTodos = registrosDaUnidade
    .filter((r) => r.lista_espera)
    .sort((a, b) => a.numero_senha - b.numero_senha)
    .map((r, i) => ({ ...r, numero_senha: i + 1 }));
  function dentroDoPeriodoExport(criadoEm: string): boolean {
    if (!dataInicioExport && !dataFimExport) return true;
    const data = new Date(criadoEm);
    if (dataInicioExport && data < new Date(`${dataInicioExport}T00:00:00`)) return false;
    if (dataFimExport && data > new Date(`${dataFimExport}T23:59:59.999`)) return false;
    return true;
  }

  // busca + período sempre filtram a tela; o filtro de status (chips
  // "Exportar com status") também — apesar do nome, ele agora filtra a
  // tela inteira (cartões visíveis) e não só o PDF/Excel, pra secretaria
  // conseguir, por exemplo, esconder da tela quem já foi Contatado
  const registrosIntencoesTodos2 = registrosIntencoesTodos.filter(
    (r) => combinaBusca(r) && dentroDoPeriodoExport(r.criado_em)
  );
  const registrosListaEsperaTodos2 = registrosListaEsperaTodos.filter(
    (r) => combinaBusca(r) && dentroDoPeriodoExport(r.criado_em)
  );
  const registrosIntencoes = registrosIntencoesTodos2.filter((r) => statusExport.has(r.status));
  const registrosListaEspera = registrosListaEsperaTodos2.filter((r) => statusExport.has(r.status));

  // contagem por status pro filtro — conta em cima de busca+período, sem
  // aplicar o próprio filtro de status, pra não sumir a contagem de quem
  // tá desmarcado (senão a pessoa nunca mais consegue ver o número de volta)
  const contagemStatusExport = new Map<StatusPreMatricula, number>();
  for (const r of aba === "listaEspera" ? registrosListaEsperaTodos2 : registrosIntencoesTodos2) {
    contagemStatusExport.set(r.status, (contagemStatusExport.get(r.status) ?? 0) + 1);
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} unidade={unidadeFixa?.nome} />;
  }

  const unidadeTabs = [{ slug: "todas", nome: "Todas as unidades" }, ...UNIDADES];
  const escopoLabel = unidadeFixa ? `${unidadeCurta(unidadeFixa.slug)} · ${unidadeFixa.nome}` : "Todas as unidades";
  const sufixoExport = escopoSlug ?? unidadeFiltro;
  // a aba de Configurações (com o reset de dados de teste) só aparece pra
  // essa conta específica — é uma ação sensível, não é pra qualquer login geral
  const abasVisiveis =
    conta?.email === EMAIL_COM_CONFIGURACOES
      ? [...ABAS, { key: "configuracoes" as const, label: "Configurações", icon: Settings2 }]
      : ABAS;

  return (
    <div className="min-h-screen">
      <header className="relative bg-seice-deep">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="SEICE" className="h-10 w-auto" />
            <div>
              <div className="font-display text-[20px] font-semibold text-white">
                {unidadeFixa ? `Painel ${unidadeCurta(unidadeFixa.slug)}` : "Painel da Secretaria"}
              </div>
              <div className="text-[14px] text-white/55">
                {escopoLabel} · Ano letivo 2027{conta ? ` · ${conta.nome}` : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* troca entre painéis — só pra quem tem acesso geral (enxerga as
                duas unidades). Um login preso numa unidade (secretaria de CE
                ou JP) nunca vê isso, em nenhuma rota — sem jeito de abrir o
                painel geral nem o da outra secretaria. */}
            {conta?.escopo === "geral" && (
              <nav className="flex items-center gap-1 rounded-xl border border-white/12 bg-white/5 p-1">
                {PAINEIS.map((p) => {
                  const ativo = (p.slug ?? null) === (escopoSlug ?? null);
                  return (
                    <Link
                      key={p.rota}
                      to={p.rota}
                      className={`rounded-lg px-3 py-1.5 text-[14px] font-bold transition ${
                        ativo ? "bg-seice-gold text-seice-gold-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {p.nome}
                    </Link>
                  );
                })}
              </nav>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[15px] font-bold text-white transition hover:border-white/35 hover:bg-white/5"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>
        <div className="gold-hairline absolute inset-x-0 bottom-0 h-px" />
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {/* Navegação por seção do painel */}
        <div className="card-surface mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-seice-border p-1.5 sm:flex-wrap sm:overflow-visible">
          {abasVisiveis.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[14.5px] font-bold transition ${
                aba === key
                  ? "icon-tile"
                  : "text-seice-muted hover:bg-seice-chip hover:text-seice-ink"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Filtro por unidade — só no painel geral; nos dashboards de unidade o escopo é fixo */}
        {!unidadeFixa && (aba === "prematriculas" || aba === "listaEspera" || aba === "turmas") && (
          <div className="mb-4 flex flex-wrap gap-2">
            {unidadeTabs.map((t) => (
              <button
                key={t.slug}
                onClick={() => setUnidadeFiltro(t.slug)}
                className={`rounded-full border px-4 py-2.5 text-[14.5px] font-bold transition ${
                  unidadeFiltro === t.slug
                    ? "border-seice-gold bg-seice-gold text-seice-gold-ink"
                    : "raised-surface border-seice-border-strong text-seice-ink hover:border-seice-gold/40"
                }`}
              >
                {t.nome}
              </button>
            ))}
          </div>
        )}

        {(aba === "prematriculas" || aba === "listaEspera") && (
          <div className="mb-4 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-55 flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted"
                />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por aluno, responsável, série ou turma..."
                  className="inset-surface w-full rounded-xl border border-seice-border-strong py-2.5 pl-9 pr-3.5 text-[15px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/20"
                />
              </div>
              <Button variant="dark" onClick={() => carregar()} className="!px-4 !py-2.5">
                <RefreshCw size={14} /> Atualizar
              </Button>
              <Button
                variant="ghost"
                disabled={statusExport.size === 0}
                onClick={async () => {
                  const registrosParaExportar = aba === "listaEspera" ? registrosListaEspera : registrosIntencoes;
                  const filtroStatus = [...statusExport];
                  if (aba === "listaEspera") {
                    const { exportarPorSenhaListaEsperaPDF } = await import("../lib/pdf");
                    await exportarPorSenhaListaEsperaPDF(registrosParaExportar, escopoLabel, filtroStatus);
                  } else {
                    const { exportarPorSenhaIntencoesPDF } = await import("../lib/pdf");
                    await exportarPorSenhaIntencoesPDF(registrosParaExportar, escopoLabel, filtroStatus);
                  }
                }}
                className="!px-4 !py-2.5"
              >
                <Download size={14} /> PDF
              </Button>
              <Button
                variant="ghost"
                disabled={statusExport.size === 0}
                onClick={async () => {
                  const registrosParaExportar = aba === "listaEspera" ? registrosListaEspera : registrosIntencoes;
                  const sufixo = `${sufixoExport}-${aba === "listaEspera" ? "lista-espera" : "intencoes"}`;
                  if (aba === "listaEspera") {
                    const { exportarPorSenhaListaEsperaExcel } = await import("../lib/excel");
                    exportarPorSenhaListaEsperaExcel(registrosParaExportar, sufixo);
                  } else {
                    const { exportarPorSenhaIntencoesExcel } = await import("../lib/excel");
                    exportarPorSenhaIntencoesExcel(registrosParaExportar, sufixo);
                  }
                }}
                className="!px-4 !py-2.5"
              >
                <Download size={14} /> Excel
              </Button>
            </div>

            {/* filtro de status + período: filtra a tela (os cartões
                abaixo) e também o que sai no PDF/Excel — os dois sempre
                em sincronia com o que está marcado aqui */}
            <div className="inset-surface flex flex-wrap items-center gap-1.5 rounded-xl border border-seice-border p-2">
              <span className="mr-1 shrink-0 text-[12.5px] font-bold text-seice-ink">Exportar com status:</span>
              {(["pendente", "contatado", "matriculado", "cancelado"] as StatusPreMatricula[]).map((s) => {
                const ativo = statusExport.has(s);
                const qtd = contagemStatusExport.get(s) ?? 0;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setStatusExport((atual) => {
                        const novo = new Set(atual);
                        if (novo.has(s)) novo.delete(s);
                        else novo.add(s);
                        return novo;
                      })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
                      ativo
                        ? "border-seice-gold bg-seice-gold/10 text-seice-ink"
                        : "border-seice-border-strong text-seice-muted hover:text-seice-ink"
                    }`}
                  >
                    {ativo ? (
                      <SquareCheck size={14} strokeWidth={2.2} className="text-seice-gold" />
                    ) : (
                      <Square size={13} />
                    )}
                    {STATUS_INFO[s]?.label ?? s}
                    <span className={`tabular-nums ${ativo ? "text-seice-gold" : "text-seice-muted"}`}>({qtd})</span>
                  </button>
                );
              })}
              <span className="ml-2 shrink-0 text-[12.5px] font-bold text-seice-ink">Por período:</span>
              <label className="flex items-center gap-1.5">
                <span className="text-[12.5px] text-seice-muted">a partir de</span>
                <input
                  type="date"
                  value={dataInicioExport}
                  max={dataFimExport || undefined}
                  onChange={(e) => setDataInicioExport(e.target.value)}
                  className="inset-surface rounded-lg border border-seice-border-strong px-2.5 py-1.5 text-[12.5px] text-seice-ink outline-none focus:border-seice-gold"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-[12.5px] text-seice-muted">até</span>
                <input
                  type="date"
                  value={dataFimExport}
                  min={dataInicioExport || undefined}
                  onChange={(e) => setDataFimExport(e.target.value)}
                  className="inset-surface rounded-lg border border-seice-border-strong px-2.5 py-1.5 text-[12.5px] text-seice-ink outline-none focus:border-seice-gold"
                />
              </label>
              {(dataInicioExport || dataFimExport) && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicioExport("");
                    setDataFimExport("");
                  }}
                  className="text-[12px] font-bold text-seice-gold hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {loading && <Spinner label="Carregando dados do painel..." />}
        {!loading && erro && (
          <div className="rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3.5 text-[15px] text-seice-danger">
            Não foi possível carregar os dados: {erro}
          </div>
        )}

        {!loading && !erro && (
          <>
            {aba === "visao" && (
              <OverviewTab
                turmas={turmas}
                preMatriculas={registros}
                posicoesEspera={posicoesEspera}
                onStatusChange={handleStatusChange}
                onVerTodas={() => setAba("prematriculas")}
              />
            )}
            {aba === "prematriculas" && (
              <>
                <p className="mb-4 text-[14.5px] leading-relaxed text-seice-muted">
                  Ordenado por senha (quem se inscreveu mais cedo primeiro). A coluna "Posição na fila" é a
                  ordem de chegada <strong className="text-seice-ink">dentro da turma daquela linha</strong> —
                  cada turma conta a própria fila, por isso é normal aparecer "1ª" várias vezes.
                </p>
                <PreMatriculaTable
                  registros={registrosIntencoes}
                  posicoes={posicoesIntencao}
                  onStatusChange={handleStatusChange}
                />
              </>
            )}
            {aba === "listaEspera" && (
              <>
                <p className="mb-4 text-[14.5px] leading-relaxed text-seice-muted">
                  Ordenado por senha (quem se inscreveu mais cedo primeiro). A coluna "Posição na fila" é a
                  ordem <strong className="text-seice-ink">dentro da turma daquela linha</strong> — cada
                  turma tem sua própria fila, por isso é normal aparecer "1ª" várias vezes.
                </p>
                <PreMatriculaTable
                  registros={registrosListaEspera}
                  posicoes={posicoesEspera}
                  onStatusChange={handleStatusChange}
                  mensagemVazia="Ninguém na lista de espera no momento."
                />
              </>
            )}
            {aba === "turmas" && (
              <TurmasTab
                token={token}
                turmas={turmas}
                unidadeFiltro={unidadeFiltro}
                onChange={() => carregar()}
              />
            )}
            {aba === "relatorios" && (
              <RelatoriosTab
                turmas={turmas}
                preMatriculas={registros}
                escopo={escopoLabelCurto(unidadeFixa?.slug)}
                somentePorSenha={soVePorSenha(conta?.email)}
              />
            )}
            {aba === "configuracoes" && conta?.email === EMAIL_COM_CONFIGURACOES && (
              <ConfiguracoesTab token={token} onReset={() => carregar()} />
            )}
          </>
        )}
      </div>

      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-seice-border-strong bg-seice-deep px-4 py-3 text-[14.5px] font-medium text-white shadow-[0_16px_32px_-10px_rgba(0,0,0,0.5)]">
            <CheckCircle2 size={17} className="shrink-0 text-seice-success" />
            {aviso}
          </div>
        </div>
      )}
    </div>
  );
}

function escopoLabelCurto(slug?: string): string {
  return slug ? unidadeCurta(slug) : "Todas as unidades";
}

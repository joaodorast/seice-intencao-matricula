import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Download,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  School,
  Search,
} from "lucide-react";
import LoginForm from "../components/admin/LoginForm";
import PreMatriculaTable from "../components/admin/PreMatriculaTable";
import OverviewTab from "../components/admin/OverviewTab";
import TurmasTab from "../components/admin/TurmasTab";
import RelatoriosTab from "../components/admin/RelatoriosTab";
import { Button, Spinner } from "../components/ui";
import logoIcon from "../assets/seice-icon.png";
import { UNIDADES } from "../config";
import { atualizarStatus, buscarPreMatriculas, verificarToken } from "../lib/adminApi";
import { listarTurmas } from "../lib/adminTurmasApi";
import { ouvirMudancaDeVagas } from "../lib/realtime";
import { unidadeCurta } from "../lib/labels";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow, Unidade } from "../types";

const TOKEN_KEY = "seice_admin_token";
// atualiza os números sozinho de tempos em tempos, mesmo se o aviso em tempo
// real (Supabase Realtime) falhar por algum motivo — é só uma rede de segurança
const AUTO_REFRESH_MS = 45_000;

type AbaAdmin = "visao" | "prematriculas" | "turmas" | "relatorios";

const ABAS: { key: AbaAdmin; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "visao", label: "Visão geral", icon: LayoutDashboard },
  { key: "prematriculas", label: "Intenções", icon: ClipboardList },
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

  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [checkingSession, setCheckingSession] = useState(true);
  const [aba, setAba] = useState<AbaAdmin>("visao");
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>(escopoSlug ?? "todas");
  const [busca, setBusca] = useState("");
  const [registros, setRegistros] = useState<PreMatriculaAdminRow[]>([]);
  const [turmas, setTurmas] = useState<TurmaAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }
    verificarToken(token).then((ok) => {
      if (!ok) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      setCheckingSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // troca de painel (rota) recarrega os dados no escopo daquela unidade
  useEffect(() => {
    setUnidadeFiltro(escopoSlug ?? "todas");
    if (token) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, escopoSlug]);

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

  async function handleLogin(candidato: string): Promise<boolean> {
    const ok = await verificarToken(candidato);
    if (ok) {
      sessionStorage.setItem(TOKEN_KEY, candidato);
      setToken(candidato);
    }
    return ok;
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  async function carregar(silencioso = false) {
    if (!token) return;
    if (!silencioso) setLoading(true);
    setErro(null);
    try {
      const [pm, tm] = await Promise.all([
        buscarPreMatriculas(token, escopoSlug),
        listarTurmas(token, escopoSlug),
      ]);
      setRegistros(pm);
      setTurmas(tm);
    } catch (e) {
      if (!silencioso) setErro(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: StatusPreMatricula) {
    if (!token) return;
    const anterior = registros;
    setRegistros((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
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
  const registrosFiltrados = registrosDaUnidade.filter((r) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return (
      r.aluno_nome.toLowerCase().includes(termo) || r.responsavel_nome.toLowerCase().includes(termo)
    );
  });

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} unidade={unidadeFixa?.nome} />;
  }

  const unidadeTabs = [{ slug: "todas", nome: "Todas as unidades" }, ...UNIDADES];
  const escopoLabel = unidadeFixa ? `${unidadeCurta(unidadeFixa.slug)} · ${unidadeFixa.nome}` : "Todas as unidades";
  const sufixoExport = escopoSlug ?? unidadeFiltro;

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
              <div className="text-[14px] text-white/55">{escopoLabel} · Ano letivo 2027</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* troca entre o painel geral e o dashboard de cada unidade */}
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
          {ABAS.map(({ key, label, icon: Icon }) => (
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
        {!unidadeFixa && (aba === "prematriculas" || aba === "turmas") && (
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

        {aba === "prematriculas" && (
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-55 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por aluno ou responsável..."
                className="inset-surface w-full rounded-xl border border-seice-border-strong py-2.5 pl-9 pr-3.5 text-[15px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/20"
              />
            </div>
            <Button variant="dark" onClick={() => carregar()} className="!px-4 !py-2.5">
              <RefreshCw size={14} /> Atualizar
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                const { exportarCSV } = await import("../lib/csv");
                exportarCSV(registrosFiltrados, sufixoExport);
              }}
              className="!px-4 !py-2.5"
            >
              <Download size={14} /> CSV
            </Button>
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
                onStatusChange={handleStatusChange}
                onVerTodas={() => setAba("prematriculas")}
              />
            )}
            {aba === "prematriculas" && (
              <PreMatriculaTable registros={registrosFiltrados} onStatusChange={handleStatusChange} />
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
              <RelatoriosTab turmas={turmas} preMatriculas={registros} escopo={escopoLabelCurto(unidadeFixa?.slug)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function escopoLabelCurto(slug?: string): string {
  return slug ? unidadeCurta(slug) : "Todas as unidades";
}

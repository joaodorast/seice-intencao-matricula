import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutGrid,
  ListChecks,
  ListOrdered,
  ListTree,
  LoaderCircle,
  Search,
  Square,
  SquareCheck,
  X,
} from "lucide-react";
import { NIVEIS } from "../../config";
import { turnoLabel } from "../../lib/format";
import { ordenarTurmas, STATUS_INFO, unidadeCurta } from "../../lib/labels";
import { vagaStatus } from "../../lib/vagas";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow } from "../../types";
import { Badge } from "../ui";
import Modal from "./Modal";

const TIER_BADGE = { abertas: "success", poucas: "gold", ultimas: "danger" } as const;

type Tipo = "completo" | "intencoes" | "detalhado" | "porsenha" | "porsenhaintencoes" | "porsenhaespera";
type Formato = "xlsx" | "pdf";

// por padrão o relatório não traz quem já cancelou — a pessoa pode marcar de
// volta se quiser ver mesmo assim
const TODOS_OS_STATUS: StatusPreMatricula[] = ["pendente", "contatado", "matriculado", "cancelado"];
const STATUS_PADRAO: StatusPreMatricula[] = ["pendente", "contatado", "matriculado"];

function slugificar(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Modal de exportação: escolhe o relatório completo, só as intenções, uma
 * turma ou várias de uma vez — e baixa em PDF ou Excel já com esse recorte,
 * sem precisar sair filtrando na tela antes.
 */
export default function ExportarRelatorioModal({
  open,
  onClose,
  turmas,
  preMatriculas,
  escopo,
  tipoInicial = "completo",
}: {
  open: boolean;
  onClose: () => void;
  turmas: TurmaAdminRow[];
  preMatriculas: PreMatriculaAdminRow[];
  escopo: string;
  tipoInicial?: Tipo;
}) {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);

  // o botão "Relatório detalhado" da tela abre o modal já nesse tipo — sem
  // isso, reabrir o modal por ali sempre voltava pra aba "Turmas"
  useEffect(() => {
    if (open) setTipo(tipoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [todas, setTodas] = useState(true);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [statusAtivos, setStatusAtivos] = useState<Set<StatusPreMatricula>>(new Set(STATUS_PADRAO));
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [gerando, setGerando] = useState<Formato | null>(null);
  const [baixado, setBaixado] = useState<Formato | null>(null);

  const turmasOrdenadas = useMemo(() => ordenarTurmas(turmas), [turmas]);
  const turmasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return turmasOrdenadas;
    return turmasOrdenadas.filter(
      (t) =>
        t.serie.toLowerCase().includes(termo) ||
        t.codigo.toLowerCase().includes(termo) ||
        (t.curso ?? "").toLowerCase().includes(termo) ||
        unidadeCurta(t.unidade_id).toLowerCase().includes(termo)
    );
  }, [turmasOrdenadas, busca]);

  const gruposPorNivel = useMemo(() => {
    const grupos = new Map<string, TurmaAdminRow[]>();
    for (const t of turmasVisiveis) {
      if (!grupos.has(t.nivel)) grupos.set(t.nivel, []);
      grupos.get(t.nivel)!.push(t);
    }
    return grupos;
  }, [turmasVisiveis]);

  function alternar(id: string) {
    setTodas(false);
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarTodasVisiveis() {
    setTodas(false);
    setSelecionadas((atual) => new Set([...atual, ...turmasVisiveis.map((t) => t.id)]));
  }

  function escolherTodas() {
    setTodas(true);
    setSelecionadas(new Set());
  }

  function alternarStatus(status: StatusPreMatricula) {
    setStatusAtivos((atual) => {
      const novo = new Set(atual);
      if (novo.has(status)) novo.delete(status);
      else novo.add(status);
      return novo;
    });
  }

  // período (data de recebimento) — os dois campos são opcionais e podem ser
  // usados junto ou separado (só "de", só "até", ou os dois)
  function dentroDoPeriodo(criadoEm: string): boolean {
    if (!dataInicio && !dataFim) return true;
    const data = new Date(criadoEm);
    if (dataInicio && data < new Date(`${dataInicio}T00:00:00`)) return false;
    if (dataFim && data > new Date(`${dataFim}T23:59:59.999`)) return false;
    return true;
  }

  const listaSelecionadas = todas ? [] : turmasOrdenadas.filter((t) => selecionadas.has(t.id));
  const turmasFiltradas = todas ? turmas : listaSelecionadas;
  const idsFiltrados = new Set(turmasFiltradas.map((t) => t.id));
  const preMatriculasDaTurma = (todas ? preMatriculas : preMatriculas.filter((p) => idsFiltrados.has(p.turma_id))).filter(
    (p) => dentroDoPeriodo(p.criado_em)
  );
  const preMatriculasFiltradas = preMatriculasDaTurma.filter((p) => statusAtivos.has(p.status));

  // os relatórios "Por senha · Intenções" e "Por senha · Lista de espera"
  // recortam mais um pouco (só quem não tá/tá na lista de espera) — a
  // contagem por status (chips) e o total exibido precisam refletir só esse
  // recorte, senão mostra "Contatado: 33" mesmo quando só 1 desses 33 é
  // lista de espera de verdade, confundindo quem tá vendo o filtro
  const preMatriculasDoTipo =
    tipo === "porsenhaintencoes"
      ? preMatriculasDaTurma.filter((p) => !p.lista_espera)
      : tipo === "porsenhaespera"
      ? preMatriculasDaTurma.filter((p) => p.lista_espera)
      : preMatriculasDaTurma;

  // conta quantos registros cada status tem (só pelo recorte de turma +
  // tipo de relatório, antes do filtro de status) — pra mostrar o número ao
  // lado de cada opção e a pessoa já ver na hora quantos vai marcar/desmarcar
  const contagemPorStatus = new Map<StatusPreMatricula, number>();
  for (const p of preMatriculasDoTipo) {
    contagemPorStatus.set(p.status, (contagemPorStatus.get(p.status) ?? 0) + 1);
  }

  const totalNoRelatorio = preMatriculasDoTipo.filter((p) => statusAtivos.has(p.status)).length;

  const rotuloSelecao = todas
    ? `Todas as turmas — ${escopo}`
    : listaSelecionadas.length === 1
    ? `${listaSelecionadas[0].serie} · Turma ${listaSelecionadas[0].codigo} · ${turnoLabel(listaSelecionadas[0].turno)}`
    : listaSelecionadas.length === 0
    ? "Nenhuma turma selecionada"
    : `${listaSelecionadas.length} turmas selecionadas`;

  const totalOfertadas = turmasFiltradas.reduce((acc, t) => acc + t.vagas_planilha, 0);
  const totalLivres = turmasFiltradas.reduce((acc, t) => acc + t.vagas_restantes, 0);

  const sufixo =
    slugificar(
      [escopo, !todas && (listaSelecionadas.length === 1 ? rotuloSelecao : `${listaSelecionadas.length}-turmas`)]
        .filter(Boolean)
        .join(" ")
    ) || "todas";

  function fecharEReiniciar() {
    onClose();
    setTimeout(() => {
      setTipo(tipoInicial);
      escolherTodas();
      setStatusAtivos(new Set(STATUS_PADRAO));
      setDataInicio("");
      setDataFim("");
      setBusca("");
      setBaixado(null);
    }, 200);
  }

  // impede exportar um recorte vazio (0 turmas marcadas, ou nenhum status
  // marcado quando o relatório depende de pré-matrículas — "Turmas" é o
  // único tipo que não usa esse filtro, então não trava por causa dele)
  const podeExportar = (todas || listaSelecionadas.length > 0) && (tipo === "completo" || statusAtivos.size > 0);

  async function exportar(formato: Formato) {
    if (!podeExportar) return;
    setGerando(formato);
    setBaixado(null);
    const filtroStatus = [...statusAtivos];
    try {
      if (tipo === "completo") {
        if (formato === "xlsx") {
          const { exportarRelatorioCompletoExcel } = await import("../../lib/excel");
          exportarRelatorioCompletoExcel(turmasFiltradas);
        } else {
          const { exportarRelatorioCompletoPDF } = await import("../../lib/pdf");
          await exportarRelatorioCompletoPDF(turmasFiltradas, escopo);
        }
      } else if (tipo === "detalhado") {
        if (formato === "xlsx") {
          const { exportarRelatorioDetalhadoExcel } = await import("../../lib/excel");
          exportarRelatorioDetalhadoExcel(turmasFiltradas, preMatriculasFiltradas);
        } else {
          const { exportarRelatorioDetalhadoPDF } = await import("../../lib/pdf");
          await exportarRelatorioDetalhadoPDF(turmasFiltradas, preMatriculasFiltradas, escopo, filtroStatus);
        }
      } else if (tipo === "porsenha") {
        if (formato === "xlsx") {
          const { exportarPorSenhaExcel } = await import("../../lib/excel");
          exportarPorSenhaExcel(preMatriculasFiltradas, sufixo);
        } else {
          const { exportarPorSenhaPDF } = await import("../../lib/pdf");
          await exportarPorSenhaPDF(preMatriculasFiltradas, escopo, filtroStatus);
        }
      } else if (tipo === "porsenhaintencoes") {
        if (formato === "xlsx") {
          const { exportarPorSenhaIntencoesExcel } = await import("../../lib/excel");
          exportarPorSenhaIntencoesExcel(preMatriculasFiltradas, sufixo);
        } else {
          const { exportarPorSenhaIntencoesPDF } = await import("../../lib/pdf");
          await exportarPorSenhaIntencoesPDF(preMatriculasFiltradas, escopo, filtroStatus);
        }
      } else if (tipo === "porsenhaespera") {
        if (formato === "xlsx") {
          const { exportarPorSenhaListaEsperaExcel } = await import("../../lib/excel");
          exportarPorSenhaListaEsperaExcel(preMatriculasFiltradas, sufixo);
        } else {
          const { exportarPorSenhaListaEsperaPDF } = await import("../../lib/pdf");
          await exportarPorSenhaListaEsperaPDF(preMatriculasFiltradas, escopo, filtroStatus);
        }
      } else {
        if (formato === "xlsx") {
          const { exportarIntencoesExcel } = await import("../../lib/excel");
          exportarIntencoesExcel(preMatriculasFiltradas, sufixo);
        } else {
          const { exportarIntencoesPDF } = await import("../../lib/pdf");
          await exportarIntencoesPDF(preMatriculasFiltradas, sufixo, escopo, filtroStatus);
        }
      }
      setBaixado(formato);
      setTimeout(() => setBaixado(null), 2500);
    } finally {
      setGerando(null);
    }
  }

  return (
    <Modal open={open} onClose={fecharEReiniciar} title="Exportar relatório" width="max-w-[92rem]">
      <div className="flex flex-col gap-5">
        {/* o que exportar: vagas por turma, ou a lista de intenções */}
        <div className="inset-surface flex flex-nowrap gap-1 overflow-x-auto rounded-xl border border-seice-border p-1.5">
          <TipoTab ativo={tipo === "completo"} onClick={() => setTipo("completo")} icon={<Layers size={16} />}>
            Turmas
          </TipoTab>
          <TipoTab ativo={tipo === "intencoes"} onClick={() => setTipo("intencoes")} icon={<FileText size={16} />}>
            Intenções
          </TipoTab>
          <TipoTab ativo={tipo === "detalhado"} onClick={() => setTipo("detalhado")} icon={<ListTree size={16} />}>
            Detalhado
          </TipoTab>
          <TipoTab ativo={tipo === "porsenha"} onClick={() => setTipo("porsenha")} icon={<ListOrdered size={16} />}>
            Por senha
          </TipoTab>
          <TipoTab
            ativo={tipo === "porsenhaintencoes"}
            onClick={() => setTipo("porsenhaintencoes")}
            icon={<ListOrdered size={16} />}
          >
            Por senha · Intenções de matrícula
          </TipoTab>
          <TipoTab
            ativo={tipo === "porsenhaespera"}
            onClick={() => setTipo("porsenhaespera")}
            icon={<ListOrdered size={16} />}
          >
            Por senha · Lista de espera
          </TipoTab>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          {/* escolha das turmas — cartões grandes, seleção múltipla */}
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por série, código ou curso..."
                  className="inset-surface w-full rounded-xl border border-seice-border-strong py-2.5 pl-10 pr-3.5 text-[14.5px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold"
                />
              </div>
              <button
                type="button"
                onClick={marcarTodasVisiveis}
                className="raised-surface inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-seice-border-strong px-3.5 py-2.5 text-[13.5px] font-bold text-seice-ink transition hover:border-seice-gold/40"
              >
                <ListChecks size={15} /> Marcar visíveis
              </button>
            </div>

            <div className="grid min-h-[20rem] flex-1 grid-cols-1 gap-2.5 overflow-y-auto rounded-2xl border border-seice-border bg-seice-panel p-3 sm:grid-cols-2 xl:grid-cols-3">
              <CartaoTurma
                ativo={todas}
                onClick={escolherTodas}
                icone={<LayoutGrid size={17} />}
                titulo="Todas as turmas"
                subtitulo={escopo}
                destaque
              />

              {turmasVisiveis.length === 0 && (
                <p className="col-span-full px-3 py-10 text-center text-[14px] text-seice-muted">
                  Nenhuma turma encontrada para "{busca}".
                </p>
              )}

              {NIVEIS.filter((n) => gruposPorNivel.has(n.key)).map((n) => (
                <div key={n.key} className="col-span-full grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="col-span-full mt-1.5 px-1 text-[12.5px] font-bold uppercase tracking-wide text-seice-muted first:mt-0">
                    {n.label}
                  </div>
                  {gruposPorNivel.get(n.key)!.map((t) => {
                    const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
                    return (
                      <CartaoTurma
                        key={t.id}
                        ativo={!todas && selecionadas.has(t.id)}
                        onClick={() => alternar(t.id)}
                        titulo={`${t.serie} · Turma ${t.codigo}`}
                        subtitulo={`${unidadeCurta(t.unidade_id)} · ${turnoLabel(t.turno)}${t.curso ? ` · ${t.curso}` : ""}`}
                        badge={
                          <Badge tone={t.vagas_planilha === 0 ? "neutral" : TIER_BADGE[status.tier]}>
                            {t.vagas_restantes} vaga{t.vagas_restantes === 1 ? "" : "s"}
                          </Badge>
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* resumo da seleção + exportar — os filtros rolam por dentro
              desse card quando não cabem, mas os botões de baixar ficam
              fora dessa área de rolagem, sempre visíveis sem precisar rolar */}
          <div className="card-surface flex max-h-[78vh] flex-col gap-4 rounded-2xl border border-seice-border p-4">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <div>
              <div className="mb-2.5 text-[12.5px] font-bold uppercase tracking-wide text-seice-muted">
                Seleção
              </div>

              {todas ? (
                <div className="inset-surface rounded-xl border border-seice-gold/40 p-3.5">
                  <div className="text-[15px] font-bold text-seice-ink">Todas as turmas</div>
                  <div className="text-[13px] text-seice-muted">{escopo}</div>
                </div>
              ) : listaSelecionadas.length === 0 ? (
                <div className="inset-surface rounded-xl border border-seice-border-strong p-3.5 text-[13.5px] text-seice-muted">
                  Escolha uma ou mais turmas na lista ao lado.
                </div>
              ) : (
                <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
                  {listaSelecionadas.map((t) => (
                    <div
                      key={t.id}
                      className="inset-surface flex items-center justify-between gap-2 rounded-lg border border-seice-border px-2.5 py-2"
                    >
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-seice-ink">
                        {t.serie} · {t.codigo}
                      </span>
                      <button
                        type="button"
                        onClick={() => alternar(t.id)}
                        className="shrink-0 rounded-full p-0.5 text-seice-muted transition hover:bg-seice-chip hover:text-seice-danger"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {tipo !== "completo" && (
              <div className="min-w-0 overflow-hidden rounded-2xl border border-seice-border-strong bg-seice-panel p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-seice-ink">Filtrar por status</span>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusAtivos((atual) =>
                        atual.size === TODOS_OS_STATUS.length ? new Set() : new Set(TODOS_OS_STATUS)
                      )
                    }
                    className="text-[12px] font-bold text-seice-gold hover:underline"
                  >
                    {statusAtivos.size === TODOS_OS_STATUS.length ? "Desmarcar tudo" : "Marcar tudo"}
                  </button>
                </div>
                <p className="mb-3 text-[12.5px] leading-snug text-seice-muted">
                  Só quem tiver o status marcado abaixo sai no relatório. Desmarque "Contatado", por exemplo, pra
                  não ver de novo quem já foi chamado.
                </p>
                <div className="flex flex-col gap-1.5">
                  {TODOS_OS_STATUS.map((s) => {
                    const ativo = statusAtivos.has(s);
                    const qtd = contagemPorStatus.get(s) ?? 0;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => alternarStatus(s)}
                        disabled={qtd === 0}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[14px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          ativo
                            ? "border-seice-gold bg-seice-gold/10 text-seice-ink"
                            : "border-seice-border text-seice-muted hover:border-seice-border-strong hover:text-seice-ink"
                        }`}
                      >
                        {ativo ? (
                          <SquareCheck size={18} strokeWidth={2.2} className="shrink-0 text-seice-gold" />
                        ) : (
                          <Square size={17} className="shrink-0" />
                        )}
                        <span className="flex-1">{STATUS_INFO[s]?.label ?? s}</span>
                        <span
                          className={`inset-surface rounded-full px-2 py-0.5 text-[12px] font-extrabold tabular-nums ${
                            ativo ? "text-seice-gold" : "text-seice-muted"
                          }`}
                        >
                          {qtd}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {statusAtivos.size === 0 && (
                  <p className="mt-2.5 text-[12.5px] font-semibold text-seice-danger">Marque ao menos um status.</p>
                )}

                <div className="mt-3.5 border-t border-seice-border pt-3.5">
                  <span className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-seice-ink">
                    <Calendar size={14} className="text-seice-muted" /> Por período
                  </span>
                  <p className="mb-3 text-[12.5px] leading-snug text-seice-muted">
                    Opcional. Só entram no relatório os registros recebidos dentro do período escolhido abaixo. Se
                    deixar em branco, entram registros de qualquer data.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="block w-full min-w-0">
                      <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-seice-muted">
                        A partir de que dia
                      </span>
                      <input
                        type="date"
                        value={dataInicio}
                        max={dataFim || undefined}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="inset-surface block w-full min-w-0 rounded-lg border border-seice-border-strong px-2.5 py-2 text-[13.5px] text-seice-ink outline-none focus:border-seice-gold"
                      />
                    </label>
                    <label className="block w-full min-w-0">
                      <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-seice-muted">
                        Até que dia
                      </span>
                      <input
                        type="date"
                        value={dataFim}
                        min={dataInicio || undefined}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="inset-surface block w-full min-w-0 rounded-lg border border-seice-border-strong px-2.5 py-2 text-[13.5px] text-seice-ink outline-none focus:border-seice-gold"
                      />
                    </label>
                  </div>
                  {(dataInicio || dataFim) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDataInicio("");
                        setDataFim("");
                      }}
                      className="mt-2 text-[12px] font-bold text-seice-gold hover:underline"
                    >
                      Limpar datas e voltar a trazer tudo
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <MiniNumero label="Turmas" value={turmasFiltradas.length} />
              <MiniNumero label="Ofertadas" value={totalOfertadas} />
              <MiniNumero label="Livres" value={totalLivres} destaque />
              <MiniNumero label="No relatório" value={totalNoRelatorio} />
            </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2.5 border-t border-seice-border pt-4">
              <BotaoExportar
                formato="pdf"
                rotulo="Baixar em PDF"
                icone={<FileText size={17} />}
                gerando={gerando === "pdf"}
                baixado={baixado === "pdf"}
                disabled={gerando !== null || !podeExportar}
                onClick={() => exportar("pdf")}
                destaque
              />
              <BotaoExportar
                formato="xlsx"
                rotulo="Baixar em Excel"
                icone={<FileSpreadsheet size={17} />}
                gerando={gerando === "xlsx"}
                baixado={baixado === "xlsx"}
                disabled={gerando !== null || !podeExportar}
                onClick={() => exportar("xlsx")}
              />
              {!podeExportar && (
                <p className="text-center text-[12.5px] text-seice-danger">
                  {statusAtivos.size === 0 && tipo !== "completo"
                    ? "Marque ao menos um status."
                    : "Selecione ao menos uma turma."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TipoTab({
  ativo,
  onClick,
  icon,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13.5px] font-bold transition ${
        ativo ? "bg-seice-gold text-seice-gold-ink" : "text-seice-soft hover:bg-seice-chip"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function CartaoTurma({
  ativo,
  onClick,
  icone,
  titulo,
  subtitulo,
  badge,
  destaque = false,
}: {
  ativo: boolean;
  onClick: () => void;
  icone?: React.ReactNode;
  titulo: string;
  subtitulo: string;
  badge?: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-surface flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
        ativo ? "border-seice-gold ring-1 ring-inset ring-seice-gold" : "border-seice-border hover:border-seice-border-strong"
      } ${destaque ? "sm:col-span-2 xl:col-span-3" : ""}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
          ativo ? "text-seice-gold" : "text-seice-muted"
        }`}
      >
        {ativo ? <SquareCheck size={20} strokeWidth={2.2} /> : <Square size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {icone && <span className="text-seice-muted">{icone}</span>}
          <div className="truncate text-[15px] font-bold text-seice-ink">{titulo}</div>
        </div>
        <div className="mt-0.5 truncate text-[13px] text-seice-muted">{subtitulo}</div>
      </div>
      {badge}
    </button>
  );
}

function MiniNumero({ label, value, destaque = false }: { label: string; value: number; destaque?: boolean }) {
  return (
    <div className="inset-surface rounded-lg border border-seice-border px-3 py-2">
      <div className="text-[11.5px] font-bold uppercase tracking-wide text-seice-muted">{label}</div>
      <div className={`text-[19px] font-extrabold tabular-nums ${destaque ? "text-seice-gold" : "text-seice-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function BotaoExportar({
  formato,
  rotulo,
  icone,
  gerando,
  baixado,
  disabled,
  onClick,
  destaque = false,
}: {
  formato: Formato;
  rotulo: string;
  icone: React.ReactNode;
  gerando: boolean;
  baixado: boolean;
  disabled: boolean;
  onClick: () => void;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-formato={formato}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        baixado
          ? "bg-seice-success text-white"
          : destaque
          ? "icon-tile hover:brightness-125"
          : "raised-surface border border-seice-border-strong text-seice-ink hover:border-seice-gold/40"
      }`}
    >
      {gerando ? (
        <LoaderCircle size={17} className="animate-spin" />
      ) : baixado ? (
        <Check size={17} strokeWidth={3} />
      ) : (
        icone
      )}
      {baixado ? "Baixado!" : rotulo}
    </button>
  );
}

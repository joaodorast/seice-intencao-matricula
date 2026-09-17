import { useMemo, useState } from "react";
import {
  Check,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutGrid,
  ListChecks,
  LoaderCircle,
  Search,
  Square,
  SquareCheck,
  X,
} from "lucide-react";
import { NIVEIS } from "../../config";
import { turnoLabel } from "../../lib/format";
import { ordenarTurmas, unidadeCurta } from "../../lib/labels";
import { vagaStatus } from "../../lib/vagas";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../../types";
import { Badge } from "../ui";
import Modal from "./Modal";

const TIER_BADGE = { abertas: "success", poucas: "gold", ultimas: "danger" } as const;

type Tipo = "completo" | "intencoes";
type Formato = "xlsx" | "pdf";

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
}: {
  open: boolean;
  onClose: () => void;
  turmas: TurmaAdminRow[];
  preMatriculas: PreMatriculaAdminRow[];
  escopo: string;
}) {
  const [tipo, setTipo] = useState<Tipo>("completo");
  const [todas, setTodas] = useState(true);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
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

  const listaSelecionadas = todas ? [] : turmasOrdenadas.filter((t) => selecionadas.has(t.id));
  const turmasFiltradas = todas ? turmas : listaSelecionadas;
  const idsFiltrados = new Set(turmasFiltradas.map((t) => t.id));
  const preMatriculasFiltradas = todas
    ? preMatriculas
    : preMatriculas.filter((p) => idsFiltrados.has(p.turma_id));

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
      setTipo("completo");
      escolherTodas();
      setBusca("");
      setBaixado(null);
    }, 200);
  }

  // impede exportar um recorte vazio (0 turmas marcadas)
  const podeExportar = todas || listaSelecionadas.length > 0;

  async function exportar(formato: Formato) {
    if (!podeExportar) return;
    setGerando(formato);
    setBaixado(null);
    try {
      if (tipo === "completo") {
        if (formato === "xlsx") {
          const { exportarRelatorioCompletoExcel } = await import("../../lib/excel");
          exportarRelatorioCompletoExcel(turmasFiltradas);
        } else {
          const { exportarRelatorioCompletoPDF } = await import("../../lib/pdf");
          await exportarRelatorioCompletoPDF(turmasFiltradas, escopo);
        }
      } else {
        if (formato === "xlsx") {
          const { exportarIntencoesExcel } = await import("../../lib/excel");
          exportarIntencoesExcel(preMatriculasFiltradas, sufixo);
        } else {
          const { exportarIntencoesPDF } = await import("../../lib/pdf");
          await exportarIntencoesPDF(preMatriculasFiltradas, sufixo, escopo);
        }
      }
      setBaixado(formato);
      setTimeout(() => setBaixado(null), 2500);
    } finally {
      setGerando(null);
    }
  }

  return (
    <Modal open={open} onClose={fecharEReiniciar} title="Exportar relatório" width="max-w-5xl">
      <div className="flex flex-col gap-5">
        {/* o que exportar: vagas por turma, ou a lista de intenções */}
        <div className="inset-surface flex rounded-xl border border-seice-border p-1.5">
          <TipoTab ativo={tipo === "completo"} onClick={() => setTipo("completo")} icon={<Layers size={16} />}>
            Turmas
          </TipoTab>
          <TipoTab ativo={tipo === "intencoes"} onClick={() => setTipo("intencoes")} icon={<FileText size={16} />}>
            Intenções
          </TipoTab>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* escolha das turmas — cartões grandes, seleção múltipla */}
          <div className="flex min-w-0 flex-col gap-3">
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

            <div className="grid max-h-[30rem] grid-cols-1 gap-2.5 overflow-y-auto rounded-2xl border border-seice-border bg-seice-panel p-3 sm:grid-cols-2">
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
                <div key={n.key} className="col-span-full grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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

          {/* resumo da seleção + exportar */}
          <div className="card-surface flex flex-col gap-4 rounded-2xl border border-seice-border p-4">
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

            <div className="grid grid-cols-2 gap-2.5">
              <MiniNumero label="Turmas" value={turmasFiltradas.length} />
              <MiniNumero label="Ofertadas" value={totalOfertadas} />
              <MiniNumero label="Livres" value={totalLivres} destaque />
              <MiniNumero label="Intenções" value={preMatriculasFiltradas.length} />
            </div>

            <div className="mt-auto flex flex-col gap-2.5 border-t border-seice-border pt-4">
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
                <p className="text-center text-[12.5px] text-seice-danger">Selecione ao menos uma turma.</p>
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
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[14.5px] font-bold transition ${
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
      } ${destaque ? "sm:col-span-2" : ""}`}
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

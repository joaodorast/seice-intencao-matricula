import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Filter, LoaderCircle, TrendingUp } from "lucide-react";
import { NIVEIS } from "../../config";
import { ordenarTurmas, resumoTurmas, unidadeCurta } from "../../lib/labels";
import { turnoLabel } from "../../lib/format";
import type { Nivel, PreMatriculaAdminRow, TurmaAdminRow } from "../../types";
import { Button, Card, SectionDesc, SectionTitle } from "../ui";
import VagasPorTurma from "./VagasPorTurma";

function slugificar(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RelatoriosTab({
  turmas,
  preMatriculas,
  escopo = "Todas as unidades",
}: {
  turmas: TurmaAdminRow[];
  preMatriculas: PreMatriculaAdminRow[];
  /** Painel atual: "Todas as unidades", "SEICE CE" ou "SEICE JP". */
  escopo?: string;
}) {
  const [gerando, setGerando] = useState<string | null>(null);
  const [segmento, setSegmento] = useState<"todos" | Nivel>("todos");
  const [turmaId, setTurmaId] = useState<string>("todas");

  const niveisPresentes = NIVEIS.filter((n) => turmas.some((t) => t.nivel === n.key));

  // opções de turma: só as do segmento escolhido, e reseta se a turma
  // selecionada some da lista ao trocar de segmento
  const turmasDoSegmento = useMemo(
    () => ordenarTurmas(turmas.filter((t) => segmento === "todos" || t.nivel === segmento)),
    [turmas, segmento]
  );
  const turmaSelecionada = turmasDoSegmento.find((t) => t.id === turmaId);

  function mudarSegmento(novo: "todos" | Nivel) {
    setSegmento(novo);
    setTurmaId("todas");
  }

  // o que vai pra tela e pro PDF/Excel é sempre a mesma lista filtrada — sem
  // surpresa entre o que a secretaria vê e o que sai no arquivo
  const turmasFiltradas = turmaSelecionada
    ? [turmaSelecionada]
    : turmasDoSegmento;
  const turmasFiltradasIds = new Set(turmasFiltradas.map((t) => t.id));
  const preMatriculasFiltradas =
    segmento === "todos" && !turmaSelecionada
      ? preMatriculas
      : preMatriculas.filter((p) => turmasFiltradasIds.has(p.turma_id));

  const filtroAtivo = segmento !== "todos" || Boolean(turmaSelecionada);
  const filtroLabel = turmaSelecionada
    ? `${turmaSelecionada.serie} · Turma ${turmaSelecionada.codigo} · ${turnoLabel(turmaSelecionada.turno)}`
    : segmento !== "todos"
    ? NIVEIS.find((n) => n.key === segmento)?.label
    : null;

  const sufixo = [escopo, filtroLabel].filter((v): v is string => Boolean(v)).map(slugificar).join("-") || "todas";

  const resumo = resumoTurmas(turmasFiltradas);
  const totalOfertadas = resumo.reduce((acc, r) => acc + r.ofertadas, 0);
  const totalPreenchidas = resumo.reduce((acc, r) => acc + r.preenchidas, 0);
  const ocupacaoGeral = totalOfertadas > 0 ? Math.round((totalPreenchidas / totalOfertadas) * 100) : 0;

  async function comLoading(chave: string, fn: () => Promise<void> | void) {
    setGerando(chave);
    try {
      await fn();
    } finally {
      setGerando(null);
    }
  }

  // xlsx e jsPDF só são baixados quando alguém realmente clica em exportar —
  // mantém o painel leve para quem só está consultando os números.
  async function exportarCompletoExcel() {
    const { exportarRelatorioCompletoExcel } = await import("../../lib/excel");
    exportarRelatorioCompletoExcel(turmasFiltradas, preMatriculasFiltradas);
  }
  async function exportarCompletoPDF() {
    const { exportarRelatorioCompletoPDF } = await import("../../lib/pdf");
    await exportarRelatorioCompletoPDF(turmasFiltradas, preMatriculasFiltradas, escopo);
  }
  async function exportarIntencoesExcel() {
    const { exportarIntencoesExcel: fn } = await import("../../lib/excel");
    fn(preMatriculasFiltradas, sufixo);
  }
  async function exportarIntencoesPDF() {
    const { exportarIntencoesPDF: fn } = await import("../../lib/pdf");
    await fn(preMatriculasFiltradas, sufixo, escopo);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22.5px] font-semibold tracking-tight text-seice-ink">
          Relatórios e exportação
        </h2>
        <p className="text-[15px] text-seice-muted">
          Gere planilhas e PDFs com os dados de turmas e intenções de matrícula, prontos para compartilhar com a
          direção. Os arquivos saem com os dados de <strong className="text-seice-ink">{escopo}</strong>
          {filtroLabel && (
            <>
              {" "}
              filtrados por <strong className="text-seice-ink">{filtroLabel}</strong>
            </>
          )}
          .
        </p>
      </div>

      {/* filtro que vale pra prévia e pra exportação: segmento (nível) e,
          dentro dele, uma turma específica */}
      <Card className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-[15px] font-bold text-seice-ink">
          <Filter size={16} className="text-seice-gold" />
          Filtrar relatório
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-seice-muted">
              Segmento
            </span>
            <select
              value={segmento}
              onChange={(e) => mudarSegmento(e.target.value as "todos" | Nivel)}
              className="inset-surface w-full rounded-xl border border-seice-border-strong px-3.5 py-2.5 text-[14.5px] font-bold text-seice-ink outline-none focus:border-seice-gold"
            >
              <option value="todos">Todos os segmentos</option>
              {niveisPresentes.map((n) => (
                <option key={n.key} value={n.key}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-seice-muted">
              Turma
            </span>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="inset-surface w-full rounded-xl border border-seice-border-strong px-3.5 py-2.5 text-[14.5px] font-bold text-seice-ink outline-none focus:border-seice-gold"
            >
              <option value="todas">Todas as turmas{segmento !== "todos" ? " do segmento" : ""}</option>
              {turmasDoSegmento.map((t) => (
                <option key={t.id} value={t.id}>
                  {unidadeCurta(t.unidade_id)} · {t.serie} · Turma {t.codigo} · {turnoLabel(t.turno)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtroAtivo && (
          <button
            type="button"
            onClick={() => mudarSegmento("todos")}
            className="self-start text-[13.5px] font-semibold text-seice-gold underline-offset-2 hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <FileSpreadsheet size={19} />
            </span>
            <div>
              <SectionTitle>Relatório completo</SectionTitle>
              <SectionDesc>Resumo geral, turmas e intenções filtradas em um único arquivo.</SectionDesc>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              className="flex-1"
              disabled={gerando !== null}
              onClick={() => comLoading("xlsx-completo", exportarCompletoExcel)}
            >
              {gerando === "xlsx-completo" ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Excel<span className="hidden sm:inline"> (.xlsx)</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              disabled={gerando !== null}
              onClick={() => comLoading("pdf-completo", exportarCompletoPDF)}
            >
              {gerando === "pdf-completo" ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
              PDF
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="icon-tile-blue flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <FileText size={19} />
            </span>
            <div>
              <SectionTitle>Somente intenções de matrícula</SectionTitle>
              <SectionDesc>Lista dos responsáveis e alunos que enviaram intenção, já filtrada.</SectionDesc>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="dark"
              className="flex-1"
              disabled={gerando !== null}
              onClick={() => comLoading("xlsx-intencoes", exportarIntencoesExcel)}
            >
              {gerando === "xlsx-intencoes" ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Excel<span className="hidden sm:inline"> (.xlsx)</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              disabled={gerando !== null}
              onClick={() => comLoading("pdf-intencoes", exportarIntencoesPDF)}
            >
              {gerando === "pdf-intencoes" ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
              PDF
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5">
          <TrendingUp size={20} className="shrink-0 text-seice-gold" />
          <div>
            <SectionTitle>Vagas por turma</SectionTitle>
            <SectionDesc>
              {filtroLabel ? `Filtro ativo: ${filtroLabel}. ` : ""}
              No que está sendo exibido, {ocupacaoGeral}% das vagas ofertadas já foram preenchidas.
            </SectionDesc>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero label="Turmas" value={turmasFiltradas.length} />
          <Numero label="Vagas ofertadas" value={totalOfertadas} />
          <Numero label="Preenchidas" value={totalPreenchidas} />
          <Numero label="Livres" value={totalOfertadas - totalPreenchidas} destaque />
        </div>

        <VagasPorTurma turmas={turmasFiltradas} />
      </Card>
    </div>
  );
}

function Numero({ label, value, destaque = false }: { label: string; value: number; destaque?: boolean }) {
  return (
    <div className="inset-surface rounded-xl border border-seice-border px-4 py-3">
      <div className="text-[12.5px] font-bold uppercase tracking-wide text-seice-muted">{label}</div>
      <div
        className={`mt-1 text-[24px] font-extrabold leading-none tabular-nums ${
          destaque ? "text-seice-gold" : "text-seice-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

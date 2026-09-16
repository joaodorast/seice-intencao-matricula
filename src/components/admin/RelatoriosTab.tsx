import { useState } from "react";
import { FileSpreadsheet, FileText, LoaderCircle, TrendingUp } from "lucide-react";
import { resumoTurmas } from "../../lib/labels";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../../types";
import { Button, Card, SectionDesc, SectionTitle } from "../ui";
import VagasPorTurma from "./VagasPorTurma";

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
  const sufixo = escopo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const resumo = resumoTurmas(turmas);
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
    exportarRelatorioCompletoExcel(turmas, preMatriculas);
  }
  async function exportarCompletoPDF() {
    const { exportarRelatorioCompletoPDF } = await import("../../lib/pdf");
    await exportarRelatorioCompletoPDF(turmas, preMatriculas, escopo);
  }
  async function exportarIntencoesExcel() {
    const { exportarIntencoesExcel: fn } = await import("../../lib/excel");
    fn(preMatriculas, sufixo);
  }
  async function exportarIntencoesPDF() {
    const { exportarIntencoesPDF: fn } = await import("../../lib/pdf");
    await fn(preMatriculas, sufixo, escopo);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22.5px] font-semibold tracking-tight text-seice-ink">
          Relatórios e exportação
        </h2>
        <p className="text-[15px] text-seice-muted">
          Gere planilhas e PDFs com os dados de turmas e intenções de matrícula, prontos para compartilhar com a
          direção. Os arquivos saem com os dados de <strong className="text-seice-ink">{escopo}</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <FileSpreadsheet size={19} />
            </span>
            <div>
              <SectionTitle>Relatório completo</SectionTitle>
              <SectionDesc>Resumo geral, todas as turmas e todas as intenções em um único arquivo.</SectionDesc>
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
              <SectionDesc>Lista de todos os responsáveis e alunos que enviaram intenção.</SectionDesc>
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
              Situação de cada turma em {escopo}. No geral, {ocupacaoGeral}% das vagas ofertadas já foram
              preenchidas.
            </SectionDesc>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero label="Turmas" value={turmas.length} />
          <Numero label="Vagas ofertadas" value={totalOfertadas} />
          <Numero label="Preenchidas" value={totalPreenchidas} />
          <Numero label="Livres" value={totalOfertadas - totalPreenchidas} destaque />
        </div>

        <VagasPorTurma turmas={turmas} />
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

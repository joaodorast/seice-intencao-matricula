import { useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { resumoTurmas } from "../../lib/labels";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../../types";
import { Button, Card, SectionDesc, SectionTitle } from "../ui";
import ExportarRelatorioModal from "./ExportarRelatorioModal";
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
  const [modalAberto, setModalAberto] = useState(false);

  const resumo = resumoTurmas(turmas);
  const totalOfertadas = resumo.reduce((acc, r) => acc + r.ofertadas, 0);
  const totalPreenchidas = resumo.reduce((acc, r) => acc + r.preenchidas, 0);
  const ocupacaoGeral = totalOfertadas > 0 ? Math.round((totalPreenchidas / totalOfertadas) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-[22.5px] font-semibold tracking-tight text-seice-ink">
            Relatórios e exportação
          </h2>
          <p className="text-[15px] text-seice-muted">
            Dados de <strong className="text-seice-ink">{escopo}</strong> — escolha o recorte na exportação.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="shrink-0 !px-5">
          <Download size={17} /> Exportar relatório
        </Button>
      </div>

      <Card className="flex flex-col items-center gap-3 border-dashed !py-10 text-center">
        <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-2xl">
          <Download size={22} />
        </span>
        <div>
          <div className="text-[16.5px] font-bold text-seice-ink">Tudo em um único lugar</div>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-seice-muted">
            Turmas + intenções ou só a lista de intenções, em PDF ou Excel — para todas as turmas ou para uma
            turma específica.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setModalAberto(true)} className="mt-1">
          <Download size={16} /> Abrir exportação
        </Button>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5">
          <TrendingUp size={20} className="shrink-0 text-seice-gold" />
          <div>
            <SectionTitle>Vagas por turma</SectionTitle>
            <SectionDesc>
              Ocupação geral de {ocupacaoGeral}% ({totalPreenchidas} de {totalOfertadas} vagas ofertadas).
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

      <ExportarRelatorioModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        turmas={turmas}
        preMatriculas={preMatriculas}
        escopo={escopo}
      />
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

import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { NIVEL_LABELS } from "../../config";
import type { SerieGroup, Unidade } from "../../types";
import VagasGauge from "../VagasGauge";
import { BackBar, Card, SectionDesc, SectionEyebrow, SectionTitle } from "../ui";

export default function SerieStep({
  unidade,
  nivel,
  series,
  onBack,
  onPick,
}: {
  unidade: Unidade;
  nivel: string;
  series: SerieGroup[];
  onBack: () => void;
  onPick: (ordem: number) => void;
}) {
  return (
    <>
      <BackBar
        label={
          <>
            {unidade.nome} · <strong className="font-semibold text-seice-ink">{NIVEL_LABELS[nivel]}</strong>
          </>
        }
        onBack={onBack}
      />
      <Card>
        <SectionEyebrow>Passo 3 de 6</SectionEyebrow>
        <SectionTitle>Escolha a série</SectionTitle>
        <SectionDesc>Vagas disponíveis para o ano letivo de 2027.</SectionDesc>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {series.map((s, i) => {
            const totalVagas = s.turmas.reduce((acc, t) => acc + t.vagas_restantes, 0);
            const totalOfertadas = s.turmas.reduce((acc, t) => acc + t.vagas_planilha, 0);
            return (
              <motion.button
                key={s.ordem}
                type="button"
                onClick={() => onPick(s.ordem)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.985 }}
                className="raised-surface group flex flex-col gap-3 rounded-xl border border-seice-border p-4 text-left transition hover:-translate-y-0.5 hover:border-seice-border-strong hover:shadow-[0_14px_30px_-18px_rgba(20,22,27,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[19px] font-bold text-seice-ink">{s.serie}</div>
                  <ChevronRight
                    size={18}
                    className="text-seice-muted transition-transform group-hover:translate-x-0.5 group-hover:text-seice-ink"
                  />
                </div>
                <div className="text-[15px] text-seice-muted">
                  {s.turmas.length} turma{s.turmas.length > 1 ? "s" : ""} disponíve
                  {s.turmas.length > 1 ? "is" : "l"}
                </div>
                <VagasGauge vagasRestantes={totalVagas} vagasOfertadas={totalOfertadas} />
              </motion.button>
            );
          })}
        </div>
      </Card>
    </>
  );
}

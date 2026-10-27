import { ArrowLeft, Ban, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { NIVEL_LABELS } from "../../config";
import { rotuloVagasSerie, turmaEsgotada } from "../../lib/vagasVisiveis";
import type { SerieGroup, Unidade } from "../../types";
import { BackBar, Badge, Button, Card, SectionEyebrow, SectionTitle } from "../ui";

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {series.map((s, i) => {
            // série com todos os turnos esgotados: aparece, mas não abre
            const abertas = s.turmas.filter((t) => !turmaEsgotada(t)).length;
            const esgotada = abertas === 0;
            return (
              <motion.button
                key={s.ordem}
                type="button"
                disabled={esgotada}
                aria-disabled={esgotada}
                onClick={() => !esgotada && onPick(s.ordem)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={esgotada ? undefined : { scale: 0.985 }}
                className={`raised-surface group flex flex-col gap-3 rounded-xl border border-seice-border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15 sm:p-5 ${
                  esgotada
                    ? "cursor-not-allowed opacity-60"
                    : "hover:-translate-y-0.5 hover:border-seice-border-strong hover:shadow-[0_14px_30px_-18px_rgba(20,22,27,0.55)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[19px] font-bold text-seice-ink">{s.serie}</div>
                  {!esgotada && (
                    <ChevronRight
                      size={18}
                      className="text-seice-muted transition-transform group-hover:translate-x-0.5 group-hover:text-seice-ink"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[15px] text-seice-muted">
                  {!esgotada && (
                    <span>
                      {abertas} turma{abertas > 1 ? "s" : ""} disponíve
                      {abertas > 1 ? "is" : "l"}
                    </span>
                  )}
                  <Badge tone={esgotada ? "danger" : "gold"} icon={esgotada ? <Ban size={13} /> : undefined}>
                    {rotuloVagasSerie(s.turmas)}
                  </Badge>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* mesmo padrão do passo de turma: um Voltar aqui embaixo também,
            pra não depender só do botão lá no topo */}
        <Button variant="ghost" className="mt-4 w-full" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </Card>
    </>
  );
}

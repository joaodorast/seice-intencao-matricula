import { ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { NIVEL_LABELS } from "../../config";
import { serieComVagaVisivel, vagasVisiveisDaSerie } from "../../lib/vagasVisiveis";
import type { SerieGroup, Unidade } from "../../types";
import { BackBar, Badge, Button, Card, SectionDesc, SectionEyebrow, SectionTitle } from "../ui";

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
        <SectionDesc>Turmas sem vaga também aparecem — dá pra entrar na lista de espera.</SectionDesc>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {series.map((s, i) => {
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
                <div className="flex items-center gap-2 text-[15px] text-seice-muted">
                  <span>
                    {s.turmas.length} turma{s.turmas.length > 1 ? "s" : ""} disponíve
                    {s.turmas.length > 1 ? "is" : "l"}
                  </span>
                  <Badge tone="gold">
                    {(() => {
                      if (!serieComVagaVisivel(s.turmas)) return "Lista de espera";
                      const vagasVisiveis = vagasVisiveisDaSerie(s.turmas);
                      return vagasVisiveis > 0 ? `${vagasVisiveis} vaga${vagasVisiveis === 1 ? "" : "s"}` : "Lista de espera";
                    })()}
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

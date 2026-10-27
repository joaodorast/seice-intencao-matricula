import { useCallback, useState } from "react";
import { ArrowLeft, Ban, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { NIVEL_LABELS } from "../../config";
import TurmaEsgotadaModal from "../TurmaEsgotadaModal";
import { VAGAS_ESGOTADAS, rotuloVagasSerie, turmaEsgotada } from "../../lib/vagasVisiveis";
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
  // série esgotada clicada: o que mostrar no aviso (null = fechado)
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  return (
    <>
      <TurmaEsgotadaModal open={aviso !== null} descricao={aviso} onClose={fecharAviso} />
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
            // série com todos os turnos esgotados: aparece apagada e, no
            // clique, abre o aviso de vagas esgotadas em vez de seguir
            const abertas = s.turmas.filter((t) => !turmaEsgotada(t)).length;
            const esgotada = abertas === 0;
            return (
              <motion.button
                key={s.ordem}
                type="button"
                onClick={() => (esgotada ? setAviso(s.serie) : onPick(s.ordem))}
                initial={{ opacity: 0, y: 6 }}
                // opacidade aqui e não numa classe: o motion escreve opacity
                // inline e passaria por cima de um opacity-60
                animate={{ opacity: esgotada ? 0.6 : 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.985 }}
                className={`raised-surface group flex flex-col gap-3 rounded-xl border border-seice-border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15 sm:p-5 ${
                  esgotada
                    ? "hover:border-seice-danger/40"
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
                  {(() => {
                    // vermelho sempre que o texto é VAGAS ESGOTADAS — inclusive
                    // em série de lista de espera, que continua clicável
                    const rotulo = rotuloVagasSerie(s.turmas);
                    const semVaga = rotulo === VAGAS_ESGOTADAS;
                    return (
                      <Badge tone={semVaga ? "danger" : "gold"} icon={semVaga ? <Ban size={13} /> : undefined}>
                        {rotulo}
                      </Badge>
                    );
                  })()}
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

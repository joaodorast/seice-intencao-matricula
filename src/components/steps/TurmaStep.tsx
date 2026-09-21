import type { ReactNode } from "react";
import { ArrowLeft, Briefcase, HeartPulse, Laptop, Sunrise, Sunset } from "lucide-react";
import { motion } from "framer-motion";
import { turnoLabel } from "../../lib/format";
import type { SerieGroup, Unidade } from "../../types";
import { vagaVisivelParaResponsavel } from "../../lib/vagasVisiveis";
import { BackBar, Badge, Button, Card, SectionDesc, SectionEyebrow, SectionTitle } from "../ui";

const CURSO_ICON: Record<string, ReactNode> = {
  Informática: <Laptop size={13} />,
  Enfermagem: <HeartPulse size={13} />,
  Administração: <Briefcase size={13} />,
};

export default function TurmaStep({
  unidade,
  serieGroup,
  onBack,
  onPick,
}: {
  unidade: Unidade;
  serieGroup: SerieGroup;
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  const turmas = [...serieGroup.turmas].sort((a, b) =>
    a.turno === b.turno ? a.codigo.localeCompare(b.codigo) : a.turno.localeCompare(b.turno)
  );

  return (
    <>
      <BackBar
        label={
          <>
            {unidade.nome} · <strong className="font-semibold text-seice-ink">{serieGroup.serie}</strong>
          </>
        }
        onBack={onBack}
      />
      <Card>
        <SectionEyebrow>Passo 4 de 6</SectionEyebrow>
        <SectionTitle>Escolha a turma</SectionTitle>
        <SectionDesc>Turno e vagas de cada turma — sem vaga também dá pra entrar na lista de espera.</SectionDesc>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {turmas.map((t, i) => (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.985 }}
              className="raised-surface group flex flex-col gap-3.5 rounded-xl border border-seice-border p-4 text-left transition hover:-translate-y-0.5 hover:border-seice-border-strong hover:shadow-[0_14px_30px_-18px_rgba(20,22,27,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg icon-tile-soft transition group-hover:bg-seice-gold group-hover:text-seice-gold-ink">
                    {t.turno === "M" ? <Sunrise size={18} /> : <Sunset size={18} />}
                  </span>
                  <div>
                    <div className="text-[18px] font-bold text-seice-ink">{turnoLabel(t.turno)}</div>
                    <div className="text-[14.5px] text-seice-muted">Turma {t.codigo}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {t.curso && (
                    <Badge tone="neutral" icon={CURSO_ICON[t.curso]}>
                      {t.curso}
                    </Badge>
                  )}
                  {vagaVisivelParaResponsavel(t) ? (
                    <Badge tone="gold">
                      {t.vagas_restantes} vaga{t.vagas_restantes === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    t.vagas_restantes === 0 && <Badge tone="gold">Lista de espera</Badge>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* lista pode ficar comprida (muitas turmas) — um Voltar aqui embaixo
            evita ter que rolar até o topo de novo pra trocar de série */}
        <Button variant="ghost" className="mt-4 w-full" onClick={onBack}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </Card>
    </>
  );
}

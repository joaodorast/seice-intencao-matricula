import type { ReactNode } from "react";
import { Baby, Backpack, BookOpen, ChevronRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { NIVEIS } from "../../config";
import type { Nivel, TurmaDisponivel, Unidade } from "../../types";
import { BackBar, Badge, Button, Card, EmptyState, SectionDesc, SectionEyebrow, SectionTitle } from "../ui";

const NIVEL_ICONS: Record<Nivel, ReactNode> = {
  infantil: <Baby size={22} />,
  fund1: <BookOpen size={22} />,
  fund2: <Backpack size={22} />,
  medio: <GraduationCap size={22} />,
};

export default function NivelStep({
  unidade,
  turmas,
  onBack,
  onPick,
  onTrocarUnidade,
}: {
  unidade: Unidade;
  turmas: TurmaDisponivel[];
  onBack: () => void;
  onPick: (key: string) => void;
  onTrocarUnidade: () => void;
}) {
  const presentes = new Set(turmas.map((t) => t.nivel));
  const niveis = NIVEIS.filter((n) => presentes.has(n.key));
  const backLabel = (
    <>
      Unidade: <strong className="font-semibold text-seice-ink">{unidade.nome}</strong>
    </>
  );

  if (niveis.length === 0) {
    return (
      <>
        <BackBar label={backLabel} onBack={onBack} />
        <Card>
          <EmptyState emoji="📭">
            No momento não há turmas cadastradas em <strong>{unidade.nome}</strong> para 2027.
          </EmptyState>
          <Button variant="ghost" className="w-full" onClick={onTrocarUnidade}>
            Escolher outra unidade
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <BackBar label={backLabel} onBack={onBack} />
      <Card>
        <SectionEyebrow>Passo 2 de 6</SectionEyebrow>
        <SectionTitle>Qual o nível de ensino?</SectionTitle>
        <SectionDesc>Turmas sem vaga também aparecem — dá pra entrar na lista de espera.</SectionDesc>

        <div className="flex flex-col gap-3">
          {niveis.map((n, i) => {
            const totalVagas = turmas
              .filter((t) => t.nivel === n.key)
              .reduce((acc, t) => acc + t.vagas_restantes, 0);
            return (
              <motion.button
                key={n.key}
                type="button"
                onClick={() => onPick(n.key)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.99 }}
                className="raised-surface group flex items-center gap-4 rounded-xl border border-seice-border p-4 text-left transition hover:-translate-y-0.5 hover:border-seice-border-strong hover:shadow-[0_14px_30px_-18px_rgba(20,22,27,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl icon-tile-soft transition group-hover:icon-tile">
                  {NIVEL_ICONS[n.key]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[18px] font-bold text-seice-ink">{n.label}</div>
                  <div className="text-[15px] text-seice-muted">{n.desc}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={totalVagas > 0 ? "success" : "gold"}>
                    {totalVagas > 0 ? `${totalVagas} vaga${totalVagas === 1 ? "" : "s"}` : "Lista de espera"}
                  </Badge>
                  <ChevronRight
                    size={18}
                    className="text-seice-muted transition-transform group-hover:translate-x-0.5 group-hover:text-seice-ink"
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </Card>
    </>
  );
}

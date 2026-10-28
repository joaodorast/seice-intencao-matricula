import { useCallback, useState, type ReactNode } from "react";
import { ArrowLeft, Ban, Briefcase, HeartPulse, Laptop, Sunrise, Sunset } from "lucide-react";
import { motion } from "framer-motion";
import { turnoLabel } from "../../lib/format";
import TurmaEsgotadaModal from "../TurmaEsgotadaModal";
import type { SerieGroup, Unidade } from "../../types";
import { rotuloVagasTurma, semVagaParaResponsavel } from "../../lib/vagasVisiveis";
import { BackBar, Badge, Button, Card, SectionEyebrow, SectionTitle } from "../ui";

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
  // turma esgotada clicada: o que mostrar no aviso (null = fechado)
  const [aviso, setAviso] = useState<string | null>(null);
  const fecharAviso = useCallback(() => setAviso(null), []);

  return (
    <>
      <TurmaEsgotadaModal open={aviso !== null} descricao={aviso} onClose={fecharAviso} />
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

        {/* sem o código da turma (1001, 2003...): o responsável escolhe só o
            turno — várias turmas no mesmo turno já chegam aqui como um cartão
            só (agruparPorTurno). Turma esgotada aparece apagada e, no clique,
            abre o aviso de vagas esgotadas em vez de seguir. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {turmas.map((t, i) => {
            // VAGAS ESGOTADAS no selo = cartão apagado e aviso no clique
            // (também em turma de lista de espera do Jardim Primavera)
            const esgotada = semVagaParaResponsavel(t);
            return (
              <motion.button
                key={t.chave ?? t.id}
                type="button"
                onClick={() =>
                  esgotada
                    ? setAviso(`${t.serie} · ${turnoLabel(t.turno)}${t.curso ? ` · ${t.curso}` : ""}`)
                    : onPick(t.id)
                }
                initial={{ opacity: 0, y: 6 }}
                // a opacidade fica aqui (não numa classe): o motion escreve
                // opacity inline e passaria por cima de um opacity-60
                animate={{ opacity: esgotada ? 0.6 : 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.985 }}
                className={`raised-surface group flex flex-col gap-3.5 rounded-xl border border-seice-border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15 sm:p-5 ${
                  esgotada
                    ? "hover:border-seice-danger/40"
                    : "hover:-translate-y-0.5 hover:border-seice-border-strong hover:shadow-[0_14px_30px_-18px_rgba(20,22,27,0.55)]"
                }`}
              >
                {/* mesmo desenho em todo cartão: turno em cima, selos sempre
                    na linha de baixo — nada muda de lugar conforme o texto */}
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg icon-tile-soft transition ${
                      esgotada ? "" : "group-hover:bg-seice-gold group-hover:text-seice-gold-ink"
                    }`}
                  >
                    {t.turno === "M" ? <Sunrise size={18} /> : <Sunset size={18} />}
                  </span>
                  <div>
                    <div className="text-[18px] font-bold text-seice-ink">{turnoLabel(t.turno)}</div>
                    <div className="text-[14.5px] text-seice-muted">Turma {t.serie}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={esgotada ? "danger" : "gold"} icon={esgotada ? <Ban size={13} /> : undefined}>
                    {rotuloVagasTurma(t)}
                  </Badge>
                  {t.curso && (
                    <Badge tone="neutral" icon={CURSO_ICON[t.curso]}>
                      {t.curso}
                    </Badge>
                  )}
                </div>
              </motion.button>
            );
          })}
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

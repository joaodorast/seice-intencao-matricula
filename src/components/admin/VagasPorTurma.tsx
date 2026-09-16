import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, HeartPulse, Laptop, Sunrise, Sunset } from "lucide-react";
import { NIVEIS } from "../../config";
import { turnoLabel } from "../../lib/format";
import { ordenarTurmas, percentual, preenchidasDaTurma, unidadeNome } from "../../lib/labels";
import { TIER_COLORS, vagaStatus } from "../../lib/vagas";
import type { Nivel, TurmaAdminRow } from "../../types";
import { Badge } from "../ui";

const TIER_BADGE = { abertas: "success", poucas: "gold", ultimas: "danger" } as const;

const CURSO_ICON: Record<string, React.ReactNode> = {
  Informática: <Laptop size={13} />,
  Enfermagem: <HeartPulse size={13} />,
  Administração: <Briefcase size={13} />,
};

/**
 * Vagas turma a turma, agrupadas por unidade e nível. Cada linha mostra a
 * série, o código, o turno, quantas vagas foram ofertadas, quantas já foram
 * preenchidas e quantas ainda estão livres — é o jeito de ler a ocupação sem
 * precisar somar nada de cabeça.
 */
export default function VagasPorTurma({ turmas }: { turmas: TurmaAdminRow[] }) {
  const niveisPresentes = NIVEIS.filter((n) => turmas.some((t) => t.nivel === n.key));
  const [nivel, setNivel] = useState<"todos" | Nivel>("todos");

  const grupos = useMemo(() => {
    const visiveis = ordenarTurmas(turmas.filter((t) => nivel === "todos" || t.nivel === nivel));
    const porUnidade = new Map<string, Map<string, TurmaAdminRow[]>>();
    for (const t of visiveis) {
      if (!porUnidade.has(t.unidade_id)) porUnidade.set(t.unidade_id, new Map());
      const porNivel = porUnidade.get(t.unidade_id)!;
      if (!porNivel.has(t.nivel)) porNivel.set(t.nivel, []);
      porNivel.get(t.nivel)!.push(t);
    }
    return porUnidade;
  }, [turmas, nivel]);

  const variasUnidades = grupos.size > 1;

  if (turmas.length === 0) {
    return <p className="py-8 text-center text-[15px] text-seice-muted">Nenhuma turma cadastrada.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* filtro por nível */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        <FiltroChip ativo={nivel === "todos"} onClick={() => setNivel("todos")}>
          Todos os níveis
        </FiltroChip>
        {niveisPresentes.map((n) => (
          <FiltroChip key={n.key} ativo={nivel === n.key} onClick={() => setNivel(n.key)}>
            {n.label}
          </FiltroChip>
        ))}
      </div>

      {[...grupos.entries()].map(([unidadeSlug, porNivel]) => (
        <section key={unidadeSlug} className="flex flex-col gap-4">
          {variasUnidades && (
            <h3 className="font-display border-b border-seice-border pb-2 text-[20px] font-semibold text-seice-ink">
              {unidadeNome(unidadeSlug)}
            </h3>
          )}

          {[...porNivel.entries()].map(([nivelKey, lista]) => {
            const ofertadas = lista.reduce((acc, t) => acc + t.vagas_planilha, 0);
            const livres = lista.reduce((acc, t) => acc + t.vagas_restantes, 0);
            return (
              <div key={nivelKey} className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="text-[16px] font-bold text-seice-ink">
                    {NIVEIS.find((n) => n.key === nivelKey)?.label ?? nivelKey}
                  </h4>
                  <span className="text-[14px] text-seice-muted">
                    {lista.length} turma{lista.length === 1 ? "" : "s"} ·{" "}
                    <strong className="font-semibold text-seice-gold">{livres}</strong> de {ofertadas} vagas livres
                  </span>
                </div>

                <ul className="flex flex-col gap-2">
                  {lista.map((t) => (
                    <LinhaTurma key={t.id} turma={t} />
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function LinhaTurma({ turma: t }: { turma: TurmaAdminRow }) {
  const preenchidas = preenchidasDaTurma(t);
  const pct = percentual(preenchidas, t.vagas_planilha);
  const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
  const semOferta = t.vagas_planilha === 0;

  return (
    <li className="raised-surface grid gap-3 rounded-xl border border-seice-border p-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-4">
      {/* identificação da turma */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="icon-tile-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          {t.turno === "M" ? <Sunrise size={18} /> : <Sunset size={18} />}
        </span>
        <div className="min-w-0">
          <div className="text-[16px] font-bold leading-tight text-seice-ink">
            {t.serie} · Turma {t.codigo}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-seice-muted">
            <span>{turnoLabel(t.turno)}</span>
            {t.curso && (
              <span className="inline-flex items-center gap-1 text-seice-soft">
                {CURSO_ICON[t.curso]} {t.curso}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* barra de ocupação */}
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[13.5px]">
          <span className="text-seice-muted">
            {semOferta ? "Nenhuma vaga ofertada" : `${preenchidas} de ${t.vagas_planilha} preenchidas`}
          </span>
          {!semOferta && <span className="font-semibold tabular-nums text-seice-soft">{pct}%</span>}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-seice-chip">
          <motion.div
            className={`h-full rounded-full ${TIER_COLORS[status.tier].bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${semOferta ? 0 : pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* vagas livres + situação */}
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-left sm:text-right">
          <div className="text-[22px] font-extrabold leading-none tabular-nums text-seice-gold">{t.vagas_restantes}</div>
          <div className="text-[12.5px] font-semibold uppercase tracking-wide text-seice-muted">
            livre{t.vagas_restantes === 1 ? "" : "s"}
          </div>
        </div>
        <Badge tone={TIER_BADGE[status.tier]}>{semOferta ? "Sem oferta" : status.label}</Badge>
      </div>
    </li>
  );
}

function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-[14px] font-bold transition ${
        ativo
          ? "border-seice-gold bg-seice-gold text-seice-gold-ink"
          : "raised-surface border-seice-border-strong text-seice-soft hover:border-seice-gold/50 hover:text-seice-ink"
      }`}
    >
      {children}
    </button>
  );
}

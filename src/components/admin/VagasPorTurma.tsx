import { type ReactNode, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, HeartPulse, Laptop } from "lucide-react";
import { NIVEIS } from "../../config";
import { turnoLabel } from "../../lib/format";
import { ordenarTurmas, percentual, preenchidasDaTurma, unidadeNome } from "../../lib/labels";
import { TIER_COLORS, vagaStatus } from "../../lib/vagas";
import type { Nivel, TurmaAdminRow } from "../../types";
import { Badge, StatMini } from "../ui";

const TIER_BADGE = { abertas: "success", poucas: "gold", ultimas: "danger" } as const;

const CURSO_ICON: Record<string, ReactNode> = {
  Informática: <Laptop size={13} />,
  Enfermagem: <HeartPulse size={13} />,
  Administração: <Briefcase size={13} />,
};

/**
 * Vagas turma a turma: uma tabela de verdade (com cabeçalho) em telas
 * grandes e cartões no celular, agrupadas por unidade e nível. Turmas sem
 * nenhuma vaga ofertada ao site (histórico da planilha) ficam esmaecidas ao
 * final de cada grupo — não é um problema, só não está à venda online — e dá
 * pra escondê-las de vez com o filtro.
 */
export default function VagasPorTurma({ turmas }: { turmas: TurmaAdminRow[] }) {
  const niveisPresentes = NIVEIS.filter((n) => turmas.some((t) => t.nivel === n.key));
  const [nivel, setNivel] = useState<"todos" | Nivel>("todos");
  const [somenteComOferta, setSomenteComOferta] = useState(false);

  const grupos = useMemo(() => {
    const visiveis = ordenarTurmas(
      turmas.filter((t) => (nivel === "todos" || t.nivel === nivel) && (!somenteComOferta || t.vagas_planilha > 0))
    );
    const porUnidade = new Map<string, Map<string, TurmaAdminRow[]>>();
    for (const t of visiveis) {
      if (!porUnidade.has(t.unidade_id)) porUnidade.set(t.unidade_id, new Map());
      const porNivel = porUnidade.get(t.unidade_id)!;
      if (!porNivel.has(t.nivel)) porNivel.set(t.nivel, []);
      porNivel.get(t.nivel)!.push(t);
    }
    // dentro de cada nível, turmas com oferta primeiro — o que não está à
    // venda fica ao final, sem sumir da lista
    for (const porNivel of porUnidade.values()) {
      for (const [chave, lista] of porNivel) {
        porNivel.set(
          chave,
          [...lista].sort((a, b) => Number(b.vagas_planilha > 0) - Number(a.vagas_planilha > 0))
        );
      }
    }
    return porUnidade;
  }, [turmas, nivel, somenteComOferta]);

  const variasUnidades = grupos.size > 1;

  if (turmas.length === 0) {
    return <p className="py-8 text-center text-[15px] text-seice-muted">Nenhuma turma cadastrada.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* filtros: nível de ensino + esconder turmas sem oferta */}
      <div className="flex flex-wrap items-center gap-2">
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
        <label className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-2 text-[14px] font-semibold text-seice-soft">
          <input
            type="checkbox"
            checked={somenteComOferta}
            onChange={(e) => setSomenteComOferta(e.target.checked)}
            className="h-4 w-4 accent-seice-gold"
          />
          Só turmas com vaga ofertada
        </label>
      </div>

      {[...grupos.entries()].map(([unidadeSlug, porNivel]) => (
        <section key={unidadeSlug} className="flex flex-col gap-5">
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

                {/* celular e tablet: cartões */}
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:hidden">
                  {lista.map((t) => (
                    <CartaoTurma key={t.id} turma={t} />
                  ))}
                </div>

                {/* tela grande: tabela com cabeçalho */}
                <div className="card-surface hidden overflow-x-auto rounded-2xl border border-seice-border lg:block">
                  <table className="w-full min-w-190 border-collapse text-[15px]">
                    <thead>
                      <tr>
                        {["Turma", "Turno", "Ofertadas", "Preenchidas", "Livres", "Ocupação", "Situação"].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`whitespace-nowrap border-b border-seice-border bg-seice-panel px-3.5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-seice-muted ${
                                i >= 2 ? "text-right" : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((t) => (
                        <LinhaTurma key={t.id} turma={t} />
                      ))}
                    </tbody>
                  </table>
                </div>
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
    <tr className={`transition-colors hover:bg-seice-chip/40 ${semOferta ? "opacity-50" : ""}`}>
      <td className="border-b border-seice-border px-3.5 py-3 align-top">
        <div className="font-bold text-seice-ink">
          {t.serie} · Turma {t.codigo}
        </div>
        {t.curso && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[13.5px] text-seice-muted">
            {CURSO_ICON[t.curso]} {t.curso}
          </div>
        )}
      </td>
      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">{turnoLabel(t.turno)}</td>
      <td className="border-b border-seice-border px-3.5 py-3 text-right align-top tabular-nums text-seice-soft">
        {t.vagas_planilha}
      </td>
      <td className="border-b border-seice-border px-3.5 py-3 text-right align-top tabular-nums text-seice-soft">
        {preenchidas}
      </td>
      <td className="border-b border-seice-border px-3.5 py-3 text-right align-top text-[16px] font-extrabold tabular-nums text-seice-gold">
        {t.vagas_restantes}
      </td>
      <td className="border-b border-seice-border px-3.5 py-3 align-top">
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-seice-chip">
            <motion.div
              className={`h-full rounded-full ${TIER_COLORS[status.tier].bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${semOferta ? 0 : pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-seice-muted">
            {semOferta ? "—" : `${pct}%`}
          </span>
        </div>
      </td>
      <td className="border-b border-seice-border px-3.5 py-3 text-right align-top">
        <Badge tone={semOferta ? "neutral" : TIER_BADGE[status.tier]}>{semOferta ? "Sem oferta" : status.label}</Badge>
      </td>
    </tr>
  );
}

function CartaoTurma({ turma: t }: { turma: TurmaAdminRow }) {
  const preenchidas = preenchidasDaTurma(t);
  const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
  const semOferta = t.vagas_planilha === 0;

  return (
    <article className={`raised-surface rounded-xl border border-seice-border p-3.5 ${semOferta ? "opacity-55" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15.5px] font-bold leading-tight text-seice-ink">
            {t.serie} · Turma {t.codigo}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-seice-muted">
            <span>{turnoLabel(t.turno)}</span>
            {t.curso && (
              <span className="inline-flex items-center gap-1 text-seice-soft">
                {CURSO_ICON[t.curso]} {t.curso}
              </span>
            )}
          </div>
        </div>
        <Badge tone={semOferta ? "neutral" : TIER_BADGE[status.tier]}>{semOferta ? "Sem oferta" : status.label}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatMini label="Ofertadas" value={t.vagas_planilha} />
        <StatMini label="Preenchidas" value={preenchidas} />
        <StatMini label="Livres" value={t.vagas_restantes} destaque={!semOferta} />
      </div>
    </article>
  );
}

function FiltroChip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
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

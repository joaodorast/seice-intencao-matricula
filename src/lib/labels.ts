import { NIVEIS, UNIDADES } from "../config";
import { turnoLabel } from "./format";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow } from "../types";

export const STATUS_ORDER: StatusPreMatricula[] = ["pendente", "contatado", "matriculado", "cancelado"];

export const STATUS_INFO: Record<StatusPreMatricula, { label: string; badge: string }> = {
  pendente: {
    label: "Pendente",
    badge: "bg-seice-chip text-seice-soft",
  },
  contatado: {
    label: "Contatado",
    badge: "bg-seice-info-soft text-seice-info",
  },
  matriculado: {
    label: "Matriculado",
    badge: "bg-seice-success-soft text-seice-success",
  },
  cancelado: {
    label: "Cancelado",
    badge: "bg-seice-danger-soft text-seice-danger",
  },
};

/**
 * Texto curto pra mostrar no cabeçalho do PDF/Excel qual status foi
 * escolhido no filtro ("Status: Contatado", "Status: Pendente, Contatado"),
 * pra quem abre o relatório já saber o que está vendo sem precisar
 * adivinhar. Quando os 4 estão marcados (ou nenhum foi passado), não filtrou
 * nada de verdade, então não mostra nada.
 */
export function descricaoFiltroStatus(selecionados: StatusPreMatricula[]): string {
  if (selecionados.length === 0 || selecionados.length >= STATUS_ORDER.length) return "";
  return `Status: ${selecionados.map((s) => STATUS_INFO[s]?.label ?? s).join(", ")}`;
}

export function unidadeNome(slug: string): string {
  return UNIDADES.find((u) => u.slug === slug)?.nome ?? slug;
}

/** Nome curto usado nos painéis por unidade e nos relatórios. */
const UNIDADE_CURTA: Record<string, string> = {
  "campos-eliseos": "SEICE CE",
  "jardim-primavera": "SEICE JP",
};

export function unidadeCurta(slug: string): string {
  return UNIDADE_CURTA[slug] ?? unidadeNome(slug);
}

const ORDEM_UNIDADE: Record<string, number> = Object.fromEntries(UNIDADES.map((u, i) => [u.slug, i]));
const ORDEM_NIVEL: Record<string, number> = Object.fromEntries(NIVEIS.map((n, i) => [n.key, i]));

/** Ordem de leitura das turmas: unidade → nível → série → turno → código. */
export function ordenarTurmas<
  T extends { unidade_id: string; nivel: string; ordem: number; turno: string; codigo: string },
>(turmas: T[]): T[] {
  return [...turmas].sort(
    (a, b) =>
      (ORDEM_UNIDADE[a.unidade_id] ?? 99) - (ORDEM_UNIDADE[b.unidade_id] ?? 99) ||
      (ORDEM_NIVEL[a.nivel] ?? 99) - (ORDEM_NIVEL[b.nivel] ?? 99) ||
      a.ordem - b.ordem ||
      a.turno.localeCompare(b.turno) ||
      a.codigo.localeCompare(b.codigo)
  );
}

/** Vagas preenchidas de uma turma = intenções recebidas que não foram canceladas. */
export function preenchidasDaTurma(t: TurmaAdminRow): number {
  return Math.max(t.vagas_planilha - t.vagas_restantes, 0);
}

export function descricaoTurma(t: PreMatriculaAdminRow["turmas"]): string {
  if (!t) return "—";
  return `${t.serie} · Turma ${t.codigo} · ${turnoLabel(t.turno)}${t.curso ? ` · ${t.curso}` : ""}`;
}

export function percentual(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

export interface LinhaResumo {
  unidade: string;
  nivel: string;
  turmas: number;
  ofertadas: number;
  preenchidas: number;
  restantes: number;
  pct: number;
}

/** Vagas ofertadas x preenchidas por unidade e nível (base dos relatórios). */
export function resumoTurmas(turmas: TurmaAdminRow[]): LinhaResumo[] {
  const linhas: LinhaResumo[] = [];
  for (const u of UNIDADES) {
    for (const n of NIVEIS) {
      const grupo = turmas.filter((t) => t.unidade_id === u.slug && t.nivel === n.key);
      if (grupo.length === 0) continue;
      const ofertadas = grupo.reduce((acc, t) => acc + t.vagas_planilha, 0);
      const restantes = grupo.reduce((acc, t) => acc + t.vagas_restantes, 0);
      linhas.push({
        unidade: u.nome,
        nivel: n.label,
        turmas: grupo.length,
        ofertadas,
        preenchidas: ofertadas - restantes,
        restantes,
        pct: percentual(ofertadas - restantes, ofertadas),
      });
    }
  }
  return linhas;
}

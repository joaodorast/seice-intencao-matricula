export type VagaTier = "abertas" | "poucas" | "ultimas";

export interface VagaStatus {
  tier: VagaTier;
  label: string;
  pct: number; // 0-100, percentual de vagas restantes sobre as vagas ofertadas
}

/**
 * O rótulo leva em conta o número real de vagas da planilha, não só o
 * percentual — com poucas vagas ofertadas, 100% livre ainda são "3 vagas",
 * e dizer "muitas vagas" seria enganoso.
 */
export function vagaStatus(vagasRestantes: number, vagasOfertadas: number): VagaStatus {
  const pct = vagasOfertadas > 0 ? Math.round((vagasRestantes / vagasOfertadas) * 100) : 0;

  if (vagasRestantes <= 0) return { tier: "ultimas", label: "Sem vagas", pct: 0 };
  if (vagasRestantes <= 2) {
    return { tier: "ultimas", label: vagasRestantes === 1 ? "Última vaga!" : "Últimas vagas!", pct };
  }
  if (vagasRestantes <= 5 || pct <= 30) return { tier: "poucas", label: "Vagas limitadas", pct };
  return { tier: "abertas", label: "Vagas abertas", pct };
}

export const TIER_COLORS: Record<VagaTier, { bar: string; text: string }> = {
  abertas: { bar: "bg-seice-success", text: "text-seice-success" },
  poucas: { bar: "bg-seice-gold", text: "text-seice-gold" },
  ultimas: { bar: "bg-seice-danger", text: "text-seice-danger" },
};

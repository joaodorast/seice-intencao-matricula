import { motion } from "framer-motion";
import { TIER_COLORS, vagaStatus } from "../lib/vagas";

export default function VagasGauge({
  vagasRestantes,
  vagasOfertadas,
}: {
  vagasRestantes: number;
  vagasOfertadas: number;
}) {
  const status = vagaStatus(vagasRestantes, vagasOfertadas);
  const colors = TIER_COLORS[status.tier];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[14px] font-bold ${colors.text}`}>{status.label}</span>
        <span className="text-[14px] font-semibold text-seice-muted">
          {vagasRestantes} de {vagasOfertadas} vagas
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-seice-chip">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(status.pct, 4)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

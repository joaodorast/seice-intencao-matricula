import type { ReactNode } from "react";

export default function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "black",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "black" | "success" | "info" | "danger";
}) {
  const accents: Record<string, string> = {
    black: "icon-tile",
    success: "bg-seice-success-soft text-seice-success ring-1 ring-seice-success/25",
    info: "bg-seice-info-soft text-seice-info ring-1 ring-seice-info/25",
    danger: "bg-seice-danger-soft text-seice-danger ring-1 ring-seice-danger/25",
  };
  return (
    <div className="card-surface flex flex-col items-start gap-3 rounded-2xl border border-seice-border p-4 sm:flex-row sm:items-center sm:gap-3.5 sm:p-4.5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-bold uppercase leading-tight tracking-wide text-seice-muted sm:text-[13px]">
          {label}
        </div>
        <div className="text-[24.5px] font-extrabold leading-tight tabular-nums text-seice-ink">{value}</div>
        {sub && <div className="text-[13.5px] text-seice-muted">{sub}</div>}
      </div>
    </div>
  );
}

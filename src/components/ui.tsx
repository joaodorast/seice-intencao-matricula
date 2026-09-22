import { ArrowLeft } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`card-surface rounded-2xl border border-seice-border p-5 sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-seice-border bg-seice-chip px-3.5 py-1.5 text-[15px] font-semibold text-seice-ink sm:text-[15.5px]">
      <span className="h-2 w-2 rounded-full bg-seice-gold ring-1 ring-seice-gold-ink/40" />
      {children}
    </div>
  );
}

export function SectionTitle({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <h2
      className={`font-display mb-1.5 text-[26px] font-semibold leading-tight tracking-tight text-seice-ink sm:text-[29px] ${
        center ? "text-center" : ""
      }`}
    >
      {children}
    </h2>
  );
}

export function SectionDesc({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <p className={`mb-6 text-[17px] leading-relaxed text-seice-muted ${center ? "text-center" : ""}`}>
      {children}
    </p>
  );
}

export function Badge({
  children,
  tone = "neutral",
  icon,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "dark" | "success" | "danger" | "info" | "gold";
  icon?: ReactNode;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-seice-chip text-seice-soft ring-1 ring-seice-border",
    dark: "bg-seice-deep text-white",
    success: "bg-seice-success-soft text-seice-success ring-1 ring-seice-success/20",
    danger: "bg-seice-danger-soft text-seice-danger ring-1 ring-seice-danger/20",
    info: "bg-seice-info-soft text-seice-info ring-1 ring-seice-info/20",
    gold: "bg-seice-gold text-seice-gold-ink",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13.5px] font-semibold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "ghost" | "whatsapp";
}) {
  const variants: Record<string, string> = {
    primary: "icon-tile hover:brightness-125 disabled:shadow-none",
    dark: "bg-seice-chip text-white hover:bg-seice-deep",
    ghost:
      "raised-surface border border-seice-border-strong text-seice-ink hover:border-seice-gold/30 hover:bg-seice-chip",
    whatsapp: "bg-seice-success text-white hover:brightness-110",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[17px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function BackBar({ label, onBack }: { label: ReactNode; onBack?: () => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="text-[15.5px] font-medium text-seice-muted">{label}</div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="raised-surface inline-flex items-center gap-1.5 rounded-full border border-seice-border-strong px-4 py-2 text-[15px] font-semibold text-seice-ink transition hover:border-seice-gold/30 hover:bg-seice-chip"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center text-seice-muted">
      <div className="mb-3 text-[42.5px]">{emoji}</div>
      <p className="text-[17px]">{children}</p>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="h-8 w-8 animate-spin-slow rounded-full border-[3px] border-seice-border-strong border-t-seice-gold" />
      {label && <div className="text-[15.5px] font-medium text-seice-muted">{label}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-seice-chip ${className}`} />;
}

/** Numerozinho num bloco rebaixado — usado nos cartões do painel (celular/tablet). */
export function StatMini({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="inset-surface rounded-xl px-3 py-2.5 text-center">
      <div className={`text-[21px] font-extrabold tabular-nums ${destaque ? "text-seice-gold" : "text-seice-ink"}`}>
        {value}
      </div>
      <div className="text-[13px] font-semibold uppercase tracking-wide text-seice-muted">{label}</div>
    </div>
  );
}

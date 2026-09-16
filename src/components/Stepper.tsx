import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Passo } from "../types";

const STEPS: { key: Passo; label: string }[] = [
  { key: "unidade", label: "Unidade" },
  { key: "nivel", label: "Nível" },
  { key: "serie", label: "Série" },
  { key: "turma", label: "Turma" },
  { key: "dados", label: "Dados" },
  { key: "confirmacao", label: "Envio" },
];

export default function Stepper({ atual }: { atual: Passo }) {
  const idx = STEPS.findIndex((s) => s.key === atual);
  const progressPct = (idx / (STEPS.length - 1)) * 100;

  return (
    <nav aria-label="Etapas da intenção de matrícula" className="mb-6">
      <div className="relative">
        {/* trilho do centro do 1º ao centro do último círculo (meia coluna de cada lado) */}
        <div className="absolute left-[8.333%] right-[8.333%] top-4 h-[3px] rounded-full bg-seice-border-strong">
          <motion.div
            className="h-full rounded-full bg-seice-gold"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <ol className="relative grid grid-cols-6">
          {STEPS.map((s, i) => {
            const isDone = i < idx;
            const isActive = i === idx;
            return (
              <li
                key={s.key}
                aria-current={isActive ? "step" : undefined}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full text-[15.5px] font-bold tabular-nums transition-colors",
                    isDone
                      ? "icon-tile"
                      : isActive
                      ? "bg-seice-deep-soft text-seice-gold ring-2 ring-seice-gold ring-offset-2 ring-offset-seice-bg"
                      : "raised-surface border border-seice-border-strong text-seice-muted",
                  ].join(" ")}
                >
                  {isDone ? <Check size={16} strokeWidth={3} /> : i + 1}
                </div>
                <span
                  className={`break-words px-0.5 text-center text-[11px] font-semibold leading-tight min-[380px]:text-[12.5px] sm:text-[15px] ${
                    isActive ? "text-seice-ink" : isDone ? "text-seice-soft" : "text-seice-muted"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

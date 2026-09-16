import { Ban } from "lucide-react";
import { STATUS_INFO, STATUS_ORDER } from "../../lib/labels";
import type { StatusPreMatricula } from "../../types";

/** Select colorido por status + botão rápido de cancelar, usado na tabela de
 * intenções e no resumo do dashboard — mudar o status ou cancelar é sempre
 * a mesma ação em um clique, em qualquer lugar do painel. */
export default function StatusControl({
  status,
  onChange,
}: {
  status: StatusPreMatricula;
  onChange: (status: StatusPreMatricula) => void;
}) {
  const info = STATUS_INFO[status];
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as StatusPreMatricula)}
        className={`rounded-lg border-0 px-2.5 py-2 text-[14.5px] font-bold outline-none ring-1 ring-inset ring-white/10 transition focus:ring-2 focus:ring-seice-gold/50 [&>option]:bg-seice-surface [&>option]:text-seice-ink ${info.badge}`}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_INFO[s].label}
          </option>
        ))}
      </select>
      {status !== "cancelado" && (
        <button
          type="button"
          title="Cancelar esta intenção"
          onClick={() => {
            if (window.confirm("Cancelar esta intenção de matrícula? A vaga volta a ficar disponível."))
              onChange("cancelado");
          }}
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg text-seice-muted transition hover:bg-seice-danger-soft hover:text-seice-danger"
        >
          <Ban size={14} />
        </button>
      )}
    </div>
  );
}

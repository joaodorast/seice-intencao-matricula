import { ArrowRight, Ban, Check, RotateCcw } from "lucide-react";
import { STATUS_INFO } from "../../lib/labels";
import type { StatusPreMatricula } from "../../types";

/** Depois de qual status vem qual — o caminho normal até "matriculado". */
const PROXIMO: Partial<Record<StatusPreMatricula, StatusPreMatricula>> = {
  pendente: "contatado",
  contatado: "matriculado",
};

const PROXIMO_ESTILO: Record<string, string> = {
  contatado: "bg-seice-info text-white hover:brightness-110",
  matriculado: "bg-seice-success text-white hover:brightness-110",
};

/**
 * Controle explícito de status: um botão "→ Contatado / → Matriculado" pra
 * avançar a intenção passo a passo, e um botão de cancelar sempre à mão — é
 * a resposta direta a "recebi a intenção, e depois?". Um select simples
 * escondido no meio da linha passava despercebido; aqui a ação de progredir
 * é um botão com rótulo, não uma caixinha de escolher.
 */
export default function StatusControl({
  status,
  onChange,
}: {
  status: StatusPreMatricula;
  onChange: (status: StatusPreMatricula) => void;
}) {
  const info = STATUS_INFO[status];
  const proximo = PROXIMO[status];

  // matriculado ou cancelado: fim de linha — mostra o selo e deixa reabrir
  // caso tenha sido engano, sem travar a pessoa numa decisão definitiva
  if (!proximo && status !== "pendente") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-bold ${info.badge}`}
        >
          {status === "matriculado" ? <Check size={14} strokeWidth={3} /> : <Ban size={14} />}
          {info.label}
        </span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Reabrir esta intenção? Ela volta para "Pendente".`)) onChange("pendente");
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-seice-muted transition hover:bg-seice-chip hover:text-seice-ink"
        >
          <RotateCcw size={12} /> Reabrir
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[13.5px] font-bold ${info.badge}`}>
        {info.label}
      </span>
      {proximo && (
        <button
          type="button"
          onClick={() => onChange(proximo)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-bold transition ${PROXIMO_ESTILO[proximo]}`}
        >
          {STATUS_INFO[proximo].label} <ArrowRight size={13} />
        </button>
      )}
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
    </div>
  );
}

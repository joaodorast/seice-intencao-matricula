import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { STATUS_INFO } from "../../lib/labels";
import type { StatusPreMatricula } from "../../types";
import ConfirmModal from "./ConfirmModal";

const OPCOES: StatusPreMatricula[] = ["pendente", "contatado"];

/** Etapa ativa sempre em dourado — o mesmo destaque usado nos outros
 *  seletores do painel (unidade, aba), pra manter a mesma linguagem visual. */
const ESTILO_ATIVO = "bg-seice-gold text-seice-gold-ink";

/**
 * Controle explícito de status: as duas opções (Pendente/Contatado) sempre
 * visíveis lado a lado, e a pessoa clica em qualquer uma pra jogar a
 * intenção direto pra lá — não precisa avançar um passo de cada vez.
 * "Matriculado" não é mais uma opção clicável aqui a pedido da direção — só
 * Pendente/Contatado (mais Cancelar). Cancelar e reabrir passam por um
 * modal de confirmação próprio, não pelo confirm() nativo do navegador (que
 * aparece com a cara do "localhost diz").
 */
export default function StatusControl({
  status,
  onChange,
}: {
  status: StatusPreMatricula;
  onChange: (status: StatusPreMatricula) => void;
}) {
  const [confirmando, setConfirmando] = useState<"cancelar" | "reabrir" | null>(null);

  // cancelada: fim de linha — mostra o selo e deixa reabrir caso tenha sido
  // engano, sem misturar com as três opções normais
  if (status === "cancelado") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-bold ${STATUS_INFO.cancelado.badge}`}
          >
            <Ban size={14} />
            {STATUS_INFO.cancelado.label}
          </span>
          <button
            type="button"
            onClick={() => setConfirmando("reabrir")}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-seice-muted transition hover:bg-seice-chip hover:text-seice-ink"
          >
            <RotateCcw size={12} /> Reabrir
          </button>
        </div>

        <ConfirmModal
          open={confirmando === "reabrir"}
          onClose={() => setConfirmando(null)}
          title="Reabrir intenção"
          message={`Reabrir esta intenção de matrícula? Ela volta para o status "Pendente".`}
          confirmLabel="Reabrir intenção"
          onConfirm={() => onChange("pendente")}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-[15.5px] text-seice-soft">
          Responsável está em:{" "}
          <strong className="text-[16.5px] font-extrabold text-seice-gold">{STATUS_INFO[status].label}</strong>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl bg-seice-deep-soft p-1">
            {OPCOES.map((opcao) => {
              const ativo = opcao === status;
              return (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => !ativo && onChange(opcao)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold transition ${
                    ativo ? ESTILO_ATIVO : "text-seice-muted hover:text-seice-ink"
                  }`}
                >
                  {STATUS_INFO[opcao].label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setConfirmando("cancelar")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-seice-border-strong px-3 py-1.5 text-[12.5px] font-bold text-seice-muted transition hover:border-seice-danger/40 hover:bg-seice-danger-soft hover:text-seice-danger"
          >
            <Ban size={14} /> Cancelar
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmando === "cancelar"}
        onClose={() => setConfirmando(null)}
        title="Cancelar intenção"
        message="Cancelar esta intenção de matrícula? A vaga volta a ficar disponível para outras famílias."
        confirmLabel="Cancelar intenção"
        onConfirm={() => onChange("cancelado")}
      />
    </>
  );
}

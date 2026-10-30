import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { STATUS_INFO } from "../../lib/labels";
import type { StatusPreMatricula } from "../../types";
import ConfirmModal from "./ConfirmModal";

const OPCOES: StatusPreMatricula[] = ["pendente", "contatado", "agendado", "matriculado"];

/** Cada etapa com a sua cor, as mesmas do relatório em PDF — dá pra ver de
 *  longe em que pé está cada família: Pendente em dourado (o destaque padrão
 *  do painel), Contatado em azul, Agendado em laranja e Matriculado em verde. */
function estiloAtivo(status: StatusPreMatricula) {
  if (status === "matriculado") return "bg-seice-success text-seice-deep";
  if (status === "agendado") return "bg-seice-orange text-seice-deep";
  if (status === "contatado") return "bg-seice-azul text-seice-deep";
  return "bg-seice-gold text-seice-gold-ink";
}

/** Cor do nome do status em "Responsável está em: ...". */
function corTextoStatus(status: StatusPreMatricula) {
  if (status === "matriculado") return "text-seice-success";
  if (status === "agendado") return "text-seice-orange";
  if (status === "contatado") return "text-seice-azul";
  return "text-seice-gold";
}

/**
 * Controle explícito de status: as quatro opções (Pendente/Contatado/
 * Agendado/Matriculado) sempre visíveis lado a lado, e a pessoa clica em qualquer uma
 * pra jogar a intenção direto pra lá — não precisa avançar um passo de cada
 * vez. Cancelar e reabrir passam por um modal de confirmação próprio, não
 * pelo confirm() nativo do navegador (que aparece com a cara do "localhost
 * diz").
 */
export default function StatusControl({
  status,
  onChange,
  compacto = false,
}: {
  status: StatusPreMatricula;
  onChange: (status: StatusPreMatricula) => void;
  /** coluna estreita (tabela das abas Intenções/Lista de espera): opções em 2×2 */
  compacto?: boolean;
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
          <strong
            className={`text-[16.5px] font-extrabold ${
              corTextoStatus(status)
            }`}
          >{STATUS_INFO[status].label}</strong>
        </p>
        {/* compacto: Cancelar fica sempre do lado do seletor (nunca desce) —
            vertical, ícone em cima do texto, da mesma altura do 2×2 */}
        <div className={compacto ? "flex items-stretch gap-1.5" : "flex flex-wrap items-center gap-2"}>
          {/* com 4 opções o seletor tem ~350px: em 2×2 na coluna estreita da
              tabela (compacto) e no celular; numa linha só onde há espaço */}
          <div
            className={`grid grid-cols-2 gap-1 whitespace-nowrap rounded-xl bg-seice-deep-soft p-1 ${
              compacto ? "" : "sm:inline-flex sm:items-center"
            }`}
          >
            {OPCOES.map((opcao) => {
              const ativo = opcao === status;
              return (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => !ativo && onChange(opcao)}
                  className={`rounded-lg ${compacto ? "px-2" : "px-2.5"} py-1.5 text-[12.5px] font-bold transition ${
                    ativo ? estiloAtivo(opcao) : "text-seice-muted hover:text-seice-ink"
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
            className={`items-center rounded-lg border border-seice-border-strong font-bold text-seice-muted transition hover:border-seice-danger/40 hover:bg-seice-danger-soft hover:text-seice-danger ${
              compacto
                ? "flex shrink-0 flex-col justify-center gap-1 rounded-xl px-2 text-[11.5px]"
                : "inline-flex gap-1.5 px-3 py-1.5 text-[12.5px]"
            }`}
          >
            <Ban size={compacto ? 16 : 14} /> Cancelar
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

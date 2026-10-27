import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Ban, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui";

/**
 * Aviso que abre quando o responsável clica numa turma (ou série) com o selo
 * "VAGAS ESGOTADAS" — em vez do clique não fazer nada e a pessoa achar que o
 * site travou. No celular sobe de baixo, ocupando a largura toda (fica perto
 * do polegar); da tela média pra cima é um cartão centralizado. Fecha no
 * botão, no X, clicando fora ou com Esc.
 */
export default function TurmaEsgotadaModal({
  open,
  descricao,
  onClose,
}: {
  open: boolean;
  /** O que foi clicado, ex.: "Pré II · Tarde" ou "5º ano". */
  descricao: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [open, onClose]);

  // portal no body: os passos ficam dentro de um motion.div com transform,
  // que prenderia o "fixed" dentro dele em vez de cobrir a tela toda
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="turma-esgotada-titulo"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full rounded-t-[28px] border border-b-0 border-seice-border bg-seice-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-3 text-center shadow-[0_-20px_60px_-24px_rgba(0,0,0,0.85)] sm:max-w-md sm:rounded-3xl sm:border-b sm:px-8 sm:pb-8 sm:pt-9 sm:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85)]"
          >
            {/* alça de "puxar" — só no celular, onde o aviso sobe de baixo */}
            <span className="mx-auto mb-5 block h-1.5 w-11 rounded-full bg-seice-chip sm:hidden" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-seice-muted transition hover:bg-white/10 hover:text-seice-ink"
            >
              <X size={19} />
            </button>

            <span className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-seice-danger-soft text-seice-danger ring-8 ring-seice-danger/10">
              <Ban size={34} strokeWidth={2.2} />
            </span>
            <h3 id="turma-esgotada-titulo" className="font-display text-[24px] font-semibold text-seice-ink">
              Vagas esgotadas
            </h3>
            {descricao && (
              <p className="mx-auto mt-2 inline-flex rounded-full bg-seice-gold-soft px-3.5 py-1 text-[14.5px] font-bold text-seice-gold">
                {descricao}
              </p>
            )}
            <p className="mx-auto mt-4 max-w-[30ch] text-[16px] sm:max-w-none leading-relaxed text-seice-soft">
              Essa turma não tem mais vagas disponíveis.
            </p>

            <Button className="mt-7 w-full py-3.5" onClick={onClose}>
              Escolher outra turma
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

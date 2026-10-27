import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Ban, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui";

/**
 * Aviso que abre quando o responsável clica numa turma (ou série) com o selo
 * "VAGAS ESGOTADAS" — em vez do clique não fazer nada e a pessoa achar que o
 * site travou. Fecha no botão, no X, clicando fora ou com Esc.
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="turma-esgotada-titulo"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-seice-border bg-seice-surface px-6 pb-6 pt-8 text-center shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-seice-muted transition hover:bg-white/10 hover:text-seice-ink"
            >
              <X size={18} />
            </button>

            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-seice-danger-soft text-seice-danger ring-1 ring-seice-danger/25">
              <Ban size={30} strokeWidth={2.2} />
            </span>
            <h3 id="turma-esgotada-titulo" className="font-display text-[22px] font-semibold text-seice-ink">
              Vagas esgotadas
            </h3>
            {descricao && <p className="mt-1 text-[15px] font-semibold text-seice-gold">{descricao}</p>}
            <p className="mt-3 text-[15.5px] leading-relaxed text-seice-soft">
              Essa turma não tem mais vagas disponíveis.
            </p>

            <Button className="mt-6 w-full" onClick={onClose}>
              Escolher outra turma
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

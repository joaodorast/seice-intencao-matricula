import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import { Button } from "../ui";

/** Modal de confirmação genérico — substitui o window.confirm() nativo do navegador. */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="max-w-sm">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-seice-danger-soft text-seice-danger">
            <AlertTriangle size={19} />
          </span>
          <p className="mt-1.5 text-[15.5px] leading-relaxed text-seice-soft">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} className="sm:!px-5">
            Voltar
          </Button>
          <Button
            variant="dark"
            className="!bg-seice-danger hover:!brightness-110"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

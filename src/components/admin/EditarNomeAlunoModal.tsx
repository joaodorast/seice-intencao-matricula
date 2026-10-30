import { useEffect, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import Modal from "./Modal";
import { Button } from "../ui";

/**
 * Corrige o nome do aluno de uma intenção — quando o responsável repetiu o
 * próprio nome no lugar do aluno ou deixou o campo quase vazio. Mostra o
 * nome do responsável junto pra secretaria comparar.
 */
export default function EditarNomeAlunoModal({
  open,
  nomeAtual,
  responsavel,
  onSalvar,
  onClose,
}: {
  open: boolean;
  nomeAtual: string;
  responsavel: string;
  onSalvar: (nome: string) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(nomeAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // reabre sempre com o nome atual daquela intenção
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react/set-state-in-effect
    setNome(nomeAtual);
    setErro(null);
  }, [open, nomeAtual]);

  const limpo = nome.trim().replace(/\s+/g, " ");
  const valido = limpo.length >= 3 && limpo.length <= 120;

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    if (!valido || limpo === nomeAtual) {
      if (limpo === nomeAtual) onClose();
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar(limpo);
      onClose();
    } catch (e) {
      setErro("Não foi possível salvar: " + (e instanceof Error ? e.message : "tente de novo."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} title="Editar nome do aluno" onClose={onClose} width="max-w-md">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <p className="text-[14.5px] leading-relaxed text-seice-soft">
          Responsável: <strong className="text-seice-ink">{responsavel}</strong>
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-seice-muted">Nome do aluno</span>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            className="rounded-xl border border-seice-border-strong bg-seice-deep-soft px-4 py-3 text-[16px] text-seice-ink outline-none transition focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/15"
          />
          {!valido && <span className="text-[13px] text-seice-danger">Digite o nome completo do aluno.</span>}
        </label>
        {erro && <p className="rounded-xl bg-seice-danger-soft px-4 py-3 text-[14px] text-seice-danger">{erro}</p>}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="sm:!px-5">
            Voltar
          </Button>
          <Button type="submit" disabled={!valido || salvando}>
            <Pencil size={16} /> {salvando ? "Salvando..." : "Salvar nome"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

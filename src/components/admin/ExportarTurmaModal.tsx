import { useState } from "react";
import { Check, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../../types";
import Modal from "./Modal";

type Formato = "xlsx" | "pdf";

export interface SelecaoExportacao {
  titulo: string;
  subtitulo: string;
  turmas: TurmaAdminRow[];
}

/**
 * Modal pequeno e direto: uma turma ou um segmento inteiro (ex.: toda a
 * Educação Infantil), escolhe PDF ou Excel e já baixa — sem lista, sem
 * seleção múltipla. É o atalho rápido de dentro da tabela de "Vagas por
 * turma"; para montar um recorte à mão (várias turmas escolhidas uma a uma),
 * ou só as intenções, existe o modal maior no botão "Exportar relatório".
 */
export default function ExportarTurmaModal({
  selecao,
  preMatriculas,
  onClose,
}: {
  selecao: SelecaoExportacao | null;
  preMatriculas: PreMatriculaAdminRow[];
  onClose: () => void;
}) {
  const [gerando, setGerando] = useState<Formato | null>(null);
  const [baixado, setBaixado] = useState<Formato | null>(null);

  async function exportar(formato: Formato) {
    if (!selecao) return;
    setGerando(formato);
    const ids = new Set(selecao.turmas.map((t) => t.id));
    const intencoesDaSelecao = preMatriculas.filter((p) => ids.has(p.turma_id));
    const escopo = `${selecao.titulo} · ${selecao.subtitulo}`;
    try {
      if (formato === "xlsx") {
        const { exportarRelatorioCompletoExcel } = await import("../../lib/excel");
        exportarRelatorioCompletoExcel(selecao.turmas, intencoesDaSelecao);
      } else {
        const { exportarRelatorioCompletoPDF } = await import("../../lib/pdf");
        await exportarRelatorioCompletoPDF(selecao.turmas, intencoesDaSelecao, escopo);
      }
      setBaixado(formato);
      setTimeout(() => {
        onClose();
        setBaixado(null);
      }, 1100);
    } finally {
      setGerando(null);
    }
  }

  return (
    <Modal open={selecao !== null} onClose={onClose} title="Exportar" width="max-w-sm">
      {selecao && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div>
            <div className="font-display text-[18px] font-semibold text-seice-ink">{selecao.titulo}</div>
            <div className="mt-0.5 text-[13.5px] text-seice-muted">{selecao.subtitulo}</div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <Quadrado
              icone={<FileText size={26} />}
              rotulo="PDF"
              gerando={gerando === "pdf"}
              baixado={baixado === "pdf"}
              disabled={gerando !== null}
              onClick={() => exportar("pdf")}
              destaque
            />
            <Quadrado
              icone={<FileSpreadsheet size={26} />}
              rotulo="Excel"
              gerando={gerando === "xlsx"}
              baixado={baixado === "xlsx"}
              disabled={gerando !== null}
              onClick={() => exportar("xlsx")}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Quadrado({
  icone,
  rotulo,
  gerando,
  baixado,
  disabled,
  onClick,
  destaque = false,
}: {
  icone: React.ReactNode;
  rotulo: string;
  gerando: boolean;
  baixado: boolean;
  disabled: boolean;
  onClick: () => void;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`card-surface flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 transition disabled:cursor-not-allowed ${
        baixado
          ? "border-seice-success bg-seice-success/10"
          : destaque
          ? "border-seice-gold/50 hover:border-seice-gold hover:bg-seice-gold/10"
          : "border-seice-border hover:border-seice-border-strong hover:bg-seice-chip/40"
      } ${disabled && !gerando ? "opacity-50" : ""}`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          baixado ? "bg-seice-success text-white" : destaque ? "icon-tile" : "bg-seice-chip text-seice-ink"
        }`}
      >
        {gerando ? (
          <LoaderCircle size={24} className="animate-spin" />
        ) : baixado ? (
          <Check size={26} strokeWidth={3} />
        ) : (
          icone
        )}
      </span>
      <span className="text-[14.5px] font-bold text-seice-ink">{baixado ? "Baixado!" : rotulo}</span>
    </button>
  );
}

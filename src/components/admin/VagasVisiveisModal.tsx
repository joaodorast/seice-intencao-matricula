import { useMemo, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { NIVEIS } from "../../config";
import { turnoLabel } from "../../lib/format";
import { ordenarTurmas, unidadeCurta } from "../../lib/labels";
import { atualizarTurma } from "../../lib/adminTurmasApi";
import type { TurmaAdminRow } from "../../types";
import Modal from "./Modal";

/**
 * Tela onde o admin escolhe, turma por turma, se o responsável vê o número
 * de vagas no site público ou se aquela turma sempre aparece como "Lista
 * de espera" pra ele — mesmo que ainda tenha vaga real sobrando. Cada
 * clique salva na hora (sem botão de "salvar tudo" no final), então o
 * efeito é imediato no site.
 */
export default function VagasVisiveisModal({
  open,
  onClose,
  token,
  turmas,
  onAtualizarTurma,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  turmas: TurmaAdminRow[];
  /** Atualiza a lista de turmas no componente pai assim que uma muda, sem
   *  precisar recarregar tudo do zero. */
  onAtualizarTurma: (turma: TurmaAdminRow) => void;
}) {
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const turmasOrdenadas = useMemo(() => ordenarTurmas(turmas), [turmas]);
  const turmasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return turmasOrdenadas;
    return turmasOrdenadas.filter(
      (t) =>
        t.serie.toLowerCase().includes(termo) ||
        t.codigo.toLowerCase().includes(termo) ||
        (t.curso ?? "").toLowerCase().includes(termo) ||
        unidadeCurta(t.unidade_id).toLowerCase().includes(termo)
    );
  }, [turmasOrdenadas, busca]);

  const gruposPorNivel = useMemo(() => {
    const grupos = new Map<string, TurmaAdminRow[]>();
    for (const t of turmasVisiveis) {
      if (!grupos.has(t.nivel)) grupos.set(t.nivel, []);
      grupos.get(t.nivel)!.push(t);
    }
    return grupos;
  }, [turmasVisiveis]);

  const totalVisiveis = turmas.filter((t) => t.mostrar_vagas).length;

  async function alternar(turma: TurmaAdminRow) {
    const novoValor = !turma.mostrar_vagas;
    setSalvando(turma.id);
    setErro(null);
    // otimista: muda na hora, e desfaz se a chamada falhar
    onAtualizarTurma({ ...turma, mostrar_vagas: novoValor });
    try {
      await atualizarTurma(token, turma.id, { mostrar_vagas: novoValor });
    } catch (e) {
      onAtualizarTurma(turma);
      setErro(e instanceof Error ? e.message : "Não foi possível salvar essa alteração.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Vagas visíveis pro responsável" width="max-w-4xl">
      <div className="flex flex-col gap-4">
        <p className="text-[14.5px] leading-relaxed text-seice-muted">
          Escolha, turma por turma, se o responsável vê a{" "}
          <strong className="text-seice-ink">quantidade de vagas</strong> no site público ou se essa turma sempre
          aparece como <strong className="text-seice-ink">"Lista de espera"</strong> pra ele — mesmo que ainda
          tenha vaga real sobrando. Cada clique já salva na hora, sem precisar publicar o site de novo.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por série, código, curso ou unidade..."
              className="inset-surface w-full rounded-xl border border-seice-border-strong py-2.5 pl-10 pr-3.5 text-[14.5px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold"
            />
          </div>
          <div className="inset-surface flex shrink-0 items-center gap-1.5 rounded-xl border border-seice-border px-3.5 py-2.5 text-[13.5px] font-bold text-seice-ink">
            <Eye size={15} className="text-seice-gold" />
            {totalVisiveis} de {turmas.length} mostrando vagas
          </div>
        </div>

        {erro && (
          <div className="rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3 text-[14px] text-seice-danger">
            {erro}
          </div>
        )}

        <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto pr-1">
          {turmasVisiveis.length === 0 && (
            <p className="py-10 text-center text-[14px] text-seice-muted">Nenhuma turma encontrada para "{busca}".</p>
          )}

          {NIVEIS.filter((n) => gruposPorNivel.has(n.key)).map((n) => (
            <div key={n.key} className="flex flex-col gap-2">
              <div className="mt-1.5 px-1 text-[12.5px] font-bold uppercase tracking-wide text-seice-muted first:mt-0">
                {n.label}
              </div>
              {gruposPorNivel.get(n.key)!.map((t) => (
                <LinhaTurma
                  key={t.id}
                  turma={t}
                  salvando={salvando === t.id}
                  onToggle={() => alternar(t)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function LinhaTurma({
  turma,
  salvando,
  onToggle,
}: {
  turma: TurmaAdminRow;
  salvando: boolean;
  onToggle: () => void;
}) {
  const ligado = turma.mostrar_vagas;
  return (
    <div
      className={`card-surface flex items-center gap-3 rounded-xl border p-3.5 transition ${
        ligado ? "border-seice-gold/40" : "border-seice-border"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          ligado ? "icon-tile" : "icon-tile-soft"
        }`}
      >
        {ligado ? <Eye size={17} /> : <EyeOff size={17} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold text-seice-ink">
          {turma.serie} · Turma {turma.codigo}
        </div>
        <div className="truncate text-[13px] text-seice-muted">
          {unidadeCurta(turma.unidade_id)} · {turnoLabel(turma.turno)}
          {turma.curso ? ` · ${turma.curso}` : ""} · {turma.vagas_restantes} vaga
          {turma.vagas_restantes === 1 ? "" : "s"} real{turma.vagas_restantes === 1 ? "" : "is"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span className={`text-[13px] font-bold ${ligado ? "text-seice-gold" : "text-seice-muted"}`}>
          {ligado ? "Mostra vagas" : "Lista de espera"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={ligado}
          disabled={salvando}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
            ligado ? "bg-seice-gold" : "bg-seice-chip"
          }`}
        >
          <span
            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
              ligado ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

import { memo, useCallback, useMemo, useState } from "react";
import { Eye, EyeOff, LayoutGrid, Search } from "lucide-react";
import { NIVEIS, UNIDADES } from "../../config";
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
 * efeito é imediato no site. Dá pra filtrar por unidade e marcar/desmarcar
 * todas as turmas visíveis de uma vez.
 *
 * Otimizações: as linhas são memoizadas (só a turma que mudou re-renderiza,
 * não a lista inteira) e o "marcar todas" faz uma única atualização de
 * estado em lote, em vez de uma por turma — mesmo com muitas turmas e
 * muitos cliques seguidos, a tela continua leve.
 */
export default function VagasVisiveisModal({
  open,
  onClose,
  token,
  turmas,
  onAtualizarTurma,
  onAtualizarVarias,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  turmas: TurmaAdminRow[];
  /** Atualiza a lista de turmas no componente pai assim que uma muda, sem
   *  precisar recarregar tudo do zero. */
  onAtualizarTurma: (turma: TurmaAdminRow) => void;
  /** Atualiza várias turmas de uma vez (um só re-render). */
  onAtualizarVarias: (ids: Set<string>, mostrar_vagas: boolean) => void;
}) {
  const [busca, setBusca] = useState("");
  const [unidadeAtiva, setUnidadeAtiva] = useState<string>("todas");
  const [salvando, setSalvando] = useState<Set<string>>(new Set());
  const [salvandoEmMassa, setSalvandoEmMassa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const turmasDaUnidade = useMemo(
    () => (unidadeAtiva === "todas" ? turmas : turmas.filter((t) => t.unidade_id === unidadeAtiva)),
    [turmas, unidadeAtiva]
  );
  const turmasOrdenadas = useMemo(() => ordenarTurmas(turmasDaUnidade), [turmasDaUnidade]);
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

  const totalVisiveisGeral = useMemo(() => turmas.filter((t) => t.mostrar_vagas).length, [turmas]);
  const todasVisiveisNoRecorte = turmasVisiveis.length > 0 && turmasVisiveis.every((t) => t.mostrar_vagas);

  // referência estável: LinhaTurma memoizado só re-renderiza de verdade
  // quando a própria turma dele muda, não a cada clique em qualquer outra
  const alternar = useCallback(
    async (turma: TurmaAdminRow) => {
      const novoValor = !turma.mostrar_vagas;
      setErro(null);
      setSalvando((atual) => new Set(atual).add(turma.id));
      onAtualizarTurma({ ...turma, mostrar_vagas: novoValor }); // otimista
      try {
        await atualizarTurma(token, turma.id, { mostrar_vagas: novoValor });
      } catch (e) {
        onAtualizarTurma(turma); // desfaz só essa
        setErro(e instanceof Error ? e.message : "Não foi possível salvar essa alteração.");
      } finally {
        setSalvando((atual) => {
          const novo = new Set(atual);
          novo.delete(turma.id);
          return novo;
        });
      }
    },
    [token, onAtualizarTurma]
  );

  async function marcarTodas(valor: boolean) {
    setErro(null);
    setSalvandoEmMassa(true);
    const alvo = turmasVisiveis.filter((t) => t.mostrar_vagas !== valor);
    const idsAlvo = new Set(alvo.map((t) => t.id));
    // uma atualização otimista só, pra todas de uma vez — em vez de uma
    // chamada de estado por turma (o que travaria a tela com muitas turmas)
    onAtualizarVarias(idsAlvo, valor);
    setSalvando((atual) => new Set([...atual, ...idsAlvo]));
    try {
      const resultados = await Promise.allSettled(
        alvo.map((t) => atualizarTurma(token, t.id, { mostrar_vagas: valor }))
      );
      const falharam = alvo.filter((_, i) => resultados[i].status === "rejected");
      if (falharam.length > 0) {
        // desfaz só quem falhou, também em lote
        onAtualizarVarias(new Set(falharam.map((t) => t.id)), !valor);
        setErro(
          falharam.length === alvo.length
            ? "Não foi possível salvar. Tente de novo."
            : `${falharam.length} turma(s) não foram salvas. Tente de novo nelas.`
        );
      }
    } finally {
      setSalvando((atual) => {
        const novo = new Set(atual);
        for (const id of idsAlvo) novo.delete(id);
        return novo;
      });
      setSalvandoEmMassa(false);
    }
  }

  function fecharEReiniciar() {
    onClose();
    setTimeout(() => {
      setBusca("");
      setUnidadeAtiva("todas");
      setErro(null);
    }, 200);
  }

  return (
    <Modal open={open} onClose={fecharEReiniciar} title="Vagas visíveis pro responsável" width="max-w-[68rem]">
      <div className="flex flex-col gap-4">
        <p className="text-[14.5px] leading-relaxed text-seice-muted">
          Escolha, turma por turma, se o responsável vê a{" "}
          <strong className="text-seice-ink">quantidade de vagas</strong> no site público ou se essa turma sempre
          aparece como <strong className="text-seice-ink">"Lista de espera"</strong> pra ele — mesmo que ainda
          tenha vaga real sobrando. Cada clique já salva na hora, sem precisar publicar o site de novo.
        </p>

        {/* filtro por unidade — separa Campos Elíseos de Jardim Primavera */}
        <div className="inset-surface flex flex-wrap gap-1 rounded-xl border border-seice-border p-1.5">
          <AbaUnidade ativo={unidadeAtiva === "todas"} onClick={() => setUnidadeAtiva("todas")} icon={<LayoutGrid size={15} />}>
            Todas as unidades
          </AbaUnidade>
          {UNIDADES.map((u) => (
            <AbaUnidade key={u.slug} ativo={unidadeAtiva === u.slug} onClick={() => setUnidadeAtiva(u.slug)}>
              {u.nome}
            </AbaUnidade>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por série, código ou curso..."
              className="inset-surface w-full rounded-xl border border-seice-border-strong py-2.5 pl-10 pr-3.5 text-[14.5px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold"
            />
          </div>

          <button
            type="button"
            disabled={salvandoEmMassa || turmasVisiveis.length === 0}
            onClick={() => marcarTodas(!todasVisiveisNoRecorte)}
            className="raised-surface inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-seice-border-strong px-3.5 py-2.5 text-[13.5px] font-bold text-seice-ink transition hover:border-seice-gold/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {todasVisiveisNoRecorte ? <EyeOff size={15} /> : <Eye size={15} />}
            {salvandoEmMassa
              ? "Salvando..."
              : todasVisiveisNoRecorte
              ? `Pôr em lista de espera (${turmasVisiveis.length})`
              : `Mostrar vagas em todas (${turmasVisiveis.length})`}
          </button>

          <div className="inset-surface flex shrink-0 items-center gap-1.5 rounded-xl border border-seice-border px-3.5 py-2.5 text-[13.5px] font-bold text-seice-ink">
            <Eye size={15} className="text-seice-gold" />
            {totalVisiveisGeral} de {turmas.length} mostrando vagas
          </div>
        </div>

        {erro && (
          <div className="rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3 text-[14px] text-seice-danger">
            {erro}
          </div>
        )}

        <div className="grid max-h-[60vh] grid-cols-1 gap-2.5 overflow-y-auto pr-1 lg:grid-cols-2">
          {turmasVisiveis.length === 0 && (
            <p className="col-span-full py-10 text-center text-[14px] text-seice-muted">
              Nenhuma turma encontrada para "{busca}".
            </p>
          )}

          {NIVEIS.filter((n) => gruposPorNivel.has(n.key)).map((n) => (
            <div key={n.key} className="col-span-full grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              <div className="col-span-full mt-1.5 px-1 text-[12.5px] font-bold uppercase tracking-wide text-seice-muted first:mt-0">
                {n.label}
              </div>
              {gruposPorNivel.get(n.key)!.map((t) => (
                <LinhaTurma key={t.id} turma={t} salvando={salvando.has(t.id)} onToggle={alternar} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function AbaUnidade({
  ativo,
  onClick,
  icon,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-[13.5px] font-bold transition ${
        ativo ? "bg-seice-gold text-seice-gold-ink" : "text-seice-soft hover:bg-seice-chip"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

const LinhaTurma = memo(function LinhaTurma({
  turma,
  salvando,
  onToggle,
}: {
  turma: TurmaAdminRow;
  salvando: boolean;
  onToggle: (turma: TurmaAdminRow) => void;
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
          {turma.curso ? ` · ${turma.curso}` : ""} · {turma.vagas_restantes}{" "}
          {turma.vagas_restantes === 1 ? "vaga real" : "vagas reais"}
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
          onClick={() => onToggle(turma)}
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
});

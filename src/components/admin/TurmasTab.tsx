import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { NIVEL_LABELS } from "../../config";
import { turnoLabel } from "../../lib/format";
import { unidadeNome } from "../../lib/labels";
import { vagaStatus } from "../../lib/vagas";
import { atualizarTurma, criarTurma, excluirTurma } from "../../lib/adminTurmasApi";
import type { TurmaAdminRow, TurmaFormValues } from "../../types";
import { Badge, Button, EmptyState, StatMini } from "../ui";
import Modal from "./Modal";
import TurmaForm from "./TurmaForm";

const TIER_BADGE = { abertas: "success", poucas: "gold", ultimas: "danger" } as const;

export default function TurmasTab({
  token,
  turmas,
  unidadeFiltro,
  onChange,
}: {
  token: string;
  turmas: TurmaAdminRow[];
  unidadeFiltro: string;
  onChange: () => void;
}) {
  const [nivelFiltro, setNivelFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<TurmaAdminRow | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return turmas
      .filter((t) => unidadeFiltro === "todas" || t.unidade_id === unidadeFiltro)
      .filter((t) => nivelFiltro === "todos" || t.nivel === nivelFiltro)
      .filter((t) => {
        if (!termo) return true;
        return (
          t.codigo.toLowerCase().includes(termo) ||
          t.serie.toLowerCase().includes(termo) ||
          (t.curso ?? "").toLowerCase().includes(termo)
        );
      })
      .sort((a, b) =>
        a.unidade_id !== b.unidade_id
          ? a.unidade_id.localeCompare(b.unidade_id)
          : a.nivel !== b.nivel
          ? a.nivel.localeCompare(b.nivel)
          : a.ordem - b.ordem || a.codigo.localeCompare(b.codigo)
      );
  }, [turmas, unidadeFiltro, nivelFiltro, busca]);

  function abrirNova() {
    setEditando(null);
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(t: TurmaAdminRow) {
    setEditando(t);
    setErroForm(null);
    setModalAberto(true);
  }

  async function salvar(values: TurmaFormValues) {
    setSalvando(true);
    setErroForm(null);
    try {
      if (editando) {
        await atualizarTurma(token, editando.id, values);
      } else {
        await criarTurma(token, values);
      }
      setModalAberto(false);
      onChange();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Não foi possível salvar a turma.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(t: TurmaAdminRow) {
    const confirmado = window.confirm(
      `Excluir a turma ${t.serie} · ${t.codigo} (${unidadeNome(t.unidade_id)})? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;
    setExcluindoId(t.id);
    try {
      await excluirTurma(token, t.id);
      onChange();
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir esta turma. Ela pode já ter intenções de matrícula vinculadas."
      );
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[22.5px] font-semibold tracking-tight text-seice-ink">
            Gestão de turmas
          </h2>
          <p className="text-[15px] text-seice-muted">
            Crie novas turmas e ajuste as vagas ofertadas em tempo real.
          </p>
        </div>
        <Button onClick={abrirNova} className="!px-5 !py-3">
          <Plus size={16} /> Nova turma
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-55 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por série, código ou curso..."
            className="inset-surface w-full rounded-xl border border-seice-border-strong py-2.5 pl-9 pr-3.5 text-[15px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/20"
          />
        </div>
        <select
          value={nivelFiltro}
          onChange={(e) => setNivelFiltro(e.target.value)}
          className="inset-surface rounded-xl border border-seice-border-strong px-3.5 py-2.5 text-[14.5px] font-bold text-seice-ink outline-none focus:border-seice-gold"
        >
          <option value="todos">Todos os níveis</option>
          {Object.entries(NIVEL_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {linhas.length === 0 ? (
        <div className="card-surface rounded-2xl border border-seice-border">
          <EmptyState emoji="🏫">Nenhuma turma encontrada com esses filtros.</EmptyState>
        </div>
      ) : (
        <>
          {/* celular e tablet em pé: um cartão por turma */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
            {linhas.map((t) => {
              const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
              return (
                <article key={t.id} className="card-surface rounded-2xl border border-seice-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-bold leading-tight text-seice-ink">
                        {t.serie} · Turma {t.codigo}
                      </h3>
                      <p className="mt-0.5 text-[14.5px] text-seice-muted">
                        {unidadeNome(t.unidade_id)} · {NIVEL_LABELS[t.nivel] ?? t.nivel} · {turnoLabel(t.turno)}
                        {t.curso ? ` · ${t.curso}` : ""}
                      </p>
                    </div>
                    <Badge tone={TIER_BADGE[status.tier]}>{status.label}</Badge>
                  </div>

                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    <StatMini label="Ofertadas" value={t.vagas_planilha} />
                    <StatMini label="Recebidas" value={t.pre_matriculas_recebidas} />
                    <StatMini label="Restantes" value={t.vagas_restantes} destaque />
                  </div>

                  <div className="mt-3.5 flex gap-2 border-t border-seice-border pt-3.5">
                    <Button
                      variant="ghost"
                      className="flex-1 !py-2.5 !text-[14.5px]"
                      onClick={() => abrirEdicao(t)}
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <button
                      onClick={() => excluir(t)}
                      disabled={excluindoId === t.id}
                      title="Excluir turma"
                      className="raised-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-seice-border-strong text-seice-danger transition hover:bg-seice-danger-soft disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* tela grande: tabela completa */}
          <div className="card-surface hidden overflow-x-auto rounded-2xl border border-seice-border lg:block">
            <table className="w-full min-w-225 border-collapse text-[15px]">
              <thead>
                <tr>
                  {["Unidade", "Nível", "Série", "Código", "Turno", "Curso", "Ofertadas", "Recebidas", "Restantes", "Ações"].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap border-b border-seice-border bg-seice-panel px-3.5 py-3 text-left text-[13px] font-bold uppercase tracking-wide text-seice-muted"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {linhas.map((t) => {
                  const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
                  return (
                    <tr key={t.id} className="transition-colors hover:bg-seice-chip/40">
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {unidadeNome(t.unidade_id)}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {NIVEL_LABELS[t.nivel] ?? t.nivel}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top font-bold text-seice-ink">
                        {t.serie}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {t.codigo}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {turnoLabel(t.turno)}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {t.curso || "—"}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {t.vagas_planilha}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                        {t.pre_matriculas_recebidas}
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top">
                        <Badge tone={TIER_BADGE[status.tier]}>{t.vagas_restantes}</Badge>
                      </td>
                      <td className="border-b border-seice-border px-3.5 py-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => abrirEdicao(t)}
                            title="Editar turma"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-seice-ink transition hover:bg-seice-chip"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => excluir(t)}
                            disabled={excluindoId === t.id}
                            title="Excluir turma"
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-seice-danger transition hover:bg-seice-danger-soft ${
                              excluindoId === t.id ? "opacity-40" : ""
                            }`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={modalAberto}
        onClose={() => !salvando && setModalAberto(false)}
        title={editando ? "Editar turma" : "Nova turma"}
        width="max-w-xl"
      >
        <TurmaForm
          turma={editando}
          onSubmit={salvar}
          onCancel={() => setModalAberto(false)}
          salvando={salvando}
          erro={erroForm}
        />
      </Modal>
    </div>
  );
}

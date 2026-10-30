import { useState, type ReactNode } from "react";
import { CheckCircle2, Clock, Pencil } from "lucide-react";
import { formatarSenha, maskPhone, formatDateTime } from "../../lib/format";
import { STATUS_INFO, descricaoTurma, unidadeNome } from "../../lib/labels";
import type { PreMatriculaAdminRow, StatusPreMatricula } from "../../types";
import { Badge, EmptyState } from "../ui";
import EditarNomeAlunoModal from "./EditarNomeAlunoModal";
import StatusControl from "./StatusControl";

/** Selo de posição na fila daquela turma — dourado com relógio pra lista de
 *  espera, neutro com check pra quem já garantiu vaga. Cada turma tem sua
 *  própria fila, contada por ordem de chegada (por isso "1ª" repete entre
 *  turmas diferentes — é a posição NAQUELA turma, não geral). */
function SeloPosicao({ registro, posicoes }: { registro: PreMatriculaAdminRow; posicoes: Map<string, number> }) {
  const posicao = posicoes.get(registro.id);
  if (registro.lista_espera) {
    return (
      <Badge
        tone="gold"
        icon={<Clock size={12} />}
        title="Posição na fila de espera dessa turma — cada turma tem a própria fila, começando em 1ª"
      >
        {posicao ? `${posicao}ª` : "Sim"}
      </Badge>
    );
  }
  return (
    <Badge
      tone="success"
      icon={<CheckCircle2 size={12} />}
      title="Posição de chegada entre as intenções confirmadas dessa turma — cada turma conta a própria fila"
    >
      {posicao ? `${posicao}ª` : "—"}
    </Badge>
  );
}

/** Nome do aluno com o lápis de editar do lado. */
function NomeAluno({ nome, onEditar }: { nome: string; onEditar: () => void }) {
  return (
    <span className="inline-flex items-start gap-1.5">
      <span>{nome}</span>
      <button
        type="button"
        onClick={onEditar}
        title="Editar nome do aluno"
        aria-label={`Editar nome do aluno ${nome}`}
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-seice-muted transition hover:bg-seice-chip hover:text-seice-gold"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}

export default function PreMatriculaTable({
  registros,
  posicoes,
  onStatusChange,
  onNomeAlunoChange,
  mensagemVazia,
}: {
  registros: PreMatriculaAdminRow[];
  /** Posição de cada registro na fila da própria turma — de
   *  calcularPosicoesEspera ou calcularPosicoesIntencao, conforme a aba. */
  posicoes: Map<string, number>;
  onStatusChange: (id: string, status: StatusPreMatricula) => void;
  /** Corrige o nome do aluno (rejeita se não conseguir salvar). */
  onNomeAlunoChange: (id: string, nome: string) => Promise<void>;
  mensagemVazia?: string;
}) {
  // intenção com o nome do aluno sendo editado (null = modal fechado)
  const [editando, setEditando] = useState<PreMatriculaAdminRow | null>(null);

  if (registros.length === 0) {
    return (
      <div className="card-surface rounded-2xl border border-seice-border">
        <EmptyState emoji="🗂️">{mensagemVazia ?? "Nenhuma intenção de matrícula encontrada."}</EmptyState>
      </div>
    );
  }

  return (
    <>
      {/* celular e tablet em pé: um cartão por intenção */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {registros.map((r) => (
          <article key={r.id} className="card-surface rounded-2xl border border-seice-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-seice-gold px-3 py-1 font-mono text-[16px] font-extrabold text-seice-gold-ink">
                  Senha {formatarSenha(r.numero_senha)}
                </div>
                <h3 className="text-[17px] font-bold leading-tight text-seice-ink">
                  <NomeAluno nome={r.aluno_nome} onEditar={() => setEditando(r)} />
                </h3>
                <p className="mt-0.5 text-[14.5px] text-seice-muted">{descricaoTurma(r.turmas)}</p>
                <div className="mt-1.5">
                  <SeloPosicao registro={r} posicoes={posicoes} />
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${STATUS_INFO[r.status].badge}`}
              >
                {STATUS_INFO[r.status].label}
              </span>
            </div>

            <dl className="mt-3.5 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <Info label="Unidade" value={unidadeNome(r.unidade_id)} />
              <Info label="Recebido em" value={formatDateTime(r.criado_em)} />
              <Info label="Responsável" value={r.responsavel_nome} />
              <Info
                label="Telefone(s)"
                value={[r.telefone1, r.telefone2].filter(Boolean).map((t) => maskPhone(t!)).join(" · ")}
              />
              <Info label="E-mail" value={r.email || "—"} />
            </dl>

            <div className="mt-3.5 border-t border-seice-border pt-3.5">
              <StatusControl compacto status={r.status} onChange={(status) => onStatusChange(r.id, status)} />
            </div>
          </article>
        ))}
      </div>

      {/* tela grande: tabela completa — sem largura mínima forçada nem
          quebra de linha travada, pra caber inteira sem precisar de rolagem
          horizontal mesmo com muitas linhas na tela */}
      <div className="card-surface hidden rounded-2xl border border-seice-border lg:block">
        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr>
              {[
                ["Senha / recebido em", "w-[10%]"],
                ["Unidade", "w-[8%]"],
                ["Aluno", "w-[13%]"],
                ["Turma", "w-[12%]"],
                ["Posição na fila (por turma)", "w-[9%]"],
                ["Responsável / contato", "w-[18%]"],
                ["Status", "w-[30%]"],
              ].map(([h, w]) => (
                <th
                  key={h}
                  className={`${w} border-b border-seice-border bg-seice-panel px-2.5 py-3 text-left text-[12.5px] font-bold uppercase tracking-wide text-seice-muted`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-seice-chip/40">
                <td className="border-b border-seice-border px-2.5 py-3 align-top">
                  <span className="inline-flex items-center rounded-full bg-seice-gold px-2.5 py-1 font-mono text-[14px] font-extrabold text-seice-gold-ink">
                    {formatarSenha(r.numero_senha)}
                  </span>
                  <p className="mt-1.5 break-words text-[12.5px] leading-snug text-seice-muted">
                    {formatDateTime(r.criado_em)}
                  </p>
                </td>
                <td className="break-words border-b border-seice-border px-2.5 py-3 align-top text-seice-soft">
                  {unidadeNome(r.unidade_id)}
                </td>
                <td className="break-words border-b border-seice-border px-2.5 py-3 align-top font-bold text-seice-ink">
                  <NomeAluno nome={r.aluno_nome} onEditar={() => setEditando(r)} />
                </td>
                <td className="break-words border-b border-seice-border px-2.5 py-3 align-top text-seice-soft">
                  {descricaoTurma(r.turmas)}
                </td>
                <td className="break-words border-b border-seice-border px-2.5 py-3 align-top">
                  <SeloPosicao registro={r} posicoes={posicoes} />
                </td>
                {/* responsável, telefone e e-mail juntos numa coluna só — libera
                    largura pro seletor de status caber inteiro numa linha */}
                <td className="break-words border-b border-seice-border px-2.5 py-3 align-top text-seice-soft">
                  <p className="font-semibold text-seice-ink">{r.responsavel_nome}</p>
                  <p className="mt-0.5">
                    {[r.telefone1, r.telefone2].filter(Boolean).map((t) => maskPhone(t!)).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-[13px] text-seice-muted">{r.email || "—"}</p>
                </td>
                <td className="border-b border-seice-border px-2.5 py-3 align-top">
                  <StatusControl compacto status={r.status} onChange={(status) => onStatusChange(r.id, status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditarNomeAlunoModal
        open={editando !== null}
        nomeAtual={editando?.aluno_nome ?? ""}
        responsavel={editando?.responsavel_nome ?? ""}
        onSalvar={(nome) => onNomeAlunoChange(editando!.id, nome)}
        onClose={() => setEditando(null)}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-semibold uppercase tracking-wide text-seice-muted">{label}</dt>
      <dd className="break-words text-[15px] text-seice-soft">{value}</dd>
    </div>
  );
}

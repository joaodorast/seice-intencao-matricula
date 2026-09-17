import type { ReactNode } from "react";
import { formatarSenha, maskPhone, formatDateTime } from "../../lib/format";
import { STATUS_INFO, descricaoTurma, unidadeNome } from "../../lib/labels";
import type { PreMatriculaAdminRow, StatusPreMatricula } from "../../types";
import { EmptyState } from "../ui";
import StatusControl from "./StatusControl";

export default function PreMatriculaTable({
  registros,
  onStatusChange,
}: {
  registros: PreMatriculaAdminRow[];
  onStatusChange: (id: string, status: StatusPreMatricula) => void;
}) {
  if (registros.length === 0) {
    return (
      <div className="card-surface rounded-2xl border border-seice-border">
        <EmptyState emoji="🗂️">Nenhuma intenção de matrícula encontrada.</EmptyState>
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
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-seice-gold px-2.5 py-0.5 font-mono text-[12.5px] font-bold text-seice-gold-ink">
                  Senha {formatarSenha(r.numero_senha)}
                </div>
                <h3 className="text-[17px] font-bold leading-tight text-seice-ink">{r.aluno_nome}</h3>
                <p className="mt-0.5 text-[14.5px] text-seice-muted">{descricaoTurma(r.turmas)}</p>
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
              <StatusControl status={r.status} onChange={(status) => onStatusChange(r.id, status)} />
            </div>
          </article>
        ))}
      </div>

      {/* tela grande: tabela completa */}
      <div className="card-surface hidden overflow-x-auto rounded-2xl border border-seice-border lg:block">
        <table className="w-full min-w-260 border-collapse text-[15px]">
          <thead>
            <tr>
              {[
                "Senha",
                "Recebido em",
                "Unidade",
                "Aluno",
                "Turma",
                "Responsável",
                "Telefone(s)",
                "E-mail",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-seice-border bg-seice-panel px-3.5 py-3 text-left text-[13px] font-bold uppercase tracking-wide text-seice-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-seice-chip/40">
                <td className="border-b border-seice-border px-3.5 py-3 align-top">
                  <span className="inline-flex items-center rounded-full bg-seice-gold px-2.5 py-1 font-mono text-[13px] font-bold text-seice-gold-ink">
                    {formatarSenha(r.numero_senha)}
                  </span>
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-muted">
                  {formatDateTime(r.criado_em)}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                  {unidadeNome(r.unidade_id)}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top font-bold text-seice-ink">
                  {r.aluno_nome}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                  {descricaoTurma(r.turmas)}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                  {r.responsavel_nome}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                  {maskPhone(r.telefone1)}
                  {r.telefone2 && (
                    <>
                      <br />
                      {maskPhone(r.telefone2)}
                    </>
                  )}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top text-seice-soft">
                  {r.email || "—"}
                </td>
                <td className="border-b border-seice-border px-3.5 py-3 align-top">
                  <StatusControl status={r.status} onChange={(status) => onStatusChange(r.id, status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

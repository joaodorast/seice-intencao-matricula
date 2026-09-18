import { CheckCircle2, ClipboardList, Clock, DoorOpen, Layers } from "lucide-react";
import { formatarSenha } from "../../lib/format";
import { STATUS_INFO, STATUS_ORDER, descricaoTurma } from "../../lib/labels";
import VagasPorTurma from "./VagasPorTurma";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow } from "../../types";
import { Badge, Card, EmptyState, SectionDesc, SectionTitle } from "../ui";
import StatCard from "./StatCard";
import StatusControl from "./StatusControl";

export default function OverviewTab({
  turmas,
  preMatriculas,
  onStatusChange,
  onVerTodas,
}: {
  turmas: TurmaAdminRow[];
  preMatriculas: PreMatriculaAdminRow[];
  onStatusChange: (id: string, status: StatusPreMatricula) => void;
  onVerTodas: () => void;
}) {
  const totalTurmas = turmas.length;
  const totalVagasOfertadas = turmas.reduce((acc, t) => acc + t.vagas_planilha, 0);
  const totalVagasRestantes = turmas.reduce((acc, t) => acc + t.vagas_restantes, 0);
  const totalOcupadas = totalVagasOfertadas - totalVagasRestantes;
  const totalIntencoes = preMatriculas.length;

  const porStatus = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, preMatriculas.filter((p) => p.status === s).length])
  ) as Record<StatusPreMatricula, number>;

  const pendentesRecentes = preMatriculas
    .filter((p) => p.status === "pendente")
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Layers size={19} />} label="Turmas ofertadas" value={totalTurmas} accent="black" />
        <StatCard
          icon={<DoorOpen size={19} />}
          label="Vagas ofertadas"
          value={totalVagasOfertadas}
          accent="info"
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label="Vagas ocupadas"
          value={totalOcupadas}
          accent="success"
        />
        <StatCard
          icon={<ClipboardList size={19} />}
          label="Intenções recebidas"
          value={totalIntencoes}
          sub={`${porStatus.pendente} pendente${porStatus.pendente === 1 ? "" : "s"}`}
          accent="black"
        />
      </div>

      <Card>
        <SectionTitle>Status das intenções de matrícula</SectionTitle>
        <SectionDesc>Distribuição de todas as solicitações recebidas.</SectionDesc>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_ORDER.map((s) => (
            <div key={s} className={`rounded-xl px-4 py-3 ${STATUS_INFO[s].badge}`}>
              <div className="text-[22.5px] font-extrabold leading-none tabular-nums">{porStatus[s]}</div>
              <div className="mt-1 text-[13px] font-bold uppercase tracking-wide opacity-80">
                {STATUS_INFO[s].label}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <SectionTitle>Intenções pendentes</SectionTitle>
            <SectionDesc>As mais recentes, para agilizar o contato — mude o status sem sair daqui.</SectionDesc>
          </div>
          {preMatriculas.length > 0 && (
            <button
              type="button"
              onClick={onVerTodas}
              className="mb-5 shrink-0 text-[14.5px] font-semibold text-seice-ink underline-offset-2 hover:underline"
            >
              Ver todas →
            </button>
          )}
        </div>

        {pendentesRecentes.length === 0 ? (
          <EmptyState emoji="✅">Nenhuma intenção pendente no momento.</EmptyState>
        ) : (
          <div className="flex flex-col divide-y divide-seice-border">
            {pendentesRecentes.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 rounded-full bg-seice-gold px-2 py-0.5 font-mono text-[12px] font-bold text-seice-gold-ink">
                    {formatarSenha(r.numero_senha)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-[15.5px] font-bold text-seice-ink">{r.aluno_nome}</div>
                      {r.lista_espera && (
                        <Badge tone="gold" icon={<Clock size={11} />}>
                          Espera
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[14px] text-seice-muted">{descricaoTurma(r.turmas)}</div>
                  </div>
                </div>
                <StatusControl status={r.status} onChange={(status) => onStatusChange(r.id, status)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Vagas por turma</SectionTitle>
        <SectionDesc>
          Cada turma com as vagas ofertadas, preenchidas e livres. Use os filtros para ver um nível de ensino por vez.
        </SectionDesc>
        <VagasPorTurma turmas={turmas} />
      </Card>
    </div>
  );
}

import { useState } from "react";
import { CheckCircle2, ClipboardList, Clock, DoorOpen, Layers } from "lucide-react";
import { formatarSenha } from "../../lib/format";
import { STATUS_INFO, STATUS_ORDER, descricaoTurma } from "../../lib/labels";
import VagasPorTurma from "./VagasPorTurma";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow } from "../../types";
import { Badge, Card, EmptyState, SectionDesc, SectionTitle } from "../ui";
import StatCard from "./StatCard";
import StatusControl from "./StatusControl";

const ESCONDER_RESOLVIDAS_KEY = "seice_admin_esconder_resolvidas";

export default function OverviewTab({
  turmas,
  preMatriculas,
  posicoesEspera,
  onStatusChange,
  onVerTodas,
}: {
  turmas: TurmaAdminRow[];
  preMatriculas: PreMatriculaAdminRow[];
  posicoesEspera: Map<string, number>;
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

  // chavinha: liga (padrão) esconde quem já deixou de ser pendente dessa
  // lista — desliga e a lista passa a mostrar as mais recentes de qualquer
  // status, sem sumir ninguém daqui. Fica salvo no navegador da secretaria.
  const [esconderResolvidas, setEsconderResolvidas] = useState(() => {
    try {
      return localStorage.getItem(ESCONDER_RESOLVIDAS_KEY) !== "false";
    } catch {
      return true;
    }
  });

  function alternarEsconderResolvidas() {
    setEsconderResolvidas((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem(ESCONDER_RESOLVIDAS_KEY, String(novo));
      } catch {
        // ambiente sem localStorage (ex.: aba anônima bloqueada) — só não persiste
      }
      return novo;
    });
  }

  const pendentesRecentes = (esconderResolvidas ? preMatriculas.filter((p) => p.status === "pendente") : preMatriculas)
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
            <SectionTitle>{esconderResolvidas ? "Intenções pendentes" : "Intenções recentes"}</SectionTitle>
            <SectionDesc>
              {esconderResolvidas
                ? "As mais recentes, para agilizar o contato — mude o status sem sair daqui."
                : "As mais recentes de qualquer status — nada some daqui, mude o status sem sair da tela."}
            </SectionDesc>
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

        <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-seice-border bg-seice-panel px-3.5 py-2.5">
          <span className="text-[14px] font-medium text-seice-soft">
            Esconder daqui quem já deixou de ser pendente
          </span>
          <span
            role="switch"
            aria-checked={esconderResolvidas}
            onClick={alternarEsconderResolvidas}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              esconderResolvidas ? "bg-seice-gold" : "bg-seice-chip"
            }`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                esconderResolvidas ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
        </label>

        {pendentesRecentes.length === 0 ? (
          <EmptyState emoji="✅">
            {esconderResolvidas ? "Nenhuma intenção pendente no momento." : "Nenhuma intenção cadastrada ainda."}
          </EmptyState>
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
                          {posicoesEspera.has(r.id) ? `${posicoesEspera.get(r.id)}ª espera` : "Espera"}
                        </Badge>
                      )}
                      {!esconderResolvidas && r.status !== "pendente" && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_INFO[r.status].badge}`}
                        >
                          {STATUS_INFO[r.status].label}
                        </span>
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

import { maskCPF, maskPhone, turnoLabel } from "./format";
import { unidadeNome } from "./labels";
import type { PreMatriculaAdminRow } from "../types";

export function exportarCSV(registros: PreMatriculaAdminRow[], sufixo: string) {
  const header = [
    "Recebido em",
    "Unidade",
    "Aluno",
    "Série",
    "Turma",
    "Turno",
    "Curso",
    "Responsável",
    "CPF",
    "Telefone 1",
    "Telefone 2",
    "E-mail",
    "Status",
  ];
  const lines = [header.join(";")];

  for (const r of registros) {
    const t = r.turmas;
    lines.push(
      [
        new Date(r.criado_em).toLocaleString("pt-BR"),
        unidadeNome(r.unidade_id),
        r.aluno_nome,
        t?.serie ?? "",
        t?.codigo ?? "",
        turnoLabel(t?.turno ?? ""),
        t?.curso ?? "",
        r.responsavel_nome,
        maskCPF(r.responsavel_cpf),
        maskPhone(r.telefone1),
        r.telefone2 ? maskPhone(r.telefone2) : "",
        r.email ?? "",
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    );
  }

  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `intencoes-matricula-seice-${sufixo}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

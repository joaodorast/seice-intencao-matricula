import * as XLSX from "xlsx";
import { NIVEL_LABELS } from "../config";
import { formatarSenha, maskPhone, turnoLabel } from "./format";
import { ordenarTurmas, unidadeNome } from "./labels";
import { vagaStatus } from "./vagas";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../types";

// Carregada só quando alguém clica em "Exportar" no painel — a biblioteca xlsx
// não pesa no carregamento normal do site nem do painel.

function baixarWorkbook(wb: XLSX.WorkBook, nomeArquivo: string) {
  XLSX.writeFile(wb, nomeArquivo, { compression: true });
}

function linhasIntencoes(registros: PreMatriculaAdminRow[]) {
  return registros.map((r) => ({
    Senha: formatarSenha(r.numero_senha),
    "Recebido em": new Date(r.criado_em).toLocaleString("pt-BR"),
    Unidade: unidadeNome(r.unidade_id),
    Aluno: r.aluno_nome,
    Série: r.turmas?.serie ?? "",
    Turma: r.turmas?.codigo ?? "",
    Turno: turnoLabel(r.turmas?.turno ?? ""),
    Curso: r.turmas?.curso ?? "",
    Responsável: r.responsavel_nome,
    "Telefone 1": maskPhone(r.telefone1),
    "Telefone 2": r.telefone2 ? maskPhone(r.telefone2) : "",
    "E-mail": r.email ?? "",
    Status: r.status,
    "Lista de espera": r.lista_espera ? "Sim" : "Não",
  }));
}

const LARGURAS_INTENCOES = [
  { wch: 8 },
  { wch: 16 },
  { wch: 16 },
  { wch: 24 },
  { wch: 10 },
  { wch: 8 },
  { wch: 8 },
  { wch: 14 },
  { wch: 24 },
  { wch: 15 },
  { wch: 16 },
  { wch: 16 },
  { wch: 22 },
  { wch: 12 },
  { wch: 14 },
];

export function exportarIntencoesExcel(registros: PreMatriculaAdminRow[], sufixo: string) {
  const ws = XLSX.utils.json_to_sheet(linhasIntencoes(registros));
  ws["!cols"] = LARGURAS_INTENCOES;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Intenções de matrícula");
  baixarWorkbook(wb, `intencoes-matricula-seice-${sufixo}-${Date.now()}.xlsx`);
}

export function exportarRelatorioCompletoExcel(turmas: TurmaAdminRow[]) {
  const wb = XLSX.utils.book_new();

  // vagas turma a turma (na ordem unidade → nível → série → turno)
  const turmasLinhas = ordenarTurmas(turmas).map((t) => {
    const preenchidas = Math.max(t.vagas_planilha - t.vagas_restantes, 0);
    return {
      Unidade: unidadeNome(t.unidade_id),
      Nível: NIVEL_LABELS[t.nivel] ?? t.nivel,
      Série: t.serie,
      Turma: t.codigo,
      Turno: turnoLabel(t.turno),
      Curso: t.curso ?? "",
      "Vagas ofertadas": t.vagas_planilha,
      Preenchidas: preenchidas,
      "Vagas livres": t.vagas_restantes,
      "Ocupação (%)": t.vagas_planilha > 0 ? Math.round((preenchidas / t.vagas_planilha) * 100) : 0,
      Situação: t.vagas_planilha === 0 ? "Sem oferta" : vagaStatus(t.vagas_restantes, t.vagas_planilha).label,
    };
  });
  const wsTurmas = XLSX.utils.json_to_sheet(turmasLinhas);
  wsTurmas["!cols"] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 13 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTurmas, "Vagas por turma");

  baixarWorkbook(wb, `vagas-por-turma-seice-${Date.now()}.xlsx`);
}

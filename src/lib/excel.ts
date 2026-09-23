import * as XLSX from "xlsx";
import { NIVEL_LABELS } from "../config";
import { calcularPosicoesEspera, formatarSenha, maskPhone, turnoLabel } from "./format";
import { STATUS_INFO, ordenarTurmas, unidadeNome } from "./labels";
import { vagaStatus } from "./vagas";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../types";

// Carregada só quando alguém clica em "Exportar" no painel — a biblioteca xlsx
// não pesa no carregamento normal do site nem do painel.

function baixarWorkbook(wb: XLSX.WorkBook, nomeArquivo: string) {
  XLSX.writeFile(wb, nomeArquivo, { compression: true });
}

function linhasIntencoes(registros: PreMatriculaAdminRow[]) {
  // senha (número de atendimento) e posição na lista de espera são contagens
  // diferentes — a senha é sequencial pra todo mundo, a posição é só entre
  // quem está esperando vaga naquela turma. Por isso "Manuela" pode ser
  // senha 21 e, ao mesmo tempo, 1ª da lista de espera da turma dela.
  const posicoesEspera = calcularPosicoesEspera(registros);
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
    "Posição na lista de espera": posicoesEspera.has(r.id) ? `${posicoesEspera.get(r.id)}ª` : "",
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
  { wch: 20 },
];

export function exportarIntencoesExcel(registros: PreMatriculaAdminRow[], sufixo: string) {
  const ws = XLSX.utils.json_to_sheet(linhasIntencoes(registros));
  ws["!cols"] = LARGURAS_INTENCOES;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Intenções de matrícula");
  baixarWorkbook(wb, `intencoes-matricula-seice-${sufixo}-${Date.now()}.xlsx`);
}

/**
 * Relatório detalhado: uma linha por aluno, mas com a ocupação da turma dele
 * (ofertadas/preenchidas/livres) repetida em cada linha — assim dá pra
 * filtrar/ordenar por turma no Excel e já ver a ocupação junto do aluno,
 * sem precisar cruzar com a aba de "Vagas por turma".
 */
export function exportarRelatorioDetalhadoExcel(turmas: TurmaAdminRow[], preMatriculas: PreMatriculaAdminRow[]) {
  const porTurma = new Map<string, PreMatriculaAdminRow[]>();
  for (const p of preMatriculas) {
    if (!porTurma.has(p.turma_id)) porTurma.set(p.turma_id, []);
    porTurma.get(p.turma_id)!.push(p);
  }
  const posicoesEspera = calcularPosicoesEspera(preMatriculas);

  const linhas: Record<string, string | number>[] = [];
  for (const t of ordenarTurmas(turmas)) {
    const preenchidas = Math.max(t.vagas_planilha - t.vagas_restantes, 0);
    const base = {
      Unidade: unidadeNome(t.unidade_id),
      Nível: NIVEL_LABELS[t.nivel] ?? t.nivel,
      Série: t.serie,
      Turma: t.codigo,
      Turno: turnoLabel(t.turno),
      "Vagas ofertadas": t.vagas_planilha,
      "Vagas ocupadas": preenchidas,
      "Vagas livres": t.vagas_restantes,
    };
    const alunos = porTurma.get(t.id) ?? [];
    if (alunos.length === 0) {
      linhas.push({
        ...base,
        Senha: "",
        Aluno: "",
        Responsável: "",
        Telefone: "",
        Status: "",
        "Lista de espera": "",
        "Posição na lista de espera": "",
      });
      continue;
    }
    // ordem de ligação: primeiro quem tem vaga garantida (por senha), depois
    // quem está na lista de espera (por posição)
    const intencoes = alunos.filter((p) => !p.lista_espera).sort((a, b) => a.numero_senha - b.numero_senha);
    const espera = alunos
      .filter((p) => p.lista_espera)
      .sort((a, b) => (posicoesEspera.get(a.id) ?? 0) - (posicoesEspera.get(b.id) ?? 0));
    for (const p of [...intencoes, ...espera]) {
      linhas.push({
        ...base,
        Senha: formatarSenha(p.numero_senha),
        Aluno: p.aluno_nome,
        Responsável: p.responsavel_nome,
        Telefone: maskPhone(p.telefone1),
        Status: STATUS_INFO[p.status]?.label ?? p.status,
        "Lista de espera": p.lista_espera ? "Sim" : "Não",
        "Posição na lista de espera": posicoesEspera.has(p.id) ? `${posicoesEspera.get(p.id)}ª` : "",
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(linhas);
  ws["!cols"] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 15 },
    { wch: 14 },
    { wch: 12 },
    { wch: 8 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório detalhado");
  baixarWorkbook(wb, `relatorio-detalhado-seice-${Date.now()}.xlsx`);
}

/**
 * Lista única, sem separar por turma — ordenada só pela senha, misturando
 * turmas de propósito. É a ordem que a secretaria usa pra ligar: não
 * importa a turma, importa quem chegou primeiro.
 */
export function exportarPorSenhaExcel(preMatriculas: PreMatriculaAdminRow[], sufixo: string) {
  const posicoesEspera = calcularPosicoesEspera(preMatriculas);
  const linhas = [...preMatriculas]
    .sort((a, b) => a.numero_senha - b.numero_senha)
    .map((p) => ({
      Senha: formatarSenha(p.numero_senha),
      Situação: p.lista_espera ? `${posicoesEspera.get(p.id)}ª lista de espera` : "Intenção de matrícula",
      Unidade: unidadeNome(p.unidade_id),
      Turma: p.turmas ? `${p.turmas.serie} · Turma ${p.turmas.codigo} (${turnoLabel(p.turmas.turno)})` : "—",
      Aluno: p.aluno_nome,
      Telefone: maskPhone(p.telefone1),
      Responsável: p.responsavel_nome,
    }));

  const ws = XLSX.utils.json_to_sheet(linhas);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ordenado por senha");
  baixarWorkbook(wb, `ordenado-por-senha-seice-${sufixo}-${Date.now()}.xlsx`);
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

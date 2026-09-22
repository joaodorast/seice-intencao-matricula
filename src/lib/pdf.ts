import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NIVEL_LABELS } from "../config";
import logoUrl from "../assets/seice-logo.png";
import { calcularPosicoesEspera, formatarSenha, maskPhone, turnoLabel } from "./format";
import { STATUS_INFO, ordenarTurmas, unidadeNome } from "./labels";
import { vagaStatus } from "./vagas";
import type { PreMatriculaAdminRow, TurmaAdminRow } from "../types";

// Carregado sob demanda (import dinâmico nos componentes): jsPDF e a tabela não
// pesam no carregamento normal do painel.

type RGB = [number, number, number];

const GRAFITE: RGB = [36, 38, 43];
const GRAFITE_CLARO: RGB = [71, 75, 83];
const DOURADO: RGB = [255, 200, 0];
const CINZA_TEXTO: RGB = [90, 96, 106];
const CINZA_ZEBRA: RGB = [244, 245, 247];
const BRANCO: RGB = [255, 255, 255];

const MARGEM = 12;

/** A logo entra como imagem no cabeçalho; se falhar, o PDF sai sem ela. */
let logoCache: string | null | undefined;
async function carregarLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const resposta = await fetch(logoUrl);
    const blob = await resposta.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result as string);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch {
    logoCache = null;
  }
  return logoCache;
}

function cabecalho(doc: jsPDF, logo: string | null, titulo: string, escopo: string, resumo: string) {
  const largura = doc.internal.pageSize.getWidth();

  doc.setFillColor(...GRAFITE);
  doc.rect(0, 0, largura, 30, "F");
  doc.setFillColor(...DOURADO);
  doc.rect(0, 30, largura, 1.2, "F");

  if (logo) {
    // proporção original da logo: 672 x 247
    // o apelido faz a imagem ser embutida uma vez só, mesmo repetida em todas as páginas
    doc.addImage(logo, "PNG", MARGEM, 8, 41, 15, "logo-seice", "FAST");
  } else {
    doc.setTextColor(...BRANCO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("COLÉGIO SEICE", MARGEM, 18);
  }

  doc.setTextColor(...BRANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titulo, largura - MARGEM, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 200, 0);
  doc.text(escopo, largura - MARGEM, 20.5, { align: "right" });

  doc.setTextColor(200, 205, 212);
  doc.setFontSize(8.5);
  doc.text(resumo, largura - MARGEM, 26, { align: "right" });
}

/** Caixas de número no topo da página (ofertadas, preenchidas, etc.). */
function indicadores(doc: jsPDF, y: number, itens: { rotulo: string; valor: string }[]) {
  const largura = doc.internal.pageSize.getWidth();
  const disponivel = largura - MARGEM * 2;
  const gap = 4;
  const largCaixa = (disponivel - gap * (itens.length - 1)) / itens.length;

  itens.forEach((item, i) => {
    const x = MARGEM + i * (largCaixa + gap);
    doc.setFillColor(...CINZA_ZEBRA);
    doc.roundedRect(x, y, largCaixa, 16, 2, 2, "F");
    doc.setFillColor(...DOURADO);
    doc.rect(x, y, 1.6, 16, "F");

    doc.setTextColor(...CINZA_TEXTO);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(item.rotulo.toUpperCase(), x + 5, y + 6);

    doc.setTextColor(...GRAFITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(item.valor, x + 5, y + 13);
  });

  return y + 16;
}

function rodape(doc: jsPDF, escopo: string) {
  const paginas = doc.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    const altura = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...CINZA_ZEBRA);
    doc.setLineWidth(0.4);
    doc.line(MARGEM, altura - 12, largura - MARGEM, altura - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CINZA_TEXTO);
    doc.text(`Colégio SEICE · ${escopo} · gerado em ${new Date().toLocaleString("pt-BR")}`, MARGEM, altura - 7);
    doc.text(`Página ${i} de ${paginas}`, largura - MARGEM, altura - 7, { align: "right" });
  }
}

function estiloTabela() {
  return {
    theme: "grid" as const,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.6,
      textColor: GRAFITE_CLARO,
      lineColor: [226, 229, 234] as RGB,
      lineWidth: 0.2,
    },
    headStyles: { fillColor: GRAFITE, textColor: BRANCO, fontStyle: "bold" as const, fontSize: 8.5 },
    alternateRowStyles: { fillColor: CINZA_ZEBRA },
    margin: { left: MARGEM, right: MARGEM },
  };
}

function linhasIntencoes(registros: PreMatriculaAdminRow[]) {
  // senha (sequencial geral) e posição na lista de espera (só entre quem
  // está esperando vaga naquela turma) são contagens diferentes — por isso
  // alguém pode ter uma senha "alta" e ainda ser a 1ª da lista de espera.
  const posicoesEspera = calcularPosicoesEspera(registros);
  return registros.map((r) => [
    formatarSenha(r.numero_senha),
    new Date(r.criado_em).toLocaleString("pt-BR"),
    unidadeNome(r.unidade_id),
    r.aluno_nome,
    r.turmas ? `${r.turmas.serie} · ${r.turmas.codigo} · ${turnoLabel(r.turmas.turno)}` : "-",
    r.responsavel_nome,
    maskPhone(r.telefone1),
    STATUS_INFO[r.status]?.label ?? r.status,
    posicoesEspera.has(r.id) ? `${posicoesEspera.get(r.id)}ª` : r.lista_espera ? "Sim" : "Não",
  ]);
}

export async function exportarIntencoesPDF(
  registros: PreMatriculaAdminRow[],
  sufixo: string,
  escopo = "Todas as unidades"
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();

  const porStatus = (status: string) => registros.filter((r) => r.status === status).length;

  cabecalho(doc, logo, "Intenções de matrícula 2027", escopo, `${registros.length} registro(s)`);
  const y = indicadores(doc, 38, [
    { rotulo: "Total", valor: String(registros.length) },
    { rotulo: "Pendentes", valor: String(porStatus("pendente")) },
    { rotulo: "Contatados", valor: String(porStatus("contatado")) },
    { rotulo: "Matriculados", valor: String(porStatus("matriculado")) },
    { rotulo: "Cancelados", valor: String(porStatus("cancelado")) },
  ]);

  autoTable(doc, {
    ...estiloTabela(),
    startY: y + 6,
    head: [["Senha", "Recebido em", "Unidade", "Aluno", "Turma", "Responsável", "Telefone", "Status", "Posição na espera"]],
    body: linhasIntencoes(registros),
  });

  rodape(doc, escopo);
  doc.save(`intencoes-matricula-seice-${sufixo}-${Date.now()}.pdf`);
}

/**
 * Relatório detalhado: página 1 é a mesma tabela de ocupação do relatório
 * de turmas (ofertadas/preenchidas/livres por turma); página 2 é a lista de
 * contato — turma, aluno, telefone e responsável, agrupados por turma —
 * pronta pra Priscilla imprimir e distribuir pras atendentes ligarem. Sem
 * status (não faz sentido mostrar "Matriculado" numa lista feita pra
 * organizar quem ainda precisa ser contatado).
 */
export async function exportarRelatorioDetalhadoPDF(
  turmas: TurmaAdminRow[],
  preMatriculas: PreMatriculaAdminRow[],
  escopo = "Todas as unidades"
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();

  const porTurma = new Map<string, PreMatriculaAdminRow[]>();
  for (const p of preMatriculas) {
    if (!porTurma.has(p.turma_id)) porTurma.set(p.turma_id, []);
    porTurma.get(p.turma_id)!.push(p);
  }

  const ofertadas = turmas.reduce((acc, t) => acc + t.vagas_planilha, 0);
  const livres = turmas.reduce((acc, t) => acc + t.vagas_restantes, 0);
  const preenchidas = ofertadas - livres;

  // página 1 — ocupação por turma (igual ao relatório de turmas)
  cabecalho(doc, logo, "Relatório detalhado 2027 — Vagas por turma", escopo, `${turmas.length} turma(s)`);
  const y1 = indicadores(doc, 38, [
    { rotulo: "Turmas", valor: String(turmas.length) },
    { rotulo: "Vagas ofertadas", valor: String(ofertadas) },
    { rotulo: "Preenchidas", valor: String(preenchidas) },
    { rotulo: "Livres", valor: String(livres) },
  ]);

  type CelulaTurma = string | number | { content: string; colSpan: number; styles: Record<string, unknown> };
  const corpoTurmas: CelulaTurma[][] = [];
  let grupoAtual = "";
  for (const t of ordenarTurmas(turmas)) {
    const grupo = `${unidadeNome(t.unidade_id)}  ·  ${NIVEL_LABELS[t.nivel] ?? t.nivel}`;
    if (grupo !== grupoAtual) {
      corpoTurmas.push([{ content: grupo, colSpan: 8, styles: { fillColor: [255, 244, 204], textColor: GRAFITE, fontStyle: "bold" } }]);
      grupoAtual = grupo;
    }
    const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
    corpoTurmas.push([
      t.serie,
      t.codigo,
      turnoLabel(t.turno),
      t.curso || "-",
      t.vagas_planilha,
      Math.max(t.vagas_planilha - t.vagas_restantes, 0),
      t.vagas_restantes,
      t.vagas_planilha === 0 ? "Sem oferta" : status.label,
    ]);
  }

  autoTable(doc, {
    ...estiloTabela(),
    startY: y1 + 6,
    head: [["Série", "Turma", "Turno", "Curso", "Ofertadas", "Preenchidas", "Livres", "Situação"]],
    body: corpoTurmas,
    columnStyles: {
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center", fontStyle: "bold", textColor: GRAFITE },
    },
  });

  // páginas de contato: uma só com intenções de matrícula normais, outra só
  // com lista de espera — separadas de propósito, pra Priscilla imprimir e
  // distribuir cada uma pra quem for ligar (não fica tudo misturado)
  type CelulaContato =
    | string
    | number
    | { content: string; colSpan: number; styles: Record<string, unknown> };
  const posicoesEsperaContatos = calcularPosicoesEspera(preMatriculas);

  function paginaDeContatos(
    titulo: string,
    cabecalhos: string[],
    porTurmaFiltrado: (alunos: PreMatriculaAdminRow[]) => PreMatriculaAdminRow[],
    colunasExtras: (p: PreMatriculaAdminRow) => CelulaContato[]
  ) {
    const corpo: CelulaContato[][] = [];
    let totalAlunos = 0;
    for (const t of ordenarTurmas(turmas)) {
      const turmaNome = `${unidadeNome(t.unidade_id)} · ${t.serie} · Turma ${t.codigo} (${turnoLabel(t.turno)})${
        t.curso ? " · " + t.curso : ""
      }`;
      const alunos = porTurmaFiltrado(porTurma.get(t.id) ?? []);
      if (alunos.length === 0) continue;
      totalAlunos += alunos.length;
      corpo.push([
        {
          content: turmaNome,
          colSpan: cabecalhos.length,
          styles: { fillColor: [255, 244, 204], textColor: GRAFITE, fontStyle: "bold" },
        },
      ]);
      for (const p of alunos) {
        corpo.push([...colunasExtras(p), turmaNome, p.aluno_nome, maskPhone(p.telefone1), p.responsavel_nome]);
      }
    }

    doc.addPage();
    cabecalho(doc, logo, `Relatório detalhado 2027 — ${titulo}`, escopo, `${totalAlunos} aluno(s)`);
    autoTable(doc, {
      ...estiloTabela(),
      startY: 38,
      head: [cabecalhos],
      body: corpo,
    });
  }

  // página 2 — só intenções de matrícula normais (vaga garantida), por senha
  paginaDeContatos(
    "Contatos — Intenção de matrícula",
    ["Senha", "Turma", "Aluno", "Telefone", "Responsável"],
    (alunos) => alunos.filter((p) => !p.lista_espera).sort((a, b) => a.numero_senha - b.numero_senha),
    (p) => [formatarSenha(p.numero_senha)]
  );

  // página 3 — só lista de espera, por posição (quem chegou primeiro no topo)
  paginaDeContatos(
    "Contatos — Lista de espera",
    ["Posição", "Senha", "Turma", "Aluno", "Telefone", "Responsável"],
    (alunos) =>
      alunos
        .filter((p) => p.lista_espera)
        .sort((a, b) => (posicoesEsperaContatos.get(a.id) ?? 0) - (posicoesEsperaContatos.get(b.id) ?? 0)),
    (p) => [`${posicoesEsperaContatos.get(p.id)}ª`, formatarSenha(p.numero_senha)]
  );

  rodape(doc, escopo);
  doc.save(`relatorio-detalhado-seice-${Date.now()}.pdf`);
}

export async function exportarRelatorioCompletoPDF(turmas: TurmaAdminRow[], escopo = "Todas as unidades") {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();

  const ofertadas = turmas.reduce((acc, t) => acc + t.vagas_planilha, 0);
  const livres = turmas.reduce((acc, t) => acc + t.vagas_restantes, 0);
  const preenchidas = ofertadas - livres;
  const ocupacao = ofertadas > 0 ? Math.round((preenchidas / ofertadas) * 100) : 0;

  cabecalho(doc, logo, "Vagas por turma 2027", escopo, `${turmas.length} turma(s)`);
  const y = indicadores(doc, 38, [
    { rotulo: "Turmas", valor: String(turmas.length) },
    { rotulo: "Vagas ofertadas", valor: String(ofertadas) },
    { rotulo: "Preenchidas", valor: String(preenchidas) },
    { rotulo: "Livres", valor: String(livres) },
    { rotulo: "Ocupação", valor: `${ocupacao}%` },
  ]);

  // uma linha por turma, com uma faixa de título a cada troca de unidade/nível
  type Celula = string | number | { content: string; colSpan: number; styles: { fillColor: RGB; textColor: RGB; fontStyle: "bold" } };
  const corpo: Celula[][] = [];
  let grupoAtual = "";
  for (const t of ordenarTurmas(turmas)) {
    const grupo = `${unidadeNome(t.unidade_id)}  ·  ${NIVEL_LABELS[t.nivel] ?? t.nivel}`;
    if (grupo !== grupoAtual) {
      corpo.push([{ content: grupo, colSpan: 8, styles: { fillColor: [255, 244, 204], textColor: GRAFITE, fontStyle: "bold" } }]);
      grupoAtual = grupo;
    }
    const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
    corpo.push([
      t.serie,
      t.codigo,
      turnoLabel(t.turno),
      t.curso || "-",
      t.vagas_planilha,
      Math.max(t.vagas_planilha - t.vagas_restantes, 0),
      t.vagas_restantes,
      t.vagas_planilha === 0 ? "Sem oferta" : status.label,
    ]);
  }

  autoTable(doc, {
    ...estiloTabela(),
    startY: y + 6,
    head: [["Série", "Turma", "Turno", "Curso", "Ofertadas", "Preenchidas", "Livres", "Situação"]],
    body: corpo,
    columnStyles: {
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center", fontStyle: "bold", textColor: GRAFITE },
    },
    didParseCell: (dados) => {
      if (dados.section !== "body" || dados.column.index !== 7 || typeof dados.cell.raw !== "string") return;
      const texto = dados.cell.raw;
      if (texto.startsWith("Últim") || texto === "Sem vagas") dados.cell.styles.textColor = [185, 28, 28];
      else if (texto === "Vagas limitadas") dados.cell.styles.textColor = [161, 98, 7];
      else if (texto === "Vagas abertas") dados.cell.styles.textColor = [21, 128, 61];
      dados.cell.styles.fontStyle = "bold";
    },
  });

  rodape(doc, escopo);
  doc.save(`vagas-por-turma-seice-${Date.now()}.pdf`);
}

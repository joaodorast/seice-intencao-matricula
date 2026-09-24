import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NIVEL_LABELS } from "../config";
import logoUrl from "../assets/seice-logo.png";
import { calcularPosicoesEspera, formatarSenha, maskPhone, turnoLabel } from "./format";
import { descricaoFiltroStatus, STATUS_INFO, ordenarTurmas, unidadeNome } from "./labels";
import { vagaStatus } from "./vagas";
import type { PreMatriculaAdminRow, StatusPreMatricula, TurmaAdminRow } from "../types";

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
    doc.setFontSize(17);
    doc.text("COLÉGIO SEICE", MARGEM, 18);
  }

  doc.setTextColor(...BRANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(titulo, largura - MARGEM, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 200, 0);
  doc.text(escopo, largura - MARGEM, 20.5, { align: "right" });

  doc.setTextColor(200, 205, 212);
  doc.setFontSize(9.5);
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
    doc.roundedRect(x, y, largCaixa, 19, 2, 2, "F");
    doc.setFillColor(...DOURADO);
    doc.rect(x, y, 1.6, 19, "F");

    doc.setTextColor(...CINZA_TEXTO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(item.rotulo.toUpperCase(), x + 5, y + 7);

    doc.setTextColor(...GRAFITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(item.valor, x + 5, y + 15.5);
  });

  return y + 19;
}

/**
 * Frase curta e simples embaixo dos números do topo, explicando em
 * português bem direto o que a tabela abaixo mostra e como usar — pra
 * qualquer pessoa que abrir o PDF entender sem precisar perguntar pra
 * ninguém. Devolve a posição Y onde a tabela deve começar.
 */
function legenda(doc: jsPDF, y: number, texto: string): number {
  const largura = doc.internal.pageSize.getWidth() - MARGEM * 2;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...CINZA_TEXTO);
  const linhas = doc.splitTextToSize(texto, largura) as string[];
  doc.text(linhas, MARGEM, y);
  return y + linhas.length * 5 + 3;
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
    doc.setFontSize(9);
    doc.setTextColor(...CINZA_TEXTO);
    doc.text(`Colégio SEICE · ${escopo} · gerado em ${new Date().toLocaleString("pt-BR")}`, MARGEM, altura - 7);
    doc.text(`Página ${i} de ${paginas}`, largura - MARGEM, altura - 7, { align: "right" });
  }
}

// cor de fundo + cor do texto de cada status — assim dá pra reconhecer o
// status de bate-olho, sem nem precisar ler a palavra (a mesma lógica de
// "semáforo" que o painel já usa: cinza é neutro, azul é "em andamento",
// verde é "resolvido bem", vermelho é "não vai acontecer")
const COR_STATUS: Record<StatusPreMatricula, { fundo: RGB; texto: RGB }> = {
  pendente: { fundo: [229, 231, 235], texto: [55, 65, 81] },
  contatado: { fundo: [219, 234, 254], texto: [29, 78, 216] },
  matriculado: { fundo: [220, 252, 231], texto: [21, 128, 61] },
  cancelado: { fundo: [254, 226, 226], texto: [185, 28, 28] },
};

/**
 * Legendinha visual com quadradinhos coloridos + nome de cada status, tipo
 * as legendas de mapa — dá pra entender o significado das cores da tabela
 * só olhando, sem precisar ler uma linha de texto explicando. Devolve a
 * posição Y onde a tabela deve começar.
 */
function legendaCores(doc: jsPDF, y: number): number {
  const itens: { rotulo: string; cor: RGB }[] = [
    { rotulo: "Pendente", cor: COR_STATUS.pendente.texto },
    { rotulo: "Contatado", cor: COR_STATUS.contatado.texto },
    { rotulo: "Matriculado", cor: COR_STATUS.matriculado.texto },
    { rotulo: "Cancelado", cor: COR_STATUS.cancelado.texto },
  ];
  let x = MARGEM;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  for (const item of itens) {
    doc.setFillColor(...item.cor);
    doc.roundedRect(x, y - 3.2, 3.5, 3.5, 0.7, 0.7, "F");
    doc.setTextColor(...item.cor);
    doc.text(item.rotulo, x + 5, y);
    x += 5 + doc.getTextWidth(item.rotulo) + 8;
  }
  return y + 8;
}

/** Célula de tabela com o status já colorido (fundo + texto), pronta pra
 *  entrar direto no corpo de uma autoTable. */
function celulaStatus(status: string): { content: string; styles: Record<string, unknown> } {
  const cor = COR_STATUS[status as StatusPreMatricula];
  const rotulo = STATUS_INFO[status as StatusPreMatricula]?.label ?? status;
  if (!cor) return { content: rotulo, styles: {} };
  return {
    content: rotulo,
    styles: { fillColor: cor.fundo, textColor: cor.texto, fontStyle: "bold", halign: "center" },
  };
}

function estiloTabela() {
  return {
    theme: "grid" as const,
    styles: {
      fontSize: 10,
      cellPadding: 3.2,
      textColor: GRAFITE_CLARO,
      lineColor: [226, 229, 234] as RGB,
      lineWidth: 0.2,
    },
    headStyles: { fillColor: GRAFITE, textColor: BRANCO, fontStyle: "bold" as const, fontSize: 10 },
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
    celulaStatus(r.status),
    posicoesEspera.has(r.id) ? `${posicoesEspera.get(r.id)}ª` : "— (já tem vaga)",
  ]);
}

export async function exportarIntencoesPDF(
  registros: PreMatriculaAdminRow[],
  sufixo: string,
  escopo = "Todas as unidades",
  filtroStatus: StatusPreMatricula[] = []
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();

  const porStatus = (status: string) => registros.filter((r) => r.status === status).length;

  const resumoFiltro = descricaoFiltroStatus(filtroStatus);
  cabecalho(
    doc,
    logo,
    "Intenções de matrícula 2027",
    escopo,
    resumoFiltro ? `${registros.length} registro(s) · ${resumoFiltro}` : `${registros.length} registro(s)`
  );
  const y = indicadores(doc, 38, [
    { rotulo: "Total", valor: String(registros.length) },
    { rotulo: "Pendentes", valor: String(porStatus("pendente")) },
    { rotulo: "Contatados", valor: String(porStatus("contatado")) },
    { rotulo: "Matriculados", valor: String(porStatus("matriculado")) },
    { rotulo: "Cancelados", valor: String(porStatus("cancelado")) },
  ]);
  const y2 = legenda(
    doc,
    y + 6,
    "Cada linha é um pedido de matrícula que chegou. \"Status\" mostra se a secretaria já ligou (Contatado), " +
      "se a matrícula foi confirmada (Matriculado) ou se ainda falta ligar (Pendente). A última coluna mostra " +
      "a posição na fila de espera de quem não tem vaga garantida (\"—\" para quem já tem vaga)."
  );
  const y2b = legendaCores(doc, y2);

  autoTable(doc, {
    ...estiloTabela(),
    startY: y2b,
    head: [["Senha", "Recebido em", "Unidade", "Aluno", "Turma", "Responsável", "Telefone", "Status", "Posição na fila de espera"]],
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
  escopo = "Todas as unidades",
  filtroStatus: StatusPreMatricula[] = []
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();

  // o filtro de status (pendente/contatado/matriculado/cancelado) é escolhido
  // na tela de exportação e já vem aplicado aqui — a página 1, de ocupação
  // por turma, não usa esse array, então não é afetada por ele

  const porTurma = new Map<string, PreMatriculaAdminRow[]>();
  for (const p of preMatriculas) {
    if (!porTurma.has(p.turma_id)) porTurma.set(p.turma_id, []);
    porTurma.get(p.turma_id)!.push(p);
  }
  // uma turma com "Sem oferta" (0 vagas cadastradas) ainda pode ter gente na
  // lista de espera — o formulário público aceita a inscrição mesmo sem
  // vaga nenhuma. Contar isso aqui também evita o estranhamento de ver
  // "Sem oferta" numa turma que aparece com gente pra contatar na página 2.
  const esperaPorTurma = new Map<string, number>();
  for (const p of preMatriculas) {
    if (p.lista_espera) esperaPorTurma.set(p.turma_id, (esperaPorTurma.get(p.turma_id) ?? 0) + 1);
  }

  const ofertadas = turmas.reduce((acc, t) => acc + t.vagas_planilha, 0);
  const livres = turmas.reduce((acc, t) => acc + t.vagas_restantes, 0);
  const preenchidas = ofertadas - livres;
  const totalEmEspera = preMatriculas.filter((p) => p.lista_espera).length;

  // página 1 — ocupação por turma (igual ao relatório de turmas)
  cabecalho(doc, logo, "Relatório detalhado 2027 — Vagas por turma", escopo, `${turmas.length} turma(s)`);
  const y1 = indicadores(doc, 38, [
    { rotulo: "Turmas", valor: String(turmas.length) },
    { rotulo: "Vagas ofertadas", valor: String(ofertadas) },
    { rotulo: "Preenchidas", valor: String(preenchidas) },
    { rotulo: "Livres", valor: String(livres) },
    { rotulo: "Em espera", valor: String(totalEmEspera) },
  ]);
  const y1b = legenda(
    doc,
    y1 + 6,
    "Esta página mostra uma linha por turma: \"Ofertadas\" é quantas vagas a turma tem no total, \"Preenchidas\" " +
      "é quantas já foram usadas, \"Livres\" é quanto ainda sobra. \"Espera\" mostra quantas famílias estão " +
      "esperando uma vaga surgir nessa turma — pode ter gente esperando mesmo numa turma \"Sem oferta\" (0 " +
      "vagas), porque o formulário aceita inscrição de espera mesmo sem vaga nenhuma cadastrada."
  );

  type CelulaTurma = string | number | { content: string; colSpan?: number; styles: Record<string, unknown> };
  const corpoTurmas: CelulaTurma[][] = [];
  let grupoAtual = "";
  for (const t of ordenarTurmas(turmas)) {
    const grupo = `${unidadeNome(t.unidade_id)}  ·  ${NIVEL_LABELS[t.nivel] ?? t.nivel}`;
    if (grupo !== grupoAtual) {
      corpoTurmas.push([{ content: grupo, colSpan: 9, styles: { fillColor: [255, 244, 204], textColor: GRAFITE, fontStyle: "bold" } }]);
      grupoAtual = grupo;
    }
    const status = vagaStatus(t.vagas_restantes, t.vagas_planilha);
    const espera = esperaPorTurma.get(t.id) ?? 0;
    corpoTurmas.push([
      t.serie,
      t.codigo,
      turnoLabel(t.turno),
      t.curso || "-",
      t.vagas_planilha,
      Math.max(t.vagas_planilha - t.vagas_restantes, 0),
      t.vagas_restantes,
      espera > 0
        ? { content: String(espera), styles: { textColor: [161, 98, 7], fontStyle: "bold" } }
        : "0",
      t.vagas_planilha === 0
        ? espera > 0
          ? "Sem oferta · com espera"
          : "Sem oferta"
        : status.label,
    ]);
  }

  autoTable(doc, {
    ...estiloTabela(),
    startY: y1b,
    head: [["Série", "Turma", "Turno", "Curso", "Ofertadas", "Preenchidas", "Livres", "Espera", "Situação"]],
    body: corpoTurmas,
    columnStyles: {
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center", fontStyle: "bold", textColor: GRAFITE },
      7: { halign: "center" },
    },
  });

  // páginas de contato: uma só com intenções de matrícula normais, outra só
  // com lista de espera — separadas de propósito, pra Priscilla imprimir e
  // distribuir cada uma pra quem for ligar (não fica tudo misturado)
  type CelulaContato =
    | string
    | number
    | { content: string; colSpan?: number; styles: Record<string, unknown> };
  const posicoesEsperaContatos = calcularPosicoesEspera(preMatriculas);

  function paginaDeContatos(
    titulo: string,
    subtitulo: string,
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
        corpo.push([
          ...colunasExtras(p),
          turmaNome,
          p.aluno_nome,
          maskPhone(p.telefone1),
          p.responsavel_nome,
          celulaStatus(p.status),
        ]);
      }
    }

    doc.addPage();
    const resumoFiltro = descricaoFiltroStatus(filtroStatus);
    cabecalho(
      doc,
      logo,
      `Relatório detalhado 2027 — ${titulo}`,
      escopo,
      resumoFiltro ? `${totalAlunos} aluno(s) · ${resumoFiltro}` : `${totalAlunos} aluno(s)`
    );
    const yTabela = legenda(doc, 38, subtitulo);
    const yTabelaB = legendaCores(doc, yTabela);
    autoTable(doc, {
      ...estiloTabela(),
      startY: yTabelaB,
      head: [cabecalhos],
      body: corpo,
    });
  }

  // página 2 — só intenções de matrícula normais (vaga garantida), por senha
  paginaDeContatos(
    "Contatos — Intenção de matrícula",
    "Lista de quem JÁ TEM vaga garantida, separada por turma. É pra secretaria ligar confirmando a matrícula. " +
      "Dentro de cada turma, a ordem é por \"Senha\": quem chegou primeiro (senha menor) aparece primeiro.",
    ["Senha", "Turma", "Aluno", "Telefone", "Responsável", "Status"],
    (alunos) => alunos.filter((p) => !p.lista_espera).sort((a, b) => a.numero_senha - b.numero_senha),
    (p) => [formatarSenha(p.numero_senha)]
  );

  // página 3 — só lista de espera, por posição (quem chegou primeiro no topo)
  paginaDeContatos(
    "Contatos — Lista de espera",
    "Lista de quem AINDA NÃO TEM vaga e está esperando uma surgir, separada por turma. A coluna \"Posição\" " +
      "mostra a ordem de prioridade dentro daquela turma: \"1ª\" é o próximo a ser chamado se alguém desistir " +
      "daquela turma, \"2ª\" é o seguinte, e assim por diante.",
    ["Posição", "Senha", "Turma", "Aluno", "Telefone", "Responsável", "Status"],
    (alunos) =>
      alunos
        .filter((p) => p.lista_espera)
        .sort((a, b) => (posicoesEsperaContatos.get(a.id) ?? 0) - (posicoesEsperaContatos.get(b.id) ?? 0)),
    (p) => [`${posicoesEsperaContatos.get(p.id)}ª`, formatarSenha(p.numero_senha)]
  );

  rodape(doc, escopo);
  doc.save(`relatorio-detalhado-seice-${Date.now()}.pdf`);
}

/**
 * Reconta a senha do zero, só dentro da lista já filtrada por status (01,
 * 02, 03...) — sem isso, a senha "de verdade" fica cheia de buraco depois de
 * filtrar por tipo/status. Não mexe no registro real, só na numeração
 * mostrada aqui.
 */
function ordenarERenumerar(preMatriculas: PreMatriculaAdminRow[]): PreMatriculaAdminRow[] {
  return [...preMatriculas]
    .sort((a, b) => a.numero_senha - b.numero_senha)
    .map((p, i) => ({ ...p, numero_senha: i + 1 }));
}

function celulaTurma(p: PreMatriculaAdminRow): string {
  return p.turmas ? `${p.turmas.serie} · Turma ${p.turmas.codigo} (${turnoLabel(p.turmas.turno)})` : "—";
}

/**
 * Lista única, sem separar por turma — ordenada só pela senha (ordem de
 * chegada de todo mundo, misturando turmas diferentes de propósito, e
 * misturando intenção confirmada com lista de espera). É a ordem que a
 * secretaria usa pra ligar: não importa a turma, importa quem chegou
 * primeiro. Respeita o filtro de status escolhido na tela de exportação.
 */
export async function exportarPorSenhaPDF(
  preMatriculas: PreMatriculaAdminRow[],
  escopo = "Todas as unidades",
  filtroStatus: StatusPreMatricula[] = []
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();
  const posicoesEspera = calcularPosicoesEspera(preMatriculas);
  const ordenados = ordenarERenumerar(preMatriculas);

  const resumoFiltro = descricaoFiltroStatus(filtroStatus);
  cabecalho(
    doc,
    logo,
    "Ordenado por senha 2027",
    escopo,
    resumoFiltro ? `${ordenados.length} registro(s) · ${resumoFiltro}` : `${ordenados.length} registro(s)`
  );
  const yTabela = legenda(
    doc,
    38,
    "Lista única com TODO MUNDO junto, sem separar por turma — nem importa se tem vaga garantida ou está na " +
      "lista de espera. A ordem é de quem chegou primeiro pra quem chegou por último. Use essa lista pra ligar " +
      "em ordem, de cima pra baixo. A coluna \"Situação\" mostra se a pessoa já tem vaga (verde, \"Vaga " +
      "garantida\") ou está esperando (dourado, \"Lista de espera\", com a posição dela na turma)."
  );
  const yTabelaB = legendaCores(doc, yTabela);

  type Celula = string | { content: string; styles: Record<string, unknown> };
  const corpo: Celula[][] = ordenados.map((p) => [
    formatarSenha(p.numero_senha),
    p.lista_espera
      ? { content: `${posicoesEspera.get(p.id)}ª · Lista de espera`, styles: { textColor: [161, 98, 7], fontStyle: "bold" } }
      : { content: "Vaga garantida", styles: { textColor: [21, 128, 61], fontStyle: "bold" } },
    celulaTurma(p),
    p.aluno_nome,
    maskPhone(p.telefone1),
    p.responsavel_nome,
    celulaStatus(p.status),
  ]);

  autoTable(doc, {
    ...estiloTabela(),
    startY: yTabelaB,
    head: [["Senha", "Situação", "Turma", "Aluno", "Telefone", "Responsável", "Status"]],
    body: corpo,
  });

  rodape(doc, escopo);
  doc.save(`ordenado-por-senha-seice-${Date.now()}.pdf`);
}

/** Mesma ideia, mas só com quem tem vaga garantida (sem lista de espera) —
 *  senha recontada do zero, só dentro dessa lista. Respeita o filtro de
 *  status escolhido na tela de exportação. */
export async function exportarPorSenhaIntencoesPDF(
  preMatriculas: PreMatriculaAdminRow[],
  escopo = "Todas as unidades",
  filtroStatus: StatusPreMatricula[] = []
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();
  const ordenados = ordenarERenumerar(preMatriculas.filter((p) => !p.lista_espera));

  const resumoFiltro = descricaoFiltroStatus(filtroStatus);
  cabecalho(
    doc,
    logo,
    "Ordenado por senha 2027 — Intenções",
    escopo,
    resumoFiltro ? `${ordenados.length} registro(s) · ${resumoFiltro}` : `${ordenados.length} registro(s)`
  );
  const yTabelaInt = legenda(
    doc,
    38,
    "Todo mundo aqui JÁ TEM vaga garantida (ninguém está na lista de espera). A ordem é de quem chegou " +
      "primeiro pra quem chegou por último — comece a ligar de cima pra baixo. A coluna \"Status\" mostra se a " +
      "secretaria já ligou (Contatado) ou ainda precisa ligar (Pendente)."
  );
  const yTabelaIntB = legendaCores(doc, yTabelaInt);

  const corpo = ordenados.map((p) => [
    formatarSenha(p.numero_senha),
    celulaTurma(p),
    p.aluno_nome,
    maskPhone(p.telefone1),
    p.responsavel_nome,
    celulaStatus(p.status),
  ]);

  autoTable(doc, {
    ...estiloTabela(),
    startY: yTabelaIntB,
    head: [["Senha", "Turma", "Aluno", "Telefone", "Responsável", "Status"]],
    body: corpo,
  });

  rodape(doc, escopo);
  doc.save(`ordenado-por-senha-intencoes-seice-${Date.now()}.pdf`);
}

/** Mesma ideia, mas só com quem está na lista de espera — senha recontada do
 *  zero, só dentro dessa lista. A coluna "Posição" é a fila de espera de
 *  cada turma (diferente da senha, que é geral). Respeita o filtro de status
 *  escolhido na tela de exportação. */
export async function exportarPorSenhaListaEsperaPDF(
  preMatriculas: PreMatriculaAdminRow[],
  escopo = "Todas as unidades",
  filtroStatus: StatusPreMatricula[] = []
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = await carregarLogo();
  const filtrados = preMatriculas.filter((p) => p.lista_espera);
  const posicoesEspera = calcularPosicoesEspera(filtrados);
  const ordenados = ordenarERenumerar(filtrados);

  const resumoFiltro = descricaoFiltroStatus(filtroStatus);
  cabecalho(
    doc,
    logo,
    "Ordenado por senha 2027 — Lista de espera",
    escopo,
    resumoFiltro ? `${ordenados.length} registro(s) · ${resumoFiltro}` : `${ordenados.length} registro(s)`
  );
  const yTabelaEsp = legenda(
    doc,
    38,
    "Todo mundo aqui está ESPERANDO uma vaga surgir (ninguém tem vaga garantida ainda). \"Posição na turma\" " +
      "mostra a prioridade dentro da turma de cada um: \"1ª\" é a próxima pessoa a ser chamada se alguém " +
      "desistir daquela turma específica. A coluna \"Status\" mostra se a secretaria já ligou (Contatado) ou " +
      "ainda precisa ligar (Pendente)."
  );
  const yTabelaEspB = legendaCores(doc, yTabelaEsp);

  const corpo = ordenados.map((p) => [
    formatarSenha(p.numero_senha),
    posicoesEspera.has(p.id) ? `${posicoesEspera.get(p.id)}ª` : "—",
    celulaTurma(p),
    p.aluno_nome,
    maskPhone(p.telefone1),
    p.responsavel_nome,
    celulaStatus(p.status),
  ]);

  autoTable(doc, {
    ...estiloTabela(),
    startY: yTabelaEspB,
    head: [["Senha", "Posição na turma", "Turma", "Aluno", "Telefone", "Responsável", "Status"]],
    body: corpo,
  });

  rodape(doc, escopo);
  doc.save(`ordenado-por-senha-lista-espera-seice-${Date.now()}.pdf`);
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
  const yTabelaCompleto = legenda(
    doc,
    y + 6,
    "Esta página mostra uma linha por turma: \"Ofertadas\" é quantas vagas a turma tem no total, " +
      "\"Preenchidas\" é quantas já foram usadas, \"Livres\" é quanto ainda sobra pra preencher."
  );

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
    startY: yTabelaCompleto,
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

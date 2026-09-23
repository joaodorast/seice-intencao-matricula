import type { TurmaDisponivel } from "../types";

/**
 * A pedido da direção, o número de vagas voltou a aparecer pros pais só
 * nessas turmas específicas (série + turno) — em todas as outras, continua
 * escondido (só o aviso de "Lista de espera" quando está cheia). Ajuste essa
 * lista se a direção pedir para incluir/tirar alguma turma.
 */
const TURMAS_COM_VAGA_VISIVEL: { unidade: string; serie: string; turno: string }[] = [
  { unidade: "campos-eliseos", serie: "Maternal", turno: "M" },
  { unidade: "campos-eliseos", serie: "Maternal", turno: "T" },
  { unidade: "campos-eliseos", serie: "1º ano", turno: "M" },
  { unidade: "campos-eliseos", serie: "5º ano", turno: "T" },
  { unidade: "campos-eliseos", serie: "6º ano", turno: "M" },
  { unidade: "jardim-primavera", serie: "Maternal", turno: "M" },
  { unidade: "jardim-primavera", serie: "Maternal", turno: "T" },
];

/**
 * Mesma ideia acima, mas para casos em que duas turmas dividem a mesma
 * série + turno (ex.: 1002 e 1003, ambas "1º ano" à tarde em Campos
 * Elíseos) e só uma delas deve mostrar o número de vagas — aqui a turma é
 * identificada pelo código exato, não dá pra usar série + turno.
 */
const TURMAS_COM_VAGA_VISIVEL_POR_CODIGO: { unidade: string; codigo: string }[] = [
  { unidade: "campos-eliseos", codigo: "1003" },
];

export function vagaVisivelParaResponsavel(turma: {
  unidade_id: string;
  serie: string;
  turno: string;
  codigo?: string;
}): boolean {
  if (turma.codigo && TURMAS_COM_VAGA_VISIVEL_POR_CODIGO.some((t) => t.unidade === turma.unidade_id && t.codigo === turma.codigo)) {
    return true;
  }
  return TURMAS_COM_VAGA_VISIVEL.some(
    (t) => t.unidade === turma.unidade_id && t.serie === turma.serie && t.turno === turma.turno
  );
}

/** Verdadeiro quando pelo menos uma turma da série está na lista acima —
 *  usado pra decidir se mostra algum número já na etapa de série (antes de
 *  chegar no turno). */
export function serieComVagaVisivel(turmas: TurmaDisponivel[]): boolean {
  return turmas.some(vagaVisivelParaResponsavel);
}

/** Soma só das turmas visíveis daquela série — não mistura com o total real
 *  (que inclui turno escondido), pra não mostrar um número que não bate com
 *  o que aparece depois na etapa de turma. */
export function vagasVisiveisDaSerie(turmas: TurmaDisponivel[]): number {
  return turmas.filter(vagaVisivelParaResponsavel).reduce((acc, t) => acc + t.vagas_restantes, 0);
}

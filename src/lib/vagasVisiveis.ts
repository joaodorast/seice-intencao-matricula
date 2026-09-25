import type { TurmaDisponivel } from "../types";

/**
 * Antes isso era uma lista fixa no código. Agora é o campo `mostrar_vagas`
 * da própria turma, configurável pelo admin na tela de Configurações
 * (Painel → Configurações → Vagas visíveis pro responsável) — sem precisar
 * mexer em código nem publicar o site de novo.
 */
export function vagaVisivelParaResponsavel(turma: { mostrar_vagas: boolean }): boolean {
  return turma.mostrar_vagas;
}

/** Verdadeiro quando pelo menos uma turma da série tem mostrar_vagas ligado
 *  — usado pra decidir se mostra algum número já na etapa de série (antes
 *  de chegar no turno). */
export function serieComVagaVisivel(turmas: TurmaDisponivel[]): boolean {
  return turmas.some(vagaVisivelParaResponsavel);
}

/** Soma só das turmas visíveis daquela série — não mistura com o total real
 *  (que inclui turno escondido), pra não mostrar um número que não bate com
 *  o que aparece depois na etapa de turma. */
export function vagasVisiveisDaSerie(turmas: TurmaDisponivel[]): number {
  return turmas.filter(vagaVisivelParaResponsavel).reduce((acc, t) => acc + t.vagas_restantes, 0);
}

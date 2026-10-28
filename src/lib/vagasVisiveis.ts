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

type TurmaPublica = Pick<TurmaDisponivel, "mostrar_vagas" | "esgotada" | "vagas_restantes">;

/** Texto do selo de turma sem vaga pro responsável. */
export const VAGAS_ESGOTADAS = "VAGAS ESGOTADAS";

/**
 * Sem vaga pro responsável: marcada como esgotada, ou sem vaga livre (a
 * secretaria zerou no painel ou as intenções ocuparam tudo) — nas duas
 * unidades. O cartão mostra VAGAS ESGOTADAS e o clique abre o aviso em vez
 * de seguir: pelo site ninguém mais entra em lista de espera. (No Jardim
 * Primavera o banco ainda aceita lista de espera — só cai nela quem disputar
 * a última vaga no mesmo instante.)
 */
export function semVagaParaResponsavel(turma: TurmaPublica): boolean {
  return turma.esgotada || turma.vagas_restantes <= 0;
}

function textoVagas(n: number): string {
  return `${n} vaga${n === 1 ? "" : "s"}`;
}

/** Texto do selo de vagas de uma turma no site público: o número, quando a
 *  direção deixa mostrar, ou só "Vagas disponíveis". */
export function rotuloVagasTurma(turma: TurmaPublica): string {
  if (semVagaParaResponsavel(turma)) return VAGAS_ESGOTADAS;
  return vagaVisivelParaResponsavel(turma) ? textoVagas(turma.vagas_restantes) : "Vagas disponíveis";
}

/** Texto do selo de vagas de uma série: soma das turmas com vaga que mostram
 *  o número; se nenhuma mostra, só "Vagas disponíveis". */
export function rotuloVagasSerie(turmas: TurmaPublica[]): string {
  const abertas = turmas.filter((t) => !semVagaParaResponsavel(t));
  if (abertas.length === 0) return VAGAS_ESGOTADAS;
  const visiveis = abertas.filter(vagaVisivelParaResponsavel);
  if (visiveis.length > 0) return textoVagas(visiveis.reduce((acc, t) => acc + t.vagas_restantes, 0));
  return "Vagas disponíveis";
}

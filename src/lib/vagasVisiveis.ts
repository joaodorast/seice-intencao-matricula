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

/** Texto do selo de vagas de uma turma no site público: sempre o número de
 *  vagas livres quando tem vaga (pedido da direção — nada de "Vagas
 *  disponíveis" sem número). */
export function rotuloVagasTurma(turma: TurmaPublica): string {
  return semVagaParaResponsavel(turma) ? VAGAS_ESGOTADAS : textoVagas(turma.vagas_restantes);
}

/** Texto do selo de vagas de uma série: soma das vagas livres das turmas. */
export function rotuloVagasSerie(turmas: TurmaPublica[]): string {
  const abertas = turmas.filter((t) => !semVagaParaResponsavel(t));
  if (abertas.length === 0) return VAGAS_ESGOTADAS;
  return textoVagas(abertas.reduce((acc, t) => acc + t.vagas_restantes, 0));
}

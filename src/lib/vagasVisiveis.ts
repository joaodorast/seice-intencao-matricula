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

type TurmaPublica = Pick<TurmaDisponivel, "mostrar_vagas" | "esgotada" | "aceita_lista_espera" | "vagas_restantes">;

/** Esgotada pro responsável: marcada pela secretaria, ou sem lista de espera
 *  (Campos Elíseos) e já sem vaga livre. Não dá pra escolher essa turma. */
export function turmaEsgotada(turma: TurmaPublica): boolean {
  return turma.esgotada || (!turma.aceita_lista_espera && turma.vagas_restantes <= 0);
}

/** A intenção vai pra lista de espera: só em turma que aceita lista de
 *  espera e não mostra vaga livre pro responsável. */
export function vaiParaListaEspera(turma: TurmaPublica): boolean {
  return (
    !turmaEsgotada(turma) &&
    turma.aceita_lista_espera &&
    !(vagaVisivelParaResponsavel(turma) && turma.vagas_restantes > 0)
  );
}

/** Texto do selo de turma sem vaga pro responsável. Vale também pra turma
 *  que ainda aceita lista de espera (Jardim Primavera): lá só o texto mudou
 *  a pedido da direção — a pessoa continua podendo escolher e cai na lista
 *  de espera como antes. */
export const VAGAS_ESGOTADAS = "VAGAS ESGOTADAS";

function textoVagas(n: number): string {
  return `${n} vaga${n === 1 ? "" : "s"}`;
}

/** Texto do selo de vagas de uma turma no site público. */
export function rotuloVagasTurma(turma: TurmaPublica): string {
  if (turmaEsgotada(turma)) return VAGAS_ESGOTADAS;
  if (vagaVisivelParaResponsavel(turma) && turma.vagas_restantes > 0) return textoVagas(turma.vagas_restantes);
  return turma.aceita_lista_espera ? VAGAS_ESGOTADAS : "Vagas disponíveis";
}

/** O responsável vê VAGAS ESGOTADAS nesse cartão — clicar abre o aviso em
 *  vez de seguir. Inclui turma de lista de espera (Jardim Primavera): lá só o
 *  site deixa de oferecer a lista, o banco não mudou. */
export function semVagaParaResponsavel(turma: TurmaPublica): boolean {
  return rotuloVagasTurma(turma) === VAGAS_ESGOTADAS;
}

/** Texto do selo de vagas de uma série (soma das turmas que ainda aceitam
 *  intenção e mostram o número). */
export function rotuloVagasSerie(turmas: TurmaPublica[]): string {
  const abertas = turmas.filter((t) => !turmaEsgotada(t));
  if (abertas.length === 0) return VAGAS_ESGOTADAS;
  const visiveis = abertas.filter((t) => vagaVisivelParaResponsavel(t) && t.vagas_restantes > 0);
  if (visiveis.length > 0) return textoVagas(visiveis.reduce((acc, t) => acc + t.vagas_restantes, 0));
  return abertas.some((t) => t.aceita_lista_espera) ? VAGAS_ESGOTADAS : "Vagas disponíveis";
}

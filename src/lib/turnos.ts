import type { TurmaDisponivel } from "../types";

/**
 * No site público o código da turma (1001, 2003...) não aparece mais — o
 * responsável escolhe só série + turno (+ curso no Médio). Quando a unidade
 * tem mais de uma turma no mesmo turno (ex.: 8º ano Manhã = 8001, 8002 e
 * 8003), elas viram um cartão só:
 *   - vagas livres = soma das turmas não esgotadas;
 *   - esgotado só quando todas as turmas do turno estão esgotadas;
 *   - a intenção é gravada na turma que tem mais vaga livre naquele momento
 *     (o id do cartão é o dessa turma), pra cair em vaga garantida.
 */
export function agruparPorTurno(turmas: TurmaDisponivel[]): TurmaDisponivel[] {
  const grupos = new Map<string, TurmaDisponivel[]>();
  for (const t of turmas) {
    const chave = `${t.unidade_id}|${t.nivel}|${t.ordem}|${t.turno}|${t.curso ?? ""}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(t);
  }

  return Array.from(grupos, ([chave, lista]) => {
    const abertas = lista.filter((t) => !t.esgotada);
    const candidatas = (abertas.length > 0 ? abertas : lista).sort(
      (a, b) =>
        b.vagas_restantes - a.vagas_restantes ||
        b.vagas_planilha - a.vagas_planilha ||
        a.codigo.localeCompare(b.codigo)
    );
    const principal = candidatas[0];
    return {
      ...principal,
      chave,
      esgotada: abertas.length === 0,
      vagas_restantes: abertas.reduce((acc, t) => acc + t.vagas_restantes, 0),
      vagas_planilha: abertas.reduce((acc, t) => acc + t.vagas_planilha, 0),
    };
  });
}

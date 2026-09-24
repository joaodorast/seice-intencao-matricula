export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validEmail(v: string): boolean {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function turnoLabel(t: string): string {
  return t === "M" ? "Manhã" : t === "T" ? "Tarde" : t;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Senha de atendimento: 1 → "01", 2 → "02", ..., 100 → "100". */
export function formatarSenha(numero: number): string {
  return String(numero).padStart(2, "0");
}

type RegistroComTurma = {
  id: string;
  turma_id: string;
  lista_espera: boolean;
  criado_em: string;
  status: string;
};

/** Agrupa por turma e numera por ordem de chegada (quem se inscreveu
 *  primeiro fica em 1º) — usado tanto pra lista de espera quanto pra
 *  intenções confirmadas, cada uma com sua própria fila por turma. Quem
 *  cancelou nunca entra nessa conta — um cancelamento não pode "segurar" a
 *  posição de ninguém nem ser contado como se ainda estivesse esperando. */
function calcularPosicoesPorTurma<T extends RegistroComTurma>(
  registros: T[],
  incluir: (r: T) => boolean
): Map<string, number> {
  const posicoes = new Map<string, number>();
  const porTurma = new Map<string, T[]>();
  for (const r of registros) {
    if (r.status === "cancelado" || !incluir(r)) continue;
    const lista = porTurma.get(r.turma_id) ?? [];
    lista.push(r);
    porTurma.set(r.turma_id, lista);
  }
  for (const lista of porTurma.values()) {
    lista
      .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
      .forEach((r, i) => posicoes.set(r.id, i + 1));
  }
  return posicoes;
}

/**
 * Posição de cada intenção em lista de espera dentro da própria turma, por
 * ordem de chegada (quem se inscreveu primeiro tem prioridade). Calculada no
 * cliente, a partir dos registros já carregados — não precisa de mais uma
 * chamada ao banco. Ex.: id → 1, 2, 3 (exibido como "1ª", "2ª"...).
 */
export function calcularPosicoesEspera<T extends RegistroComTurma>(registros: T[]): Map<string, number> {
  return calcularPosicoesPorTurma(registros, (r) => r.lista_espera);
}

/**
 * Mesma ideia, mas pra quem já garantiu vaga (não está na lista de espera):
 * a posição de chegada dentro da fila de intenções confirmadas daquela
 * turma — ex.: "3ª" intenção confirmada da Turma 1001, não é a senha geral.
 */
export function calcularPosicoesIntencao<T extends RegistroComTurma>(registros: T[]): Map<string, number> {
  return calcularPosicoesPorTurma(registros, (r) => !r.lista_espera);
}

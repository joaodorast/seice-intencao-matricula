/**
 * Contas de acesso ao painel. A senha continua sendo uma só, compartilhada
 * (verificada no backend via admin_token_hash) — este mapa é só do lado do
 * cliente, pra saber de quem é o e-mail digitado e pra onde mandar a pessoa:
 * "geral" enxerga as duas unidades e o painel combinado; os outros dois
 * escopos ficam presos na própria unidade (não veem o botão de trocar de
 * painel nem conseguem abrir a rota da outra unidade).
 */
export type EscopoConta = "geral" | "campos-eliseos" | "jardim-primavera";

export interface Conta {
  nome: string;
  email: string;
  escopo: EscopoConta;
}

export const CONTAS: Conta[] = [
  { nome: "Administração", email: "admin@seice.com.br", escopo: "geral" },
  { nome: "Priscilla Paula", email: "priscilla@seice.com.br", escopo: "geral" },
  { nome: "Edson Valverde", email: "edson@seice.com.br", escopo: "geral" },
  { nome: "Bia", email: "bia@seice.com.br", escopo: "geral" },
  { nome: "Brenda Layara", email: "brenda@seice.com.br", escopo: "campos-eliseos" },
  { nome: "Giselle Steger", email: "giselle@seice.com.br", escopo: "campos-eliseos" },
  { nome: "Milena Reis", email: "milenareis@seice.com.br", escopo: "jardim-primavera" },
  { nome: "Jenyffer Silva", email: "jenyffer@seice.com.br", escopo: "jardim-primavera" },
];

export function buscarConta(email: string): Conta | null {
  const alvo = email.trim().toLowerCase();
  return CONTAS.find((c) => c.email.toLowerCase() === alvo) ?? null;
}

/** Só essa conta enxerga a tela de Configurações (reset dos dados de teste). */
export const EMAIL_COM_CONFIGURACOES = "admin@seice.com.br";

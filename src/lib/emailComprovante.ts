import { EMAIL_COMPROVANTE_URL, SUPABASE_ANON_KEY } from "../config";

/**
 * Dispara o envio do comprovante por e-mail em segundo plano. Uma falha aqui
 * nunca deve travar a tela de confirmação — a família já tem a senha na tela
 * e pode imprimir; o e-mail é só um reforço.
 */
export function enviarComprovantePorEmail(unidadeId: string, numeroSenha: number) {
  fetch(EMAIL_COMPROVANTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ unidade_id: unidadeId, numero_senha: numeroSenha }),
  }).catch(() => {});
}

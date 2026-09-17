import { formatarSenha, maskPhone } from "./format";
import type { PreMatriculaSubmetida, Unidade } from "../types";

/**
 * Monta a mensagem e o link de WhatsApp para a secretaria confirmar uma
 * intenção de matrícula. O botão que usava isso foi retirado da tela de
 * confirmação, mas a lógica fica aqui, pronta para ser plugada de novo (num
 * botão, num lembrete automático, etc.) sem precisar remontar nada.
 */
export function montarConfirmacaoWhatsApp(
  unidade: Unidade,
  submetida: PreMatriculaSubmetida
): { texto: string; href: string } {
  const texto =
    `Olá! Acabei de enviar uma intenção de matrícula para a unidade *${unidade.nome}*.\n\n` +
    `Senha: ${formatarSenha(submetida.numeroSenha)}\n` +
    `Aluno(a): ${submetida.aluno_nome}\n` +
    `Turma: ${submetida.resumoTurma}\n\n` +
    `Responsável: ${submetida.responsavel_nome}\n` +
    `Telefone: ${maskPhone(submetida.telefone1)}\n` +
    (submetida.email ? `E-mail: ${submetida.email}\n` : "");

  const href = `https://wa.me/${unidade.whatsapp}?text=${encodeURIComponent(texto)}`;
  return { texto, href };
}

import { supabase } from "./supabaseClient";

/**
 * Reserva temporária de vaga: assim que a família começa a preencher o
 * formulário, a vaga sai da contagem pública por alguns minutos, para que
 * ninguém a ocupe no meio do preenchimento. A reserva expira sozinha no banco
 * e é liberada quando a pessoa sai da tela ou termina o envio.
 */
export const RESERVA_MINUTOS = 10;

export async function reservarVaga(turmaId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("reservar_vaga", { p_turma: turmaId });
  if (error || !data) return null;
  return data as string;
}

export async function renovarReserva(id: string): Promise<void> {
  await supabase.rpc("renovar_reserva", { p_id: id });
}

export async function liberarReserva(id: string): Promise<void> {
  await supabase.rpc("liberar_reserva", { p_id: id });
}

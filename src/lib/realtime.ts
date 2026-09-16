import { supabase } from "./supabaseClient";

/**
 * Avisa em tempo real (Supabase Realtime Broadcast) quando as vagas mudam —
 * uma intenção nova, um cancelamento, uma reserva ou um ajuste de turma no
 * painel. A mensagem não carrega nenhum dado pessoal, só um sinal para quem
 * está ouvindo recarregar os números sozinho, sem precisar de F5.
 *
 * Retorna uma função para cancelar a inscrição (chame no cleanup do efeito).
 */
export function ouvirMudancaDeVagas(onMudou: () => void): () => void {
  const canal = supabase
    .channel("vagas")
    .on("broadcast", { event: "mudou" }, () => onMudou())
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}

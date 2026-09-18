-- enviar_intencao passa a devolver também a posição na lista de espera
-- daquela turma (1ª, 2ª...), contada por ordem de chegada entre quem está
-- em lista_espera = true na mesma turma. null quando não é lista de espera.
drop function if exists public.enviar_intencao(text, uuid, text, text, text, text, text, text);

create function public.enviar_intencao(
  p_unidade_id text, p_turma_id uuid, p_responsavel_nome text, p_responsavel_cpf text,
  p_telefone1 text, p_telefone2 text, p_email text, p_aluno_nome text
)
returns table(numero_senha integer, lista_espera boolean, posicao_espera integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_numero integer;
  v_espera boolean;
  v_criado timestamptz;
  v_posicao integer;
begin
  insert into public.pre_matriculas
    (unidade_id, turma_id, responsavel_nome, responsavel_cpf, telefone1, telefone2, email, aluno_nome)
  values
    (p_unidade_id, p_turma_id, p_responsavel_nome, p_responsavel_cpf, p_telefone1, p_telefone2, p_email, p_aluno_nome)
  returning pre_matriculas.numero_senha, pre_matriculas.lista_espera, pre_matriculas.criado_em
    into v_numero, v_espera, v_criado;

  if v_espera then
    select count(*) into v_posicao
    from public.pre_matriculas pm
    where pm.turma_id = p_turma_id and pm.lista_espera = true and pm.criado_em <= v_criado;
  else
    v_posicao := null;
  end if;

  return query select v_numero, v_espera, v_posicao;
end;
$function$;

grant execute on function public.enviar_intencao(text, uuid, text, text, text, text, text, text) to anon, authenticated;

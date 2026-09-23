-- Algumas turmas ficam escondidas da contagem pública de vagas (ver
-- src/lib/vagasVisiveis.ts) e sempre mostram "Lista de espera" pro
-- responsável nos passos 3/4/5, mesmo quando ainda existe vaga real no
-- banco. Antes disso, o enviar_intencao decidia lista_espera só pela vaga
-- real, então a mesma turma podia aparecer como "Lista de espera" pro
-- responsável e cair como matrícula garantida no painel — inconsistente.
-- Agora o front manda p_forcar_lista_espera = true pra essas turmas e o
-- registro cai em lista_espera = true de verdade, sem consumir a vaga real
-- (que fica livre pra secretaria matricular manualmente).
create or replace function public.enviar_intencao(
  p_unidade_id text, p_turma_id uuid, p_responsavel_nome text, p_responsavel_cpf text,
  p_telefone1 text, p_telefone2 text, p_email text, p_aluno_nome text,
  p_forcar_lista_espera boolean default false
)
returns table(numero_senha integer, lista_espera boolean, posicao_espera integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_numero integer;
  v_espera boolean;
  v_criado timestamptz;
  v_posicao integer;
begin
  insert into public.pre_matriculas
    (unidade_id, turma_id, responsavel_nome, responsavel_cpf, telefone1, telefone2, email, aluno_nome)
  values
    (p_unidade_id, p_turma_id, p_responsavel_nome, p_responsavel_cpf, p_telefone1, p_telefone2, p_email, p_aluno_nome)
  returning pre_matriculas.id, pre_matriculas.numero_senha, pre_matriculas.lista_espera, pre_matriculas.criado_em
    into v_id, v_numero, v_espera, v_criado;

  if p_forcar_lista_espera and not v_espera then
    update public.pre_matriculas set lista_espera = true where id = v_id;
    v_espera := true;
  end if;

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

grant execute on function public.enviar_intencao(text, uuid, text, text, text, text, text, text, boolean) to anon, authenticated;

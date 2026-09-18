-- Lista de espera: quando uma turma já está cheia, a intenção de matrícula
-- não é mais rejeitada — ela é aceita normalmente, só marcada como
-- lista_espera = true. Em nenhum lugar essas linhas contam como vaga
-- ocupada (nem no site público, nem no painel), pra que uma desistência real
-- libere a vaga de novo mesmo com gente na lista de espera.

alter table public.pre_matriculas
  add column if not exists lista_espera boolean not null default false;

-- Trigger que antes bloqueava o insert quando a turma estava cheia: agora só
-- marca lista_espera = true e deixa o insert acontecer.
create or replace function public.check_vagas_disponiveis()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ja_recebidas int;
  turma_unidade text;
  turma_capac int;
begin
  select unidade_id, vagas_planilha into turma_unidade, turma_capac
  from public.turmas
  where id = new.turma_id
  for update;

  if turma_unidade is null then
    raise exception 'Turma não encontrada';
  end if;

  if turma_unidade <> new.unidade_id then
    raise exception 'A unidade informada não corresponde à turma selecionada';
  end if;

  select count(*) into ja_recebidas
  from public.pre_matriculas p
  where p.turma_id = new.turma_id and p.status <> 'cancelado' and p.lista_espera = false;

  new.lista_espera := (ja_recebidas >= turma_capac);

  return new;
end;
$function$;

-- get_turmas_disponiveis (lista pública de turmas): lista de espera não
-- conta como vaga ocupada.
create or replace function public.get_turmas_disponiveis(p_unidade text DEFAULT NULL::text)
returns table(id uuid, unidade_id text, ano_letivo integer, nivel text, serie text, serie_full text, ordem integer, codigo text, turno text, curso text, capacidade integer, vagas_planilha integer, vagas_restantes integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    t.id, t.unidade_id, t.ano_letivo, t.nivel, t.serie, t.serie_full, t.ordem, t.codigo, t.turno, t.curso,
    t.capacidade, t.vagas_planilha,
    greatest(t.vagas_planilha - coalesce(pm.qtd, 0) - coalesce(rv.qtd, 0), 0)::int as vagas_restantes
  from public.turmas t
  left join (
    select turma_id, count(*) as qtd
    from public.pre_matriculas
    where status <> 'cancelado' and lista_espera = false
    group by turma_id
  ) pm on pm.turma_id = t.id
  left join (
    select turma_id, count(*) as qtd
    from public.reservas_turma
    where expira_em > now()
    group by turma_id
  ) rv on rv.turma_id = t.id
  where p_unidade is null or t.unidade_id = p_unidade;
$function$;

-- enviar_intencao agora devolve também se caiu na lista de espera (muda o
-- tipo de retorno, por isso o drop antes do create).
drop function if exists public.enviar_intencao(text, uuid, text, text, text, text, text, text);

create function public.enviar_intencao(
  p_unidade_id text, p_turma_id uuid, p_responsavel_nome text, p_responsavel_cpf text,
  p_telefone1 text, p_telefone2 text, p_email text, p_aluno_nome text
)
returns table(numero_senha integer, lista_espera boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_numero integer;
  v_espera boolean;
begin
  insert into public.pre_matriculas
    (unidade_id, turma_id, responsavel_nome, responsavel_cpf, telefone1, telefone2, email, aluno_nome)
  values
    (p_unidade_id, p_turma_id, p_responsavel_nome, p_responsavel_cpf, p_telefone1, p_telefone2, p_email, p_aluno_nome)
  returning pre_matriculas.numero_senha, pre_matriculas.lista_espera into v_numero, v_espera;

  return query select v_numero, v_espera;
end;
$function$;

grant execute on function public.enviar_intencao(text, uuid, text, text, text, text, text, text) to anon, authenticated;

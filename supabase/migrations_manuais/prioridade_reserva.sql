-- Prioridade pra quem clicou primeiro na vaga (pedido da direção, out/2026).
--
-- Ao clicar na turma, o site reserva a vaga (reservas_turma, 10 min,
-- renovada enquanto a pessoa está na tela). Até aqui o banco ignorava essas
-- reservas na hora de gravar a intenção: quem chegava depois e enviava mais
-- rápido podia ficar com a vaga de quem reservou primeiro. Agora:
--   - a contagem de vagas no envio inclui as reservas ativas DE OUTRAS
--     pessoas — a vaga reservada só serve pra quem a reservou;
--   - enviar_intencao recebe a reserva da pessoa (p_reserva), usa essa vaga
--     e apaga a reserva;
--   - reservar_vaga trava a turma, pra duas reservas no mesmo instante não
--     passarem juntas da última vaga;
--   - Jardim Primavera deixa de aceitar lista de espera no banco, igual a
--     Campos Elíseos: sem vaga, a intenção é recusada ("Turma esgotada"),
--     em vez de cair na lista de espera. Só muda essa configuração — nenhuma
--     vaga, turma ou intenção é alterada.
--
-- Aplicar ANTES de publicar o site que manda p_reserva.

update public.turmas set aceita_lista_espera = false where unidade_id = 'jardim-primavera';

create or replace function public.reservar_vaga(p_turma uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ofertadas int;
  v_esgotada boolean;
  v_usadas int;
  v_id uuid;
begin
  delete from reservas_turma where expira_em < now();

  -- for update: reservas da mesma turma passam uma de cada vez
  select vagas_planilha, esgotada into v_ofertadas, v_esgotada from turmas where id = p_turma for update;
  if v_ofertadas is null then
    raise exception 'Turma não encontrada';
  end if;
  if v_esgotada then
    raise exception 'Não há mais vagas disponíveis nesta turma';
  end if;

  select (select count(*) from pre_matriculas p
          where p.turma_id = p_turma and p.status <> 'cancelado' and p.lista_espera = false)
       + (select count(*) from reservas_turma r where r.turma_id = p_turma and r.expira_em > now())
    into v_usadas;

  if v_usadas >= v_ofertadas then
    raise exception 'Não há mais vagas disponíveis nesta turma';
  end if;

  insert into reservas_turma (turma_id) values (p_turma) returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.check_vagas_disponiveis()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ja_recebidas int;
  reservadas_outros int;
  minha_reserva uuid;
  turma_unidade text;
  turma_capac int;
  turma_esgotada boolean;
  turma_aceita_espera boolean;
begin
  select unidade_id, vagas_planilha, esgotada, aceita_lista_espera
    into turma_unidade, turma_capac, turma_esgotada, turma_aceita_espera
  from public.turmas
  where id = new.turma_id
  for update;

  if turma_unidade is null then
    raise exception 'Turma não encontrada';
  end if;

  if turma_unidade <> new.unidade_id then
    raise exception 'A unidade informada não corresponde à turma selecionada';
  end if;

  if turma_esgotada then
    raise exception 'Turma esgotada';
  end if;

  select count(*) into ja_recebidas
  from public.pre_matriculas p
  where p.turma_id = new.turma_id and p.status <> 'cancelado' and p.lista_espera = false;

  -- reserva de quem está enviando (passada por enviar_intencao): não conta
  -- contra a própria pessoa; as reservas ativas das outras contam
  minha_reserva := nullif(current_setting('app.reserva_id', true), '')::uuid;
  select count(*) into reservadas_outros
  from public.reservas_turma r
  where r.turma_id = new.turma_id and r.expira_em > now()
    and (minha_reserva is null or r.id <> minha_reserva);

  new.lista_espera := (ja_recebidas + reservadas_outros >= turma_capac);

  if new.lista_espera and not turma_aceita_espera then
    raise exception 'Turma esgotada';
  end if;

  return new;
end;
$function$;

-- enviar_intencao ganha p_reserva (troca a assinatura: drop antes do create)
drop function if exists public.enviar_intencao(text, uuid, text, text, text, text, text, text, boolean);

create function public.enviar_intencao(
  p_unidade_id text, p_turma_id uuid, p_responsavel_nome text, p_responsavel_cpf text,
  p_telefone1 text, p_telefone2 text, p_email text, p_aluno_nome text,
  p_forcar_lista_espera boolean default false,
  p_reserva uuid default null
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
  -- o trigger check_vagas_disponiveis lê isso pra não contar a reserva da
  -- própria pessoa contra ela (vale só dentro desta transação)
  perform set_config('app.reserva_id', coalesce(p_reserva::text, ''), true);

  insert into public.pre_matriculas
    (unidade_id, turma_id, responsavel_nome, responsavel_cpf, telefone1, telefone2, email, aluno_nome)
  values
    (p_unidade_id, p_turma_id, p_responsavel_nome, p_responsavel_cpf, p_telefone1, p_telefone2, p_email, p_aluno_nome)
  returning pre_matriculas.id, pre_matriculas.numero_senha, pre_matriculas.lista_espera, pre_matriculas.criado_em
    into v_id, v_numero, v_espera, v_criado;

  -- a vaga reservada virou a intenção: a reserva some
  if p_reserva is not null then
    delete from public.reservas_turma where id = p_reserva;
  end if;

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

grant execute on function public.enviar_intencao(text, uuid, text, text, text, text, text, text, boolean, uuid) to anon, authenticated;

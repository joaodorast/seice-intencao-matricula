-- Pedido da direção (out/2026) para Campos Elíseos:
--   1. algumas turmas ficam ESGOTADAS — aparecem pro responsável com o selo
--      "VAGAS ESGOTADAS" e não aceitam mais intenção, nem em lista de espera;
--   2. Campos Elíseos deixa de ter lista de espera pelo site: turma que
--      chegar a 0 vagas também vira "VAGAS ESGOTADAS";
--   3. o número de vagas de cada série/turno é atualizado pro valor passado
--      pela direção e passa a aparecer pro responsável.
--
-- Essa parte é compatível com o site que já está no ar (só acrescenta
-- colunas e atualiza dados). O bloqueio no banco fica em
-- bloquear_turma_esgotada.sql, aplicado junto com a publicação do site novo.

alter table public.turmas
  add column if not exists esgotada boolean not null default false,
  add column if not exists aceita_lista_espera boolean not null default true;

-- get_turmas_disponiveis devolve as duas colunas novas (muda o tipo de
-- retorno, por isso o drop antes do create)
drop function if exists public.get_turmas_disponiveis(text);

create function public.get_turmas_disponiveis(p_unidade text DEFAULT NULL::text)
returns table(
  id uuid, unidade_id text, ano_letivo integer, nivel text, serie text, serie_full text, ordem integer,
  codigo text, turno text, curso text, capacidade integer, vagas_planilha integer, vagas_restantes integer,
  mostrar_vagas boolean, esgotada boolean, aceita_lista_espera boolean
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    t.id, t.unidade_id, t.ano_letivo, t.nivel, t.serie, t.serie_full, t.ordem, t.codigo, t.turno, t.curso,
    t.capacidade, t.vagas_planilha,
    greatest(t.vagas_planilha - coalesce(pm.qtd, 0) - coalesce(rv.qtd, 0), 0)::int as vagas_restantes,
    t.mostrar_vagas, t.esgotada, t.aceita_lista_espera
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

grant execute on function public.get_turmas_disponiveis(text) to anon, authenticated;

-- reservar_vaga contava também quem está na lista de espera como vaga usada
-- — diferente de get_turmas_disponiveis e do trigger, que não contam. Com
-- isso uma turma com vaga livre e gente na espera recusava a reserva.
create or replace function public.reservar_vaga(p_turma uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ofertadas int;
  v_usadas int;
  v_id uuid;
begin
  delete from reservas_turma where expira_em < now();

  select vagas_planilha into v_ofertadas from turmas where id = p_turma;
  if v_ofertadas is null then
    raise exception 'Turma não encontrada';
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

-- Campos Elíseos: sem lista de espera pelo site
update public.turmas set aceita_lista_espera = false where unidade_id = 'campos-eliseos';

-- Turmas esgotadas (lista da direção)
update public.turmas t set esgotada = true
from (values
  ('infantil', 'Maternal', 'T'),
  ('infantil', 'Pré II',   'T'),
  ('fund1',    '1º ano',   'T'),
  ('fund1',    '2º ano',   'M'),
  ('fund1',    '4º ano',   'M'),
  ('fund1',    '5º ano',   'M'),
  ('fund2',    '7º ano',   'M'),
  ('fund2',    '8º ano',   'M'),
  ('fund2',    '9º ano',   'M')
) as e(nivel, serie, turno)
where t.unidade_id = 'campos-eliseos' and t.nivel = e.nivel and t.serie = e.serie and t.turno = e.turno;

-- Vagas por série/turno (lista da direção). O número é o que o responsável
-- vê livre no site. No site cada série/turno vira um cartão só (sem o
-- código da turma), então quando há mais de uma turma no mesmo turno o
-- número fica todo na turma que já tinha mais vagas ofertadas (empate: menor
-- código), e as outras ficam só com as vagas que já estão ocupadas por
-- intenção — assim a soma livre do turno bate exatamente com o número pedido.
-- Vagas ofertadas = vagas livres + intenções que já garantiram vaga nela.
with pedido(nivel, serie, turno, curso, vagas) as (
  values
    ('infantil', 'Maternal', 'M', null,            7),
    ('infantil', 'Pré I',    'M', null,            8),
    ('infantil', 'Pré I',    'T', null,            5),
    ('infantil', 'Pré II',   'M', null,            2),
    ('fund1',    '1º ano',   'M', null,            4),
    ('fund1',    '2º ano',   'T', null,            6),
    ('fund1',    '3º ano',   'M', null,            3),
    ('fund1',    '3º ano',   'T', null,            6),
    ('fund1',    '4º ano',   'T', null,            6),
    ('fund1',    '5º ano',   'T', null,           12),
    ('fund2',    '6º ano',   'M', null,            4),
    ('fund2',    '6º ano',   'T', null,            2),
    ('fund2',    '7º ano',   'T', null,           17),
    ('fund2',    '8º ano',   'T', null,           10),
    ('fund2',    '9º ano',   'T', null,           13),
    ('medio',    '1º Ano',   'M', 'Informática',  10),
    ('medio',    '1º Ano',   'T', 'Enfermagem',   15),
    ('medio',    '1º Ano',   'M', 'Administração',16),
    ('medio',    '2º ano',   'M', 'Informática',   4),
    ('medio',    '2º ano',   'T', 'Enfermagem',    8),
    ('medio',    '2º ano',   'M', 'Administração',16)
),
alvo as (
  select
    t.id, t.matriculados, p.vagas,
    (select count(*) from public.pre_matriculas pm
      where pm.turma_id = t.id and pm.status <> 'cancelado' and pm.lista_espera = false)::int as ocupadas,
    row_number() over (
      partition by p.nivel, p.serie, p.turno, p.curso
      order by t.vagas_planilha desc, t.codigo
    ) as ordem_no_turno
  from public.turmas t
  join pedido p
    on t.unidade_id = 'campos-eliseos' and t.nivel = p.nivel and t.serie = p.serie
   and t.turno = p.turno and t.curso is not distinct from p.curso
),
novo as (
  select id, matriculados,
         ocupadas + case when ordem_no_turno = 1 then vagas else 0 end as vagas_planilha
  from alvo
)
update public.turmas t
set vagas_planilha = novo.vagas_planilha,
    capacidade     = novo.matriculados + novo.vagas_planilha,
    mostrar_vagas  = true
from novo
where t.id = novo.id;

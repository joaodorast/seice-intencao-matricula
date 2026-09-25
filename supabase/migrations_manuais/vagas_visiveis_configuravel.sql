-- Até agora, quais turmas mostravam o número de vagas pro responsável (em
-- vez de só "Lista de espera") era uma lista fixa dentro do código
-- (src/lib/vagasVisiveis.ts). Isso vira uma coluna configurável na própria
-- turma, editável pelo admin numa tela do painel, sem precisar mexer em
-- código nem publicar o site de novo.
--
-- O valor default (false) preserva o comportamento de cada turma que já
-- existia antes dessa migração: só as combinações abaixo (que estavam na
-- lista fixa) começam como true, o resto continua escondido igual estava.
alter table public.turmas
  add column if not exists mostrar_vagas boolean not null default false;

update public.turmas set mostrar_vagas = true
where (unidade_id = 'campos-eliseos' and serie = 'Maternal' and turno in ('M', 'T'))
   or (unidade_id = 'campos-eliseos' and serie = '1º ano' and turno = 'M')
   or (unidade_id = 'campos-eliseos' and serie = '5º ano' and turno = 'T')
   or (unidade_id = 'campos-eliseos' and serie = '6º ano' and turno = 'M')
   or (unidade_id = 'jardim-primavera' and serie = 'Maternal' and turno in ('M', 'T'))
   or (unidade_id = 'campos-eliseos' and codigo = '1003');

-- get_turmas_disponiveis (lista pública de turmas) passa a devolver também
-- mostrar_vagas, pra o site público saber se mostra o número ou "Lista de
-- espera" direto do banco, sem precisar de lista fixa no front.
create or replace function public.get_turmas_disponiveis(p_unidade text DEFAULT NULL::text)
returns table(
  id uuid, unidade_id text, ano_letivo integer, nivel text, serie text, serie_full text, ordem integer,
  codigo text, turno text, curso text, capacidade integer, vagas_planilha integer, vagas_restantes integer,
  mostrar_vagas boolean
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    t.id, t.unidade_id, t.ano_letivo, t.nivel, t.serie, t.serie_full, t.ordem, t.codigo, t.turno, t.curso,
    t.capacidade, t.vagas_planilha,
    greatest(t.vagas_planilha - coalesce(pm.qtd, 0) - coalesce(rv.qtd, 0), 0)::int as vagas_restantes,
    t.mostrar_vagas
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

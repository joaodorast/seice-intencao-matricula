-- Aplicar junto com a publicação do site que mostra "VAGAS ESGOTADAS"
-- (depois de campos_eliseos_vagas_esgotadas.sql). Antes disso, o site
-- antigo ainda oferece essas turmas e o responsável veria um erro genérico.
--
-- O banco passa a recusar a intenção quando:
--   - a turma está marcada como esgotada; ou
--   - a turma não aceita lista de espera (Campos Elíseos) e não tem mais
--     vaga livre — em vez de cair na lista de espera como antes.
-- O site novo trata a mensagem 'Turma esgotada' e mostra o aviso certo.
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

  new.lista_espera := (ja_recebidas >= turma_capac);

  if new.lista_espera and not turma_aceita_espera then
    raise exception 'Turma esgotada';
  end if;

  return new;
end;
$function$;

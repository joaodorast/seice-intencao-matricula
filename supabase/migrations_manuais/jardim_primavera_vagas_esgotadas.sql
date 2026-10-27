-- Pedido da direção (out/2026): no Jardim Primavera, tudo que aparecia pro
-- responsável como "Lista de espera" passa a aparecer como "VAGAS ESGOTADAS"
-- (sem poder escolher), igual Campos Elíseos.
--
-- 1. Jardim Primavera deixa de ter lista de espera pelo site: turma que
--    chegar a 0 vagas vira "VAGAS ESGOTADAS" sozinha.
-- 2. Toda turma que hoje mostrava "Lista de espera" fica marcada como
--    esgotada — inclusive as que tinham vaga real, mas com o número
--    escondido do responsável (mostrar_vagas = false). Só continua aberta a
--    turma que mostrava o número de vagas (hoje, só o Maternal Manhã).
update public.turmas set aceita_lista_espera = false where unidade_id = 'jardim-primavera';

update public.turmas t set esgotada = true
where t.unidade_id = 'jardim-primavera'
  and not (
    t.mostrar_vagas
    and t.vagas_planilha > (select count(*) from public.pre_matriculas p
                            where p.turma_id = t.id and p.status <> 'cancelado' and p.lista_espera = false)
  );

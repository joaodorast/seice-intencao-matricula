-- Novo status "agendado" (pedido da direção, out/2026): a família já foi
-- contatada e tem dia marcado pra vir à escola — fica entre Contatado e
-- Matriculado. Só amplia a lista de status aceitos; nenhum registro muda.
alter table public.pre_matriculas drop constraint if exists pre_matriculas_status_check;
alter table public.pre_matriculas add constraint pre_matriculas_status_check
  check (status = any (array['pendente', 'contatado', 'agendado', 'matriculado', 'cancelado']));

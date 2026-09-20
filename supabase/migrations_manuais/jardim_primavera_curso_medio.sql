-- Jardim Primavera não tem trilha técnica (Informática/Enfermagem/
-- Administração) como Campos Elíseos — as duas turmas de Ensino Médio de
-- lá (1º e 2º ano) estavam com curso "Informática" por engano. A unidade
-- oferece só "Médio Preparatório", então isso vira o nome da própria série
-- (visível já na etapa de escolher a série, antes da turma) — o campo
-- curso fica null pra não repetir a mesma informação duas vezes.
update turmas
set
  serie = '1º Ano Médio Preparatório',
  serie_full = '1º Ano Médio Preparatório',
  curso = null
where unidade_id = 'jardim-primavera' and nivel = 'medio' and serie = '1º ano';

update turmas
set
  serie = '2º Ano Médio Preparatório',
  serie_full = '2º Ano Médio Preparatório',
  curso = null
where unidade_id = 'jardim-primavera' and nivel = 'medio' and serie = '2º ano';

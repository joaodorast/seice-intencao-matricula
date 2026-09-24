# Guia dos relatórios — como ler cada um

Este documento explica, em português bem simples, o que cada relatório em PDF mostra. A ideia é que qualquer
pessoa — mesmo quem nunca usou o sistema — consiga abrir um desses PDFs e entender na hora o que está vendo.

Todos os relatórios já trazem, dentro do próprio PDF, uma frase explicando a página e uma legenda de cores.
Este guia é só um resumo pra consultar rápido.

## As cores dos status (aparecem em quase todo relatório)

| Cor | Status | O que significa |
|---|---|---|
| 🔘 Cinza | **Pendente** | Chegou o pedido, mas a secretaria ainda não ligou |
| 🔵 Azul | **Contatado** | A secretaria já ligou pra essa família |
| 🟢 Verde | **Matriculado** | A matrícula foi confirmada |
| 🔴 Vermelho | **Cancelado** | A família desistiu ou cancelou o pedido |

Além disso, quando uma pessoa está esperando vaga (não confirmou matrícula ainda), aparece em **dourado**
como "Lista de espera". Quem já tem vaga garantida aparece em **verde** como "Vaga garantida".

## Onde encontrar cada relatório

Dentro do painel, vá em **Relatórios** e clique em **Abrir exportação** (ou nos botões de atalho). Escolha o
tipo de relatório, as turmas, o status e o período que quiser, e baixe em PDF ou Excel.

## Vagas por turma

**O que é:** uma linha por turma, mostrando quantas vagas ela tem, quantas já foram usadas e quantas
sobram.

- **Ofertadas** — quantas vagas a turma tem no total.
- **Preenchidas** — quantas já foram usadas (matrículas confirmadas).
- **Livres** — quanto ainda sobra.
- **Espera** *(só no relatório Detalhado)* — quantas famílias estão esperando essa turma abrir vaga, mesmo
  que ela esteja com "0" vagas ofertadas. Isso é normal: o formulário do site aceita inscrição na lista de
  espera mesmo quando a turma não tem nenhuma vaga cadastrada.
- **Situação** — um resumo em palavras: "Vagas abertas", "Vagas limitadas", "Últimas vagas", "Sem vagas" ou
  "Sem oferta" (quando a turma tem 0 vagas cadastradas).

## Intenções de matrícula

**O que é:** lista de todo mundo que pediu vaga, um por linha, com telefone e responsável pra contato.

- **Senha** — o número de atendimento da família (ordem de chegada).
- **Status** — cor + palavra mostrando se já foi contatada, confirmada, ou ainda está pendente (veja a
  tabela de cores acima).
- **Posição na fila de espera** — só preenchido pra quem ainda não tem vaga; mostra o lugar dela na fila
  daquela turma específica ("1ª" é a próxima a ser chamada se alguém desistir).

## Relatório detalhado

Esse relatório sai em **3 páginas juntas**, uma depois da outra no mesmo PDF:

1. **Página 1 — Vagas por turma**: igual ao relatório "Vagas por turma" explicado acima.
2. **Página 2 — Contatos · Intenção de matrícula**: só quem **já tem vaga garantida**, agrupado por turma,
   na ordem de chegada (senha menor primeiro). É pra ligar confirmando a matrícula.
3. **Página 3 — Contatos · Lista de espera**: só quem **ainda não tem vaga**, agrupado por turma, ordenado
   pela **Posição**: "1ª" é a próxima pessoa a ser chamada se surgir uma vaga naquela turma.

As páginas 2 e 3 também mostram a coluna **Status**, pra saber se a secretaria já ligou pra cada um.

## Ordenado por senha

Existem 3 versões desse relatório — todas ordenam por ordem de chegada (quem pediu primeiro aparece
primeiro), sem separar por turma, prontas pra secretaria ir ligando de cima pra baixo:

- **Ordenado por senha** (completo): todo mundo junto — quem tem vaga garantida e quem está na lista de
  espera, misturado. A coluna **Situação** diz qual é qual (verde = vaga garantida, dourado = lista de
  espera, com a posição na turma).
- **Ordenado por senha · Intenções de matrícula**: só quem já tem vaga garantida.
- **Ordenado por senha · Lista de espera**: só quem está esperando vaga. A coluna **Posição na turma** é a
  prioridade dela dentro da turma específica.

## Filtro de status e período (na tela de exportação)

Antes de baixar qualquer relatório, dá pra escolher:

- **Quais status entram** — por exemplo, desmarcar "Contatado" pra não ver de novo quem já foi chamado.
  Por padrão vem marcado Pendente, Contatado e Matriculado (Cancelado fica de fora, mas pode marcar se
  quiser ver os cancelamentos também).
- **Qual período** — só trazer quem chegou entre duas datas. Deixe em branco pra trazer qualquer data.

O relatório que sai reflete exatamente o que foi marcado — e o próprio PDF mostra, no topo, quais filtros
foram usados (por exemplo: "34 registro(s) · Status: Pendente, Contatado").

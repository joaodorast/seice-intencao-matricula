# Atualizações do painel — vagas, senha e relatórios

Este documento explica três mudanças recentes no sistema de intenção de matrícula: o que os pais deixaram de ver, o novo relatório detalhado, e o novo interruptor na Visão Geral do painel.

---

## 1. Pais não veem mais número de vagas nem senha

### O que mudou

Antes, o formulário público (o que os pais preenchem) mostrava o número de vagas em cada etapa — "44 vagas", "9 de 9 vagas", etc. — e, ao final, a família via sua senha de atendimento (ou a posição na lista de espera).

Agora isso foi retirado **só do lado dos pais**:

- Nas telas de nível, série e turma, não aparece mais nenhum número de vaga. Quando uma turma está cheia, continua aparecendo o aviso "Lista de espera" (sem número), pra família saber que vai entrar na fila mesmo assim.
- No comprovante — na tela, impresso e no e-mail — não aparece mais a senha nem a posição na lista de espera. O comprovante continua mostrando aluno, unidade, turma, responsável e telefone normalmente.

### O que NÃO mudou

- **A secretaria e o admin continuam vendo tudo normalmente** — vagas ofertadas, ocupadas e livres em todas as abas do painel (Visão Geral, Turmas, Relatórios), e a senha/posição na lista de espera em cada intenção, tanto no `/admin` quanto nos painéis `/seice-ce` e `/seice-jp`.
- A lógica de vagas, lista de espera e a senha sequencial continuam funcionando exatamente como antes por trás das telas — só a exibição para os pais foi escondida.
- Nenhum dado foi apagado. A família ainda recebe a confirmação de que a intenção foi enviada (ou que entrou na lista de espera); só não vê mais os números.

### Por quê

Ideia é simples: **só a secretaria e a direção precisam saber quantas vagas restam e qual a senha de cada família** — os pais não precisam dessa informação, e escondê-la evita perguntas do tipo "por que a vaga da turma X mudou de número" ou famílias tentando comparar posição/senha entre si.

---

## 2. Relatório detalhado (de volta)

Foi adicionado um relatório novo, que junta numa coisa só o que antes só dava pra ver separado (vagas por turma de um lado, lista de famílias de outro).

### Onde encontrar

Aba **Relatórios** → botão **"Relatório detalhado"** (tem também dentro do botão "Exportar relatório", na aba "Detalhado").

### O que ele mostra

Pra cada turma:

- Quantas vagas foram ofertadas, quantas estão ocupadas e quantas ainda estão livres.
- Logo abaixo, a lista de alunos daquela turma: nome do aluno, telefone completo, nome do responsável e status (Pendente/Contatado/Matriculado/Cancelado, incluindo se está na lista de espera).

Disponível em **PDF** (visual, pronto pra imprimir ou mandar pra direção) e em **Excel** (uma linha por aluno, com a ocupação da turma dele do lado — dá pra filtrar e ordenar como quiser).

Pode ser gerado pra todas as turmas de uma vez, ou só para as turmas que você marcar (mesmo seletor de sempre, com busca).

---

## 3. Chavinha na Visão Geral: "Esconder daqui quem já deixou de ser pendente"

### O problema que isso resolve

Na Visão Geral, a lista de "Intenções pendentes" sempre mostrou só quem ainda está com status Pendente — assim que a secretaria marca "Contatado" ou "Matriculado", a intenção sai dessa lista (ela continua intacta na aba Intenções, só sai dali). Isso é assim desde o início, mas sem nenhum aviso dava a impressão de que o cadastro tinha sumido.

### O que foi adicionado

Um interruptor logo acima da lista, com duas posições:

- **Ligado (padrão, comportamento de sempre):** a lista mostra só quem está Pendente — assim que alguém deixa de ser pendente, some daqui (continua na aba Intenções).
- **Desligado:** a lista passa a chamar "Intenções recentes" e mostra as mais recentes **de qualquer status** — nada some, e cada uma mostra um selo com o status atual (Contatado, Matriculado, etc.) do lado do nome.

A escolha fica salva no navegador de quem está usando o painel, então cada secretaria pode deixar do jeito que preferir.

---

*Dúvidas ou ajustes: é só pedir.*

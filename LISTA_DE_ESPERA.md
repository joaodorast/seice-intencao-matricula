# Como funciona a lista de espera

## O problema que isso resolve

Antes, quando uma turma já estava cheia, a família recebia um erro na hora de
enviar a intenção de matrícula e tinha que voltar e escolher outra turma —
mesmo que a turma que ela queria fosse mesmo a certa. Isso perdia contato de
famílias interessadas.

## Como funciona agora

Quando uma família termina de preencher o formulário e a turma escolhida já
está sem vaga (seja porque já estava cheia, seja porque outra família ocupou
a última vaga um instante antes), a intenção **não é mais rejeitada**. Ela é
cadastrada normalmente, só que marcada como **"lista de espera"**.

### O que a família vê

Em vez da tela normal de "Intenção enviada!", ela vê uma tela avisando:

> **Você entrou na lista de espera!**
> As vagas da turma escolhida já foram preenchidas, mas seus dados foram
> cadastrados. Se surgir uma desistência, a secretaria entra em contato pra
> oferecer a vaga.

O comprovante (na tela, impresso e por e-mail) tem uma faixa destacada
escrito **"Lista de espera"**. E no lugar da senha normal, ele mostra a
**posição da família na fila daquela turma** — "1ª", "2ª", "3ª"... contada
por ordem de chegada: quem se inscreveu primeiro fica na frente.

### O que a secretaria vê

No painel (Visão geral e na aba Intenções), toda inscrição que caiu na lista
de espera tem um selo amarelo com um relógio, escrito **"1ª na lista de
espera"**, **"2ª na lista de espera"**, etc. — já mostrando a posição de
cada família na fila daquela turma, sem precisar abrir o registro nem
contar manualmente quem chegou antes. Os relatórios em PDF e Excel também
têm uma coluna "Lista de espera" (Sim/Não).

### O que NÃO muda

- A senha de atendimento (01, 02, 03...) é a mesma sequência pra todo mundo,
  esteja na lista de espera ou não.
- O status (Pendente, Contatado, Matriculado, Cancelado) funciona
  normalmente pra essas inscrições também — a secretaria consegue avançar o
  status de alguém da lista de espera do mesmo jeito que qualquer outra.
- **A lista de espera nunca conta como vaga ocupada.** Se 3 famílias caíram
  na lista de espera de uma turma cheia, o painel continua mostrando "0
  vagas livres" — e não "-3". Se alguém cancelar uma matrícula confirmada
  naquela turma, a vaga aparece livre de novo automaticamente, mesmo com
  gente na lista de espera.

### O que a secretaria PRECISA fazer manualmente

O sistema não avisa a família sozinho quando uma vaga abre — ele só marca
quem está na lista de espera e em que posição. Quando uma vaga realmente
abrir (por exemplo, um cancelamento), a secretaria precisa:

1. Olhar quem está na lista de espera daquela turma (filtrar por unidade/
   turma na aba Intenções e procurar o selo amarelo) e chamar pela posição —
   a "1ª" tem prioridade sobre a "2ª", e assim por diante.
2. Entrar em contato com a família pelo telefone ou e-mail cadastrado.
3. Mudar o status da intenção conforme for andando a matrícula.

Isso foi deixado manual de propósito: contatar a família é uma decisão da
secretaria (ordem de chegada, prioridade, etc.), não algo pra automatizar.

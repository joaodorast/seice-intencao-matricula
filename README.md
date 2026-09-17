# Intenção de Matrícula SEICE — 2027

Sistema completo de intenção de matrícula online para as unidades **Campos Elíseos** e **Jardim Primavera**, sem etapa de pagamento, com painel administrativo completo para a secretaria. Construído em **React + Vite + TypeScript + Tailwind CSS**, com banco de dados e backend no **Supabase**.

---

## 1. Para onde vai cada intenção enviada (o caminho completo)

Esta é a pergunta mais importante, então a resposta direta primeiro:

**Toda intenção de matrícula enviada pelo site é salva imediatamente no banco de dados (Supabase) e aparece em tempo real no painel da secretaria** — em `/admin`, `/seice-ce` ou `/seice-jp`, sem precisar dar F5.

Passo a passo do que acontece quando um responsável preenche o formulário:

1. **Responsável acessa `/`** e escolhe, em sequência: unidade → nível de ensino → série → turma com vaga disponível → preenche os dados do responsável e do aluno. Ao começar a digitar, a vaga escolhida já fica reservada por 10 minutos (ver seção "Reserva temporária de vaga").
2. **Ao confirmar**, o app chama a função `enviar_intencao` no banco (Supabase), que insere o registro e devolve só a senha de atendimento gerada — nunca os dados de outras famílias (ver seção de segurança abaixo).
3. **O banco valida na hora** (com uma trava automática — um *trigger* SQL) se a turma escolhida ainda tem vaga. Se alguém preencheu ao mesmo tempo e a vaga acabou, o envio é rejeitado e o app avisa o responsável para escolher outra turma. Isso evita turmas "estourarem" por duas famílias preenchendo no mesmo segundo.
4. **O registro fica salvo permanentemente** no banco, com status inicial `pendente` e uma senha sequencial (01, 02, 03...), pronto para a secretaria ver, filtrar e exportar.
5. **A família vê a senha na tela de confirmação** (e pode imprimir o comprovante) — a secretaria entra em contato a partir daí.
6. **A secretaria acompanha tudo no painel**: vê a lista completa de intenções recebidas, filtra por unidade, busca por nome, muda o status (`pendente` → `contatado` → `matriculado`/`cancelado`) com um clique — inclusive um botão dedicado de cancelar — e exporta em CSV, Excel ou PDF quando quiser, com filtro por segmento ou turma.

Ou seja: **o destino final de cada envio é o banco de dados do Supabase**, e a secretaria o acessa através do painel — em tempo real, sem precisar de nenhum outro canal.

### Sobre o WhatsApp

O fluxo tinha um botão "Confirmar pelo WhatsApp" na tela de confirmação, que abria uma mensagem pronta para a secretaria. Esse botão foi retirado da tela a pedido do cliente, mas a lógica que monta a mensagem e o link `wa.me` continua no código, em `src/lib/whatsapp.ts` (função `montarConfirmacaoWhatsApp`), pronta para ser religada num botão (ou em outro lugar) quando for necessário — sem precisar remontar nada.

### Por que não existe um "e-mail de notificação" tradicional

Propositalmente não foi implementado envio de e-mail/SMS automático, porque (a) o cliente pediu explicitamente fluxo sem pagamento e o mais simples possível para os pais, e (b) o WhatsApp é o canal que as secretarias do SEICE já usam no dia a dia. Se quiser adicionar notificação por e-mail para a secretaria a cada nova intenção, é possível configurar isso depois como um passo adicional na Edge Function (ver seção "Como evoluir o sistema").

---

## 2. Mapa de rotas

| Rota | O que é | Quem acessa |
|---|---|---|
| `/` | Formulário público de intenção de matrícula (unidade → nível → série → turma → dados → confirmação) | Pais e responsáveis |
| `/admin` | Painel geral da secretaria — vê as **duas unidades** juntas | Direção do SEICE |
| `/seice-ce` | Dashboard próprio da **SEICE CE** — só turmas e intenções de Campos Elíseos | Secretaria de Campos Elíseos |
| `/seice-jp` | Dashboard próprio da **SEICE JP** — só turmas e intenções de Jardim Primavera | Secretaria de Jardim Primavera |

São três dashboards de verdade, cada um na sua rota (`/seice-ce` e `/seice-jp` não vivem "dentro" de `/admin`), todos com o mesmo login. Dentro de qualquer um há um seletor no topo ("Todas · SEICE CE · SEICE JP") para trocar de painel, e os relatórios em PDF/Excel saem com os dados do painel aberto.

### Atualização em tempo real

O painel e o site público ficam de olho em qualquer mudança nas vagas — uma intenção nova, um cancelamento, uma reserva ou um ajuste de turma — através do Supabase Realtime (Broadcast). Quando algo muda, quem está com a tela aberta recebe o aviso e recarrega os números sozinho, sem precisar apertar F5. A mensagem não carrega nenhum dado pessoal, só um sinal de "algo mudou"; cada lado busca os próprios dados pelos caminhos já seguros (a Edge Function no painel, a função `get_turmas_disponiveis` no site). Como rede de segurança, o painel também confere os dados a cada 45 segundos por conta própria, caso o aviso em tempo real falhe por algum motivo.

### Reserva temporária de vaga

Assim que a família começa a digitar no formulário, a vaga escolhida fica **reservada por 10 minutos** (renovada enquanto a pessoa continua na tela) e deixa de aparecer como disponível para as outras pessoas. Se a família desistir ou fechar a página, a reserva expira sozinha. A reserva não impede o envio de quem a criou. No banco: tabela `reservas_turma` (sem acesso direto) e funções `reservar_vaga`, `renovar_reserva` e `liberar_reserva`.

Não existem outras rotas. O roteamento é feito com `react-router-dom`, e os arquivos `vercel.json` / `public/_redirects` incluídos garantem que acessar `/admin` direto na URL (sem navegar a partir de `/`) funcione em qualquer hospedagem estática — sem eles, dá erro 404. A rota `/admin` também só é baixada pelo navegador de quem realmente abre `/admin` (code-splitting): quem visita o site público não baixa o código do painel nem das bibliotecas de Excel/PDF.

---

## 3. Login do painel administrativo

Acesse `/admin` e entre com:

```
E-mail:  admin@seice.com.br
Senha:   (combinada diretamente com a secretaria — não fica registrada no repositório)
```

Por dentro, o sistema não usa um sistema de contas de usuário (não há cadastro de "vários administradores" nem recuperação de senha) — existe **uma única senha de acesso à secretaria**, validada contra um *hash* (SHA-256) guardado no banco, nunca a senha em texto puro. O campo de e-mail é a identificação visual de quem está entrando; quem realmente libera o acesso é a senha.

**Importante:** guarde essa senha com cuidado e troque-a se ela for compartilhada com alguém que não deveria ter acesso — ela dá acesso aos dados pessoais dos responsáveis (nome, CPF, telefone, e-mail) e ao controle total das turmas. Para trocar a senha, veja "Como trocar a senha do painel" mais abaixo.

---

## 4. O painel administrativo (`/admin`) — quatro abas

### Visão geral
Dashboard com os números principais: turmas ofertadas, vagas ofertadas, vagas já ocupadas, total de intenções recebidas, distribuição por status e barras de ocupação por unidade e por nível de ensino — tudo atualizado em tempo real a partir do banco, com atualização automática em segundo plano a cada ~45s enquanto a aba está aberta. Traz também um painel de **intenções pendentes recentes**, com botão de mudar status (ou cancelar direto) sem precisar abrir a aba de intenções.

### Intenções de matrícula
Lista completa de todas as famílias que enviaram intenção: data/hora, unidade, aluno, turma, responsável, CPF, telefones, e-mail e status. É possível filtrar por unidade, buscar por nome e mudar o status de cada intenção (pendente, contatado, matriculado, cancelado) direto na lista, com um botão dedicado para cancelar — a mudança é salva no banco instantaneamente e a vaga liberada some do formulário público na hora. Também é possível exportar a lista filtrada em CSV.

### Turmas
Controle total sobre as turmas oferecidas:

- **Criar uma nova turma** (botão "Nova turma"): define unidade, nível, série, código, turno, curso (para o Ensino Médio), quantos alunos já estavam matriculados antes do site (vindos da planilha original) e quantas vagas ficam disponíveis para intenção de matrícula online.
- **Editar qualquer turma existente**: alterar quantidade de vagas ofertadas, turno, curso, série, etc. — inclusive para corrigir a quantidade de vagas depois que intenções forem sendo recebidas.
- **Excluir uma turma**: remove a turma (bloqueado automaticamente, com aviso claro, se já existir alguma intenção vinculada a ela — para nunca perder dados de uma família por engano).
- A cada turma, o painel já mostra quantas intenções ela recebeu e quantas vagas restam, calculado automaticamente (vagas ofertadas − intenções recebidas). O campo interno "capacidade" do banco (histórico da planilha original) não aparece mais na tela — é calculado sozinho por trás para não confundir quem preenche.

### Relatórios
Exportação em **Excel** (`.xlsx` de verdade, com múltiplas abas) e em **PDF** para levar números à direção:

- **Relatório completo**: Resumo por unidade/nível, Turmas (detalhado) e Intenções de matrícula (todos os registros) — em uma única planilha com três abas ou em um PDF com uma página por seção.
- **Somente intenções de matrícula**: planilha ou PDF só com a lista de famílias que enviaram intenção.
- **Filtro por segmento e por turma**: dá pra restringir tanto a prévia na tela quanto os arquivos exportados a um nível de ensino (Educação Infantil, Fundamental I/II, Médio) ou a uma turma específica — útil pra mandar pra direção só o pedaço que interessa, sem precisar abrir o arquivo completo e procurar.
- Resumo visual de ocupação por unidade, nível de ensino e no geral.

As bibliotecas de Excel e PDF só são baixadas pelo navegador no momento em que alguém clica em exportar — mantém o painel rápido para quem só está consultando números.

### Senha de atendimento

Em vez de um protocolo em hexadecimal, cada intenção recebe uma **senha sequencial** (01, 02, 03...), como uma senha de balcão — mostrada na tela de confirmação da família e em toda a lista do painel, pra facilitar quando alguém liga dizendo "minha senha é 05". É gerada pelo próprio banco (coluna `numero_senha`, identity) através de uma função (`enviar_intencao`), já que o site não tem permissão de leitura na tabela para buscar esse número de volta de outro jeito.

---

## 5. Segurança — como os dados são protegidos

Resumo para quem não é técnico: **ninguém de fora consegue ler os dados pessoais das famílias** (nome, CPF, telefone, e-mail). O site público só consegue *enviar* uma intenção nova e *ler quantas vagas restam* em cada turma (um número, nada pessoal) — ele nunca consegue ler os dados de outra família. Só quem tem a senha da secretaria consegue ver a lista de intenções ou alterar turmas.

Detalhes técnicos de como isso é garantido:

- **Row Level Security (RLS) ativado em todas as tabelas** no Postgres do Supabase. Por padrão, isso bloqueia qualquer leitura/escrita — cada permissão precisa ser explicitamente liberada.
- A tabela `pre_matriculas` (nome interno no banco; guarda nome, CPF, telefone e e-mail dos responsáveis) **só permite `INSERT` pelo site público** (um formulário só consegue criar um novo registro, nunca listar os existentes). Para *ler* essa tabela é preciso passar pela Edge Function administrativa, que exige a senha.
- As vagas disponíveis (usadas para montar as opções do formulário público) são expostas através de uma **função SQL `SECURITY DEFINER`** (`get_turmas_disponiveis`), que devolve só contagens agregadas (quantas vagas restam por turma) — nunca expõe quem já enviou uma intenção.
- **Duas Edge Functions** (`admin-pre-matriculas` e `admin-turmas`, rodando no Supabase) fazem a ponte entre o painel `/admin` e os dados protegidos. Ambas exigem um cabeçalho `x-admin-token` em toda chamada; o valor enviado é comparado (com hash SHA-256) ao hash guardado na tabela `app_config` — **a senha nunca é guardada em texto puro em nenhum lugar**, nem no banco, nem no código-fonte do site.
- A tabela `app_config`, onde fica o hash da senha, tem RLS ativado **sem nenhuma política de acesso liberada** — ou seja, nem a chave pública nem a chave autenticada conseguem lê-la; só as Edge Functions (usando a chave de serviço interna do Supabase) conseguem consultá-la, e só para comparar o hash.
- Um **trigger no banco** (`check_vagas_disponiveis`) impede, no nível do banco de dados (não só na tela), que uma intenção seja criada numa turma sem vaga — mesmo que duas famílias enviem ao mesmo tempo.
- Revisão de segurança feita com o *Security Advisor* do Supabase após cada mudança estrutural, sem nenhum alerta pendente relevante (os únicos avisos restantes são intencionais e documentados, como o uso de `SECURITY DEFINER` — necessário para agregar vagas sem expor a tabela inteira).

Em resumo: o site público é "só escrita" para dados pessoais e "só leitura agregada" para vagas; o painel administrativo é protegido por senha com hash, e o banco tem travas próprias independentes da tela.

---

## 6. Como trocar a senha do painel

1. Escolha a nova senha.
2. No Supabase (SQL Editor do projeto, ou com ajuda de quem mantém o sistema), execute:
   ```sql
   update app_config
   set value = encode(digest('NOVA_SENHA_AQUI', 'sha256'), 'hex')
   where key = 'admin_token_hash';
   ```
3. Pronto — a senha antiga deixa de funcionar imediatamente, sem precisar alterar nenhum código nem publicar o site de novo.

---

## 7. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

**Atenção:** o ambiente local usa o mesmo banco de dados de produção (não há um banco "de teste" separado). Qualquer intenção enviada rodando localmente é salva de verdade, ocupa uma vaga real e aparece no painel da secretaria — depois de testar, cancele o registro em `/admin` para liberar a vaga de novo.

## 8. Antes de publicar: confira os números de WhatsApp

Edite **`src/config.ts`**:

```ts
export const UNIDADES: Unidade[] = [
  { slug: "campos-eliseos", nome: "Campos Elíseos", whatsapp: "5511987654321" },
  { slug: "jardim-primavera", nome: "Jardim Primavera", whatsapp: "5511912345678" },
];
```

Use código do país + DDD + número, só dígitos.

## 9. Build de produção

```bash
npm run build
```

Gera a pasta `dist/` (arquivos estáticos prontos para qualquer hospedagem).

## 10. Publicar

- **Vercel**: importe o repositório/pasta — já inclui `vercel.json` com o rewrite necessário para as rotas (`/admin`) funcionarem.
- **Netlify**: `netlify.com/drop` com a pasta `dist/`, ou conecte o repositório (build command `npm run build`, publish directory `dist`) — já inclui `public/_redirects` para as rotas funcionarem.

Sem esse arquivo de rewrite/redirects, acessar `/admin` diretamente (fora da navegação pelo app) dá 404 em hospedagens estáticas — por isso os dois já vêm configurados.

---

## 11. Estrutura do projeto

```
src/
  config.ts                     — URLs do Supabase, WhatsApp por unidade, níveis (edite aqui)
  types.ts                      — tipos TypeScript compartilhados
  lib/
    supabaseClient.ts            — cliente Supabase (leitura pública de vagas + envio de intenção)
    format.ts                    — máscaras e validação (CPF, telefone, e-mail)
    vagas.ts                     — cálculo de status de vagas (muitas/poucas/últimas)
    labels.ts                     — nomes de unidade/turma e resumo de ocupação compartilhados pelo painel
    adminApi.ts                  — chamadas à Edge Function do painel (intenções)
    adminTurmasApi.ts            — chamadas à Edge Function de turmas (criar/editar/excluir)
    csv.ts / excel.ts / pdf.ts   — exportação CSV, Excel (.xlsx) e PDF, carregadas sob demanda
  components/
    ui.tsx                      — componentes base (Card, Button, Badge...)
    Header.tsx / Footer.tsx / Stepper.tsx / BackgroundFX.tsx / VagasGauge.tsx
    steps/                       — cada etapa do formulário público
    admin/                       — login, abas do dashboard, modal, formulário de turma, controle de status
  pages/
    PreMatriculaPage.tsx          — fluxo público (rota "/")
    AdminPage.tsx                 — painel da secretaria (rota "/admin", carregado sob demanda)
```

## Backend (Supabase) — já configurado

- Projeto: `seice-pre-matricula` (região `sa-east-1`).
- Tabelas: `unidades`, `turmas` (turmas do ano letivo de 2027), `pre_matriculas` (intenções de matrícula), `app_config` (senha com hash). Os nomes técnicos das tabelas foram mantidos no banco por compatibilidade; só o texto visível ao usuário mudou para "intenção de matrícula".
- Edge Functions: `admin-pre-matriculas` (listar/atualizar status) e `admin-turmas` (criar/listar/editar/excluir turmas).
- Para ajustar vagas de uma turma sem usar o painel, também é possível editar a tabela `turmas` direto no Supabase — mas o jeito recomendado é pela aba **Turmas** do painel `/admin`, que já valida os dados e recalcula tudo automaticamente.

---

*Dúvidas ou ajustes (cores, textos, campos do formulário, novos anos letivos, nova senha): é só pedir.*

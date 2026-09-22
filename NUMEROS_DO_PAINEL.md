# Como os números da Visão Geral são calculados

Este documento explica a matemática por trás dos cards que aparecem no topo da aba **Visão Geral** do painel (`/admin`, `/seice-ce` e `/seice-jp`), com exemplos reais tirados do sistema no momento em que este documento foi escrito.

---

## Os cinco números

| Card | O que conta |
|---|---|
| **Turmas ofertadas** | Quantas turmas existem, cadastradas na aba Turmas. |
| **Vagas ofertadas** | A soma das vagas de cada turma (o número que a secretaria configura na aba Turmas). |
| **Vagas ocupadas** | Quantas dessas vagas já têm uma família com **vaga garantida** — não inclui quem está na lista de espera. |
| **Em lista de espera** | Famílias que se inscreveram numa turma que já estava cheia — **não ocupam vaga**, ficam na fila esperando uma desistência. |
| **Intenções recebidas** | **Todo mundo** que já se inscreveu no site, de qualquer status (pendente, contatado, matriculado ou cancelado) — já inclui os dois grupos acima. |

## A fórmula que sempre bate

```
Intenções recebidas  =  Vagas ocupadas  +  Em lista de espera  +  Cancelados
```

Ou seja: toda intenção recebida se encaixa em exatamente um desses três grupos — ou ela garantiu vaga, ou está esperando vaga, ou foi cancelada. Nunca em dois ao mesmo tempo, nunca em nenhum.

**Importante:** "Vagas ocupadas" e "Intenções recebidas" **não devem ser somados entre si** — o segundo já contém o primeiro. Pensa assim: "Intenções recebidas" é o total de gente que bateu na porta; desse total, uma parte conseguiu vaga garantida, outra parte ficou na fila, e uma pequena parte pode ter cancelado.

---

## Exemplo com os números reais de hoje

### Total (as duas unidades juntas — painel `/admin`)

| Card | Valor |
|---|---|
| Turmas ofertadas | 72 |
| Vagas ofertadas | 286 |
| Vagas ocupadas | 48 |
| Em lista de espera | 18 |
| Intenções recebidas | 69 (66 pendentes, 3 canceladas) |

Confere: `48 + 18 + 3 = 69` ✓

### SEICE CE — Campos Elíseos (painel `/seice-ce`)

| Card | Valor |
|---|---|
| Turmas ofertadas | 46 |
| Vagas ofertadas | 200 |
| Vagas ocupadas | 34 |
| Em lista de espera | 6 |
| Intenções recebidas | 43 (40 pendentes, 3 canceladas) |

Confere: `34 + 6 + 3 = 43` ✓

### SEICE JP — Jardim Primavera (painel `/seice-jp`)

| Card | Valor |
|---|---|
| Turmas ofertadas | 26 |
| Vagas ofertadas | 86 |
| Vagas ocupadas | 14 |
| Em lista de espera | 12 |
| Intenções recebidas | 26 (26 pendentes, 0 canceladas) |

Confere: `14 + 12 + 0 = 26` ✓

E, batendo os dois painéis de unidade contra o painel geral: `46+26=72` turmas, `200+86=286` vagas ofertadas, `34+14=48` vagas ocupadas, `6+12=18` em lista de espera, `43+26=69` intenções recebidas — tudo consistente entre o painel geral e os dois painéis de unidade, porque são os mesmos dados, só filtrados por unidade.

*(Esses números mudam a toda hora, conforme famílias novas se inscrevem — o que importa é a fórmula, que sempre vai bater, não os valores exatos.)*

---

## Como cada número é calculado por trás (para quem for mexer no código)

- **Vagas ofertadas** de uma turma = campo `vagas_planilha`, configurado pela secretaria na aba Turmas.
- **Vagas restantes** de uma turma = `vagas_planilha` menos quantas intenções essa turma já recebeu **sem contar** canceladas e **sem contar** lista de espera — nunca fica negativo (trava em 0).
- **Vagas ocupadas** (total ou por unidade) = soma de `vagas_planilha` menos soma de `vagas_restantes` de todas as turmas.
- **Em lista de espera** = quantidade de intenções com a marcação `lista_espera = true` (o banco marca isso sozinho, no momento do envio, quando a turma escolhida já está cheia).
- **Intenções recebidas** = quantidade total de linhas na tabela de intenções, de qualquer status.

Também vale lembrar: uma intenção na lista de espera tem sua própria **posição** (1ª, 2ª, 3ª...), contada por ordem de chegada dentro da turma dela — isso é diferente da **senha** de atendimento, que é sequencial para todo mundo (ver `LISTA_DE_ESPERA.md` para os detalhes de como a lista de espera funciona).

---

*Dúvidas ou se algum número parecer estranho: é só pedir pra conferir.*

# EJ Ledger — Solana

## Visão geral

O projeto é um **SDK de compliance financeiro para Empresas Juniores (EJs)**.

A proposta é transformar o **Regulamento Interno de Despesas (RID)** de cada organização em regras executáveis, conectando estudantes, aprovação de despesas e reembolso em um fluxo simples pelo WhatsApp.

O estudante conversa com um bot, informa a despesa e seu contexto, recebe uma resposta sobre a política aplicável e, quando necessário, solicita aprovação. Depois da compra, envia a nota fiscal pelo próprio WhatsApp e solicita o reembolso.

Por trás desse fluxo existe uma **Compliance Core** responsável por interpretar as regras do RID e tomar decisões, enquanto **Squads** atua como infraestrutura de tesouraria compartilhada e a **Solana** fornece uma camada de rastreabilidade e prova para os eventos financeiros relevantes.

> **Em uma frase:** transformamos o RID da Empresa Júnior em uma camada de compliance executável, automatizando aprovação e reembolso de despesas com rastreabilidade em blockchain.

---

# 1. Cenário atual das Empresas Juniores

Empresas Juniores são organizações formadas e geridas por estudantes, com atuação em projetos e serviços e uma dinâmica de gestão diferente de empresas tradicionais.

Na prática, isso cria um ambiente em que:

- os responsáveis pela gestão financeira e administrativa podem mudar com frequência;
- novos estudantes entram e antigos estudantes deixam a organização;
- grande parte das atividades é realizada de forma voluntária;
- despesas podem ser realizadas por estudantes em nome de atividades da EJ;
- a organização precisa controlar se cada gasto está de acordo com suas regras internas;
- comprovantes, aprovações e reembolsos precisam permanecer organizados para prestação de contas.

O **RID (Regulamento Interno de Despesas)** funciona como uma referência central para determinar quais gastos são permitidos, quais limites existem e quais despesas precisam de autorização prévia.

O desafio não é apenas definir essas regras, mas **aplicá-las de forma consistente ao longo do tempo e preservar evidências do que aconteceu**.

---

# 2. O problema

Hoje, o processo de despesas e reembolsos tende a depender de comunicação manual, interpretação humana e ferramentas desconectadas.

Um fluxo comum pode envolver:

**Estudante → WhatsApp/Chat → Responsável financeiro → Planilha/Formulário → Nota fiscal → Aprovação → Pagamento → Arquivamento**

Isso gera alguns problemas principais:

### Falta de clareza para o estudante

O estudante nem sempre sabe se determinado gasto é permitido, qual é o limite ou se precisa de aprovação antes de gastar.

### Dependência de conhecimento individual

Quem está no financeiro precisa conhecer o RID e interpretar cada situação. Quando a gestão muda, parte desse conhecimento pode ser perdida.

### Processo manual de aprovação

Uma despesa simples pode exigir conversas, mensagens e validações manuais.

### Falta de rastreabilidade ponta a ponta

A informação sobre regra, decisão, comprovante e pagamento pode ficar espalhada em diferentes sistemas.

### Dificuldade de auditoria

Depois de meses, pode ser difícil responder rapidamente:

- Quem solicitou?
- Qual regra foi utilizada?
- Quem aprovou?
- Qual comprovante foi apresentado?
- Quanto foi reembolsado?
- Quando o pagamento aconteceu?
- Aquele processo seguiu a política vigente na época?

O problema central é, portanto, **transformar uma política financeira estática em um processo operacional verificável**.

---

# 3. Público-alvo

## Público primário

**Empresas Juniores** que precisam organizar e automatizar seus processos de despesas, aprovações e reembolsos.

### Usuários dentro da EJ

**Estudante / Membro**

É quem realiza ou solicita a despesa e precisa saber rapidamente se ela é permitida.

**Responsável / Aprovador**

É quem analisa situações que exigem autorização e toma decisões de acordo com o RID.

**Financeiro / Administrador**

É responsável pela gestão da tesouraria, conferência dos comprovantes e execução dos reembolsos.

### Comprador do produto

No modelo B2B, a organização é o cliente do SDK. O estudante é o usuário final do fluxo de despesas.

---

# 4. A solução proposta — de forma simples

Nossa solução é uma **camada de compliance financeiro para EJs**.

O SDK recebe as regras do RID da organização e permite que essas regras sejam aplicadas automaticamente aos pedidos de despesa.

O estudante utiliza inicialmente um **bot no WhatsApp**:

1. Informa o tipo de despesa.
2. Informa o valor.
3. Explica o contexto da despesa.
4. O sistema verifica o RID e o papel do usuário.
5. O sistema informa se a despesa é permitida, precisa de aprovação ou não é permitida.
6. Depois da compra, o estudante envia a nota fiscal.
7. A organização valida o reembolso.
8. A tesouraria realiza o pagamento.
9. Os eventos relevantes ficam rastreáveis na blockchain.

### Resultado

O processo deixa de ser apenas uma conversa sobre despesas e passa a ser um **workflow estruturado de compliance + aprovação + reembolso + auditoria**.

---

# 5. Fluxo do usuário

## Fluxo principal

```text
Estudante
   │
   ▼
WhatsApp Bot
   │
   │ informa valor + categoria + contexto
   ▼
Compliance Core
   │
   │ consulta RID + papel do usuário
   ▼
┌───────────────────────────────┐
│ Decision                      │
│                               │
│ ✅ Permitido                  │
│ 🟡 Precisa de aprovação      │
│ ❌ Não permitido              │
└───────────────────────────────┘
   │
   │ caso autorizado
   ▼
Estudante realiza a despesa
   │
   ▼
Envia nota fiscal pelo WhatsApp
   │
   ▼
Solicitação de reembolso
   │
   ▼
Financeiro / Aprovador
   │
   ▼
Tesouraria via Squads
   │
   ▼
Pagamento do reembolso
   │
   ▼
Registro / prova na Solana
```

## Exemplo

**Estudante:**

> "Gastei R$ 80 de transporte para uma reunião com cliente do projeto XPTO."

**Compliance Core:**

> "Transporte é permitido pelo RID até R$ 100 por atividade. Esta despesa está dentro da política."

O estudante realiza a compra e posteriormente envia a nota fiscal.

A organização valida o comprovante e processa o reembolso.

---

# 6. Solução detalhada — uma infraestrutura Blockchain madura

A blockchain não deve ser utilizada como banco de dados para todas as informações do sistema.

O princípio arquitetural é:

> **Dados operacionais e documentos ficam off-chain. Evidências, estados e eventos que precisam de verificabilidade ficam on-chain.**

Assim, a blockchain funciona como uma **camada de prova, auditoria e integridade**, e não como armazenamento indiscriminado de dados.

## 6.1 Compliance Core

O **Compliance Core** é o núcleo de negócio do SDK.

Ele não depende do WhatsApp e não depende diretamente da blockchain.

Sua função é receber uma solicitação de despesa e avaliar:

```text
Expense
   +
RID / Policy
   +
User Role
   ↓
Compliance Decision
```

### Possíveis decisões

- `APPROVED` — despesa autorizada pela política para aquele contexto.
- `NEEDS_APPROVAL` — despesa possível, mas depende de autorização adicional.
- `BLOCKED` — despesa não permitida pela política.

### O Core deve preservar a lógica de negócio

O RID deve ser representado como **dados estruturados**, e não como regras hardcoded no WhatsApp.

Exemplo simplificado:

```json
{
  "version": "2026.1",
  "rules": [
    {
      "category": "transportation",
      "allowed": true,
      "maxAmount": 100
    },
    {
      "category": "food",
      "allowed": true,
      "maxAmount": 60
    },
    {
      "category": "entertainment",
      "allowed": false
    }
  ]
}
```

Isso permite que o mesmo motor seja utilizado por WhatsApp, web, outros bots ou integrações futuras.

---

## 6.2 Papéis e autorização

A solução utiliza **papéis**, e não uma complexa matriz de permissões individuais no MVP.

Arquitetura conceitual:

```text
Organization
     │
     ├── RID / Policy
     │
     └── Users
            │
            └── Role
                 ├── Member
                 ├── Approver
                 └── Finance/Admin
```

O papel determina o que o usuário pode fazer no processo.

Exemplo:

- **Member:** solicita despesas e reembolsos.
- **Approver:** aprova despesas que exigem autorização.
- **Finance/Admin:** gerencia políticas, revisa documentos e executa pagamentos.

A arquitetura permite que pessoas mudem de papel sem alterar o histórico de decisões passadas.

Cada registro relevante deve manter o **papel e a versão da política utilizados naquele momento**.

---

# 7. Blockchain: o que fica on-chain e o que fica off-chain

## 7.1 Informações que ficam off-chain

Dados operacionais, pessoais ou documentos que não precisam estar permanentemente públicos devem permanecer fora da blockchain.

Exemplos:

- nome do estudante;
- telefone do WhatsApp;
- dados de contato;
- descrição completa da despesa;
- informações pessoais;
- nota fiscal original;
- imagens e PDFs;
- documentos da organização;
- texto completo do RID;
- dados administrativos;
- histórico detalhado de conversas;
- metadados de processamento que não precisam de prova pública.

Esses dados podem ser armazenados em banco de dados e armazenamento de arquivos adequado.

---

## 7.2 Informações que podem ficar on-chain

Na blockchain devemos registrar apenas o que agrega **prova, integridade, rastreabilidade ou referência do estado financeiro**.

Exemplos:

- identificador da despesa;
- identificador da organização;
- versão/hash da política utilizada;
- resultado da decisão de compliance;
- timestamp do evento;
- referência/hash do comprovante;
- referência da aprovação;
- valor e ativo da transação quando aplicável;
- carteira de origem;
- carteira de destino;
- identificador da transação de pagamento;
- estado do reembolso;
- hashes dos documentos ou eventos relevantes.

### Exemplo conceitual

```text
Off-chain
────────────────────────────────────
Expense #184
Student: João
Purpose: reunião com cliente
Receipt: NF_184.pdf
RID document: RID_2026.pdf
Detailed approval message

                  │
                  │ hash / reference
                  ▼
On-chain
────────────────────────────────────
Expense #184
Policy: RID 2026.1
Decision: APPROVED
Timestamp: ...
Receipt hash: ...
Reimbursement TX: ...
```

Isso permite provar que uma determinada informação ou documento estava associado ao processo sem colocar o conteúdo inteiro na blockchain.

---

# 8. Squads

**Squads** funciona como a infraestrutura de treasury compartilhada.

A ideia é separar claramente dois conceitos:

### Compliance

O Compliance Core decide:

> "Esta despesa pode ser realizada?"

### Treasury

Squads controla:

> "Quem pode movimentar os recursos da organização e sob quais aprovações?"

Isso evita misturar o papel de um estudante como solicitante de despesa com o papel de um signatário da tesouraria.

Um membro comum pode solicitar um reembolso sem necessariamente ter poder para movimentar o treasury.

No MVP, os membros responsáveis pela tesouraria podem ser os signatários do Squads, enquanto os estudantes utilizam o SDK para solicitar despesas e reembolsos.

---

# 9. Helius

**Helius** atua como infraestrutura para interação com o ecossistema Solana, especialmente para leitura, indexação, parsing e acompanhamento de transações e eventos.

Ele não é a camada de negócio.

A separação é:

```text
Compliance Core
      │
      ├── Decision / Policy
      │
      └── Domain Events
             │
             ▼
      Blockchain Adapter
             │
             ▼
          Solana
             ▲
             │
           Helius
      (infra / indexing)
```

Essa separação mantém o SDK desacoplado de um fornecedor específico.

---

# 10. Arquitetura

## 10.1 Arquitetura de alto nível

```text
                    ┌────────────────────┐
                    │     EJ / Users     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   WhatsApp Bot     │
                    │    (MVP Adapter)   │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │        SDK         │
                    │                    │
                    │  Compliance Core   │
                    │  Expense Service   │
                    │  Reimbursement     │
                    │  Organization      │
                    └──────┬───────┬─────┘
                           │       │
                 ┌─────────┘       └──────────┐
                 ▼                            ▼
        ┌────────────────┐           ┌────────────────┐
        │   Off-chain    │           │    Solana      │
        │                │           │                │
        │ DB + Files     │           │ Audit / State  │
        │ Receipts       │           │ Transactions   │
        └────────────────┘           └───────┬────────┘
                                              │
                                      ┌───────┴────────┐
                                      │ Squads / Helius│
                                      └────────────────┘
```

---

## 10.2 Princípio de desacoplamento

O WhatsApp é apenas uma **interface**.

O Compliance Core não deve saber se a solicitação chegou por WhatsApp, Telegram, web ou outro canal.

A arquitetura deve permitir:

```text
WhatsApp ───────┐
Web ────────────┤
Telegram ───────┤──► SDK / API ──► Compliance Core
AI Agent ───────┘
```

Da mesma forma, a lógica de compliance não deve depender da Solana.

```text
Compliance Core
      │
      ▼
Treasury / Audit Interfaces
      │
      ├── Solana + Squads (MVP)
      └── outras implementações futuras
```

Isso mantém o produto tecnicamente mais maduro e evita transformar o MVP em uma aplicação monolítica acoplada ao WhatsApp ou à blockchain.

---

# 11. SKD — Software Development Kit

O principal produto não é o bot.

O **bot é a primeira implementação da interface do SDK**.

O valor central está na infraestrutura que outras aplicações podem consumir.

### Exemplo conceitual de API/SDK

```ts
checkExpense({
  organizationId,
  memberId,
  amount,
  category,
  purpose,
  project
})
```

Retorno:

```ts
{
  decision: "APPROVED",
  policyVersion: "2026.1",
  reason: "Transportation under daily limit",
  requiresApproval: false
}
```

Endpoints conceituais:

```text
POST /expenses
POST /expenses/{id}/check
POST /expenses/{id}/approve
POST /expenses/{id}/reject
POST /expenses/{id}/reimburse
```

O SDK pode posteriormente expor essas capacidades para diferentes produtos e canais.

---

# 12. Por que Solana?

Não existe uma exigência jurídica que determine o uso de Solana.

A escolha deve ser explicada pela **adequação da infraestrutura ao problema**.

## 12.1 Muitas operações pequenas

Um sistema de despesas pode gerar muitos eventos de baixo valor: solicitações, aprovações, pagamentos e registros.

Uma infraestrutura com custos operacionais baixos torna mais viável utilizar blockchain como camada de prova de eventos frequentes, em vez de utilizá-la apenas para grandes transferências.

## 12.2 Treasury compartilhado com Squads

Squads é uma infraestrutura construída sobre Solana para smart accounts e multisig, alinhada ao problema de uma organização que precisa compartilhar controle sobre seus recursos.

Isso cria uma combinação natural:

**Compliance Core → Squads Treasury → Solana Audit Trail**

## 12.3 Ecossistema composable

A visão do produto não termina no reembolso.

Solana permite que a arquitetura evolua utilizando diferentes primitives do ecossistema, como:

- Squads para treasury e governança;
- Jupiter para swaps e movimentação entre ativos;
- Solana Pay para pagamentos;
- protocolos como Kamino para gestão de recursos ociosos, quando fizer sentido;
- Helius para infraestrutura de dados e observabilidade.

## 12.4 A blockchain como infraestrutura, não como gimmick

O argumento principal não é simplesmente "Solana é rápida".

O argumento é:

> **EJs precisam de uma infraestrutura de treasury e auditoria que consiga registrar eventos financeiros de forma verificável, com baixo atrito operacional. Solana fornece a camada de execução e prova, enquanto Squads fornece o controle compartilhado da tesouraria.**

---

# 13. Roadmap

## Fase 1 — Compliance Treasury | MVP

**Objetivo:** criar a camada de compliance e reembolso.

- SDK de Compliance Core;
- RID estruturado em regras;
- papéis de usuário;
- bot no WhatsApp;
- verificação automática de despesas;
- aprovação manual quando necessária;
- envio de nota fiscal;
- solicitação de reembolso;
- Squads para treasury;
- registro dos eventos relevantes na Solana;
- Helius para infraestrutura de leitura/monitoramento.

### Resultado

A EJ consegue sair de um processo informal e ter um fluxo estruturado de:

**Policy → Request → Decision → Receipt → Reimbursement → Audit Trail**

---

## Fase 2 — Pix On/Off-Ramp

Permitir que a EJ entre e saia do ecossistema cripto utilizando **Pix**, por meio de parceiros especializados.

Objetivo:

- entrada de BRL;
- saída para BRL;
- reembolsos mais simples para estudantes;
- menor necessidade de o usuário final entender cripto.

A infraestrutura de Pix/on-off ramp deve ser integrada por meio de parceiros, e não construída do zero no produto.

---

## Fase 3 — Jupiter & Smart Payments

Adicionar capacidade de gerenciamento de ativos e conversão utilizando Jupiter.

Exemplos:

- converter ativos antes de um pagamento;
- escolher o ativo adequado para determinada operação;
- automatizar parte da movimentação da tesouraria.

---

## Fase 4 — Treasury Yield

Permitir que recursos temporariamente ociosos possam ser direcionados para estratégias de rendimento utilizando protocolos DeFi, como Kamino, sempre respeitando limites e políticas definidos pela organização.

A proposta não é tratar DeFi como "sem risco", mas como uma nova capacidade de **gestão de tesouraria**, sujeita a políticas, riscos de protocolo, liquidez e governança.

---

## Fase 5 — Solana Pay & Financial Operations

Expandir o SDK para cobrir outros fluxos financeiros da EJ.

Exemplo:

```text
Receita
   ↓
Treasury
   ↓
Compliance
   ↓
Despesas
   ↓
Reembolsos
   ↓
Auditoria
```

Com Solana Pay, a EJ poderia também explorar pagamentos e recebimentos diretamente conectados à sua tesouraria.

---

# 14. Visão de longo prazo

Começamos como uma **camada de compliance financeiro para Empresas Juniores**.

Nosso objetivo é evoluir para um **Financial Operating System for Junior Enterprises**.

A plataforma começa resolvendo um problema específico — **despesas, aprovações e reembolsos** — e progressivamente conecta:

**Compliance → Treasury → Pix → Payments → Swaps → Yield → Audit**

Tudo por meio de um SDK modular, com o WhatsApp como primeira interface e Solana como infraestrutura blockchain.

> **A visão é transformar a gestão financeira da EJ em uma infraestrutura programável, auditável e composable.**

---

# 15. Princípios do produto

### 1. Compliance antes do pagamento

Sempre que possível, a política deve ser consultada antes de o gasto acontecer.

### 2. Policy como dado

O RID deve ser estruturado e versionado, não codificado de forma fixa.

### 3. Blockchain como prova

Não colocar tudo on-chain. Registrar na blockchain apenas o que precisa de verificabilidade, integridade ou prova de estado.

### 4. Interfaces são substituíveis

WhatsApp é o canal inicial, não o produto.

### 5. Treasury é separado de compliance

O Compliance Core decide a política; Squads controla a movimentação dos recursos.

### 6. Histórico é imutável

Mudanças de gestão, papéis ou versões do RID não devem reescrever decisões passadas.

### 7. MVP primeiro, ecossistema depois

O primeiro produto resolve um problema concreto muito bem: **autorizar e reembolsar despesas com rastreabilidade**.

---

# 16. MVP em uma tela

```text
                EMPRESA JÚNIOR
                       │
                       ▼
              ┌─────────────────┐
              │ WhatsApp Bot    │
              └────────┬────────┘
                       │
              "Posso gastar?"
                       │
                       ▼
              ┌─────────────────┐
              │ Compliance Core │
              │                 │
              │ RID + Role      │
              └────────┬────────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          APPROVED   APPROVAL   BLOCKED
             │         │
             └────┬────┘
                  │
                  ▼
             Compra feita
                  │
                  ▼
             Nota Fiscal
                  │
                  ▼
              Reembolso
                  │
                  ▼
          ┌───────────────┐
          │    Squads     │
          │    Treasury   │
          └───────┬───────┘
                  │
                  ▼
                Solana
             Audit Trail
                  │
                  ▼
           Tudo rastreável
```

# EJ Compliance Core
## Product Requirements Document (PRD)

**Version:** 1.0  
**Hackathon MVP**  
**Target build time:** 12 hours  
**Team:** 1 developer  
**Primary implementation:** TypeScript  
**Blockchain:** Solana Devnet  
**Infrastructure:** Helius  
**Treasury:** Squads — integration-ready, but not required for the MVP  
**Frontend:** Next.js + Tailwind + shadcn/ui  
**Primary goal:** Build a reusable Compliance Core API and SDK capable of evaluating Junior Enterprise expenses against structured internal expense policies.

---

# 1. Executive Summary

Junior Enterprises (EJs) operate with internal financial policies, commonly represented by a **Regulamento Interno de Despesas (RID)**.

The problem is not simply having the policy. The problem is consistently applying it whenever a student requests or makes an expense.

Today, this process can depend on manual communication, individual knowledge, spreadsheets, forms, and disconnected approval processes. This makes it difficult for students to know whether an expense is allowed and difficult for organizations to preserve evidence of how a decision was made.

The **EJ Compliance Core** converts a structured RID into an executable policy engine.

A client application sends:

- Organization
- User/member
- Expense amount
- Expense category
- Context/purpose

The Compliance Core evaluates the request against the organization's policy and returns:

- `APPROVED`
- `NEEDS_APPROVAL`
- `BLOCKED`

The Core is exposed through an HTTP API and distributed through a TypeScript SDK.

The hackathon MVP will prioritize:

> **Policy → Expense → Decision → Verifiable Proof**

The system will not attempt to build a complete financial management platform.

---

# 2. Product Vision

## Long-term Vision

Build a **Financial Operating System for Junior Enterprises**, beginning with compliance and eventually connecting:

> Compliance → Treasury → Pix → Payments → Swaps → Yield → Audit

This broader vision is explicitly described as the long-term direction of the project.

## Hackathon Vision

For the hackathon, the product must prove one simple proposition:

> **An EJ's financial policy can become programmable infrastructure that applications can consume and trust.**

The demo should therefore focus on the Compliance Core rather than attempting to demonstrate every component of the future platform.

---

# 3. Problem Statement

## Current Problem

An EJ member may need to know:

> "Can I spend R$80 on transportation for a client meeting?"

Today, answering that question may require:

1. Finding the RID.
2. Understanding the applicable rule.
3. Asking someone from Finance.
4. Waiting for a response.
5. Potentially requesting approval.
6. Keeping evidence of the decision.

This creates:

- uncertainty for members;
- dependency on financial administrators;
- inconsistent interpretation of policies;
- manual approval processes;
- weak auditability;
- difficulty preserving historical decisions.

## Product Problem

The core problem is:

> **How can an EJ turn its financial policy into a reusable, executable, and auditable decision system?**

---

# 4. Target Users

## Primary Customer

**Junior Enterprises**

The organization is the B2B customer of the SDK/API.

## Primary End User

**EJ Member / Student**

Needs to quickly determine whether an expense is permitted.

## Secondary Users

### Approver

Responsible for expenses requiring additional authorization.

### Finance/Admin

Responsible for managing policies, reviewing evidence, and eventually managing treasury.

For the hackathon MVP, these roles are represented primarily as data rather than full user-management functionality.

---

# 5. Product Scope

## In Scope

The MVP must provide:

1. Structured expense policy.
2. Compliance decision engine.
3. REST API.
4. TypeScript SDK.
5. Solana proof of compliance decision.
6. Simple consumer application.
7. Optional WhatsApp adapter if sufficient time remains.

## Out of Scope

The MVP will NOT implement:

- full authentication;
- user registration;
- database;
- complete organization management;
- full WhatsApp production integration;
- invoice upload;
- OCR;
- reimbursement processing;
- Pix;
- complete Squads treasury management;
- DeFi;
- Jupiter;
- yield strategies;
- complex permission systems.

These are future roadmap capabilities, not hackathon requirements.

---

# 6. Product Architecture

The architecture must maintain clear separation between the policy engine, interfaces, and blockchain.

```text
                    CLIENT APPLICATION
                           │
             ┌─────────────┴─────────────┐
             │                           │
          Web App                   WhatsApp
             │                    (optional)
             │                           │
             └─────────────┬─────────────┘
                           │
                           ▼
                    TypeScript SDK
                           │
                           ▼
                      REST API
                           │
                           ▼
                 ┌──────────────────┐
                 │ Compliance Core  │
                 │                  │
                 │ Policy Engine    │
                 │ Decision Engine  │
                 └────────┬─────────┘
                          │
                 ┌────────┴────────┐
                 │                 │
                 ▼                 ▼
            Policy Data       Proof Service
                 │                 │
                 │                 ▼
                 │              Helius
                 │                 │
                 │                 ▼
                 │              Solana
                 │
                 ▼
             JSON Policy
```

The source architecture explicitly establishes that the Compliance Core should not depend on WhatsApp or directly on blockchain infrastructure.

---

# 7. Core Product Principle

## Compliance Core

The Compliance Core receives:

```text
Expense
+
Policy
+
User Role
↓
Compliance Decision
```

The possible decisions are:

```text
APPROVED
NEEDS_APPROVAL
BLOCKED
```

This is the central business logic of the product.

The API, SDK, frontend, WhatsApp interface, and blockchain integration must all consume this core rather than duplicate its logic.

---

# 8. Policy Model

The RID must be represented as structured data.

The policy must NOT be hardcoded into the frontend or API endpoint logic.

Example:

```typescript
const policy = {
  version: "2026.1",
  rules: [
    {
      category: "transportation",
      allowed: true,
      maxAmount: 100
    },
    {
      category: "food",
      allowed: true,
      maxAmount: 60
    },
    {
      category: "entertainment",
      allowed: false
    }
  ]
};
```

This follows the project's principle that policy should be represented as data and versioned rather than embedded directly into interface logic.

---

# 9. Expense Model

The minimum expense object is:

```typescript
interface Expense {
  organizationId: string;
  memberId: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
}
```

Optional:

```typescript
interface Expense {
  project?: string;
}
```

The conceptual SDK interface already defines the core parameters as organization, member, amount, category, purpose, and project.

---

# 10. Compliance Decision Model

The API must return:

```typescript
interface ComplianceDecision {
  decision:
    | "APPROVED"
    | "NEEDS_APPROVAL"
    | "BLOCKED";

  policyVersion: string;

  reason: string;

  requiresApproval: boolean;
}
```

Example:

```json
{
  "decision": "APPROVED",
  "policyVersion": "2026.1",
  "reason": "Transportation under daily limit",
  "requiresApproval": false
}
```

---

# 11. Decision Rules

The MVP only needs deterministic rule evaluation.

## Rule 1 — Category Not Allowed

If:

```text
allowed = false
```

Return:

```text
BLOCKED
```

## Rule 2 — Amount Within Limit

If:

```text
allowed = true
AND amount <= maxAmount
```

Return:

```text
APPROVED
```

## Rule 3 — Amount Above Limit

If the expense is a valid category but exceeds the allowed limit:

```text
NEEDS_APPROVAL
```

or `BLOCKED`, depending on the policy configuration.

For the hackathon demo, the recommended default is:

```text
over limit → NEEDS_APPROVAL
```

This demonstrates all three possible states without requiring a complex approval system.

## Rule 4 — Unknown Category

Return:

```text
BLOCKED
```

Reason:

```text
Category is not defined in the organization's policy.
```

---

# 12. Stage 1 — Project Foundation

## Objective

Create the monorepo/project structure and establish the separation between Core, API, SDK, and consumers.

## Recommended Structure

```text
ej-compliance/
│
├── apps/
│   ├── api/
│   └── demo/
│
├── packages/
│   ├── core/
│   └── sdk/
│
├── policies/
│   └── demo-rid.json
│
├── package.json
└── README.md
```

## Responsibilities

### `packages/core`

Pure business logic.

Must NOT depend on:

- Next.js
- HTTP
- Solana
- Helius
- WhatsApp

### `apps/api`

HTTP adapter around the Core.

### `packages/sdk`

Developer-friendly interface for consuming the API.

### `apps/demo`

Simple frontend consumer.

## Acceptance Criteria

- [ ] Project installs successfully.
- [ ] Core can be imported independently.
- [ ] API can be started independently.
- [ ] SDK can be imported independently.
- [ ] Frontend can consume the SDK.
- [ ] No business rules exist inside the frontend.
- [ ] No business rules exist inside HTTP controllers.

---

# 13. Stage 2 — Compliance Core

## Objective

Implement the deterministic policy engine.

## Required Function

```typescript
checkExpense({
  expense,
  policy
});
```

## Required Behavior

### Approved Case

Input:

```text
Transportation
R$80
Limit: R$100
```

Output:

```text
APPROVED
```

### Approval Case

Input:

```text
Transportation
R$120
Limit: R$100
```

Output:

```text
NEEDS_APPROVAL
```

### Blocked Case

Input:

```text
Entertainment
R$50
Allowed: false
```

Output:

```text
BLOCKED
```

## Acceptance Criteria

- [ ] Core accepts structured policy data.
- [ ] Core accepts an expense object.
- [ ] Core returns one of the three supported decisions.
- [ ] Core returns the policy version.
- [ ] Core returns a human-readable reason.
- [ ] Core determines `requiresApproval`.
- [ ] Core contains no HTTP code.
- [ ] Core contains no Solana code.
- [ ] Core contains no UI code.
- [ ] At least 3 automated tests cover APPROVED, NEEDS_APPROVAL, and BLOCKED.
- [ ] Changing the JSON policy changes the decision without changing business logic code.

**Definition of Done:** The Compliance Core can independently answer "Can I make this expense?" using only an expense and a policy.

---

# 14. Stage 3 — Compliance API

## Objective

Expose the Core through a minimal HTTP API.

The source architecture describes the API conceptually through endpoints such as `/expenses`, `/check`, `/approve`, `/reject`, and `/reimburse`. For the hackathon, only the compliance-check capability is required.

## MVP Endpoint

### `POST /v1/expenses/check`

Request:

```json
{
  "organizationId": "ej-demo",
  "memberId": "member-001",
  "amount": 80,
  "currency": "BRL",
  "category": "transportation",
  "purpose": "Client meeting"
}
```

Response:

```json
{
  "decision": "APPROVED",
  "policyVersion": "2026.1",
  "reason": "Transportation under daily limit",
  "requiresApproval": false
}
```

## Optional Endpoint

### `GET /v1/policies/:organizationId`

Returns the current policy.

This endpoint is optional and should only be implemented if it takes minimal effort.

## Error Responses

Invalid request:

```text
400 Bad Request
```

Example:

```json
{
  "error": "amount must be greater than zero"
}
```

## Acceptance Criteria

- [ ] API starts locally.
- [ ] `POST /v1/expenses/check` works.
- [ ] Valid expense produces a Compliance Decision.
- [ ] Invalid input produces a controlled 4xx response.
- [ ] API uses the Core instead of duplicating policy logic.
- [ ] API response is JSON.
- [ ] API can be tested independently with curl/Postman.
- [ ] No database is required.
- [ ] Policy can be loaded from the local structured policy file.

**Definition of Done:** An external application can send an expense to the API and receive a reliable compliance decision.

---

# 15. Stage 4 — Compliance SDK

## Objective

Make the Compliance API easy for developers to consume.

The SDK is strategically important because the project is positioned as an **SDK**, not merely a standalone bot. The source explicitly states that the bot is an interface to the SDK and that the core value lies in reusable infrastructure.

## SDK Interface

Recommended:

```typescript
import { ComplianceClient } from "@ej-compliance/sdk";

const compliance = new ComplianceClient({
  baseUrl: "http://localhost:3000"
});

const result = await compliance.checkExpense({
  organizationId: "ej-demo",
  memberId: "member-001",
  amount: 80,
  currency: "BRL",
  category: "transportation",
  purpose: "Client meeting"
});
```

Response:

```typescript
{
  decision: "APPROVED",
  policyVersion: "2026.1",
  reason: "Transportation under daily limit",
  requiresApproval: false
}
```

## SDK Requirements

The SDK should:

- abstract HTTP requests;
- provide TypeScript types;
- expose `checkExpense()`;
- normalize API errors;
- require minimal configuration.

## Acceptance Criteria

- [ ] SDK can be imported as a package.
- [ ] SDK exposes `checkExpense()`.
- [ ] SDK accepts the required expense fields.
- [ ] SDK communicates with the API.
- [ ] SDK returns a typed Compliance Decision.
- [ ] SDK hides raw `fetch`/HTTP implementation from consumers.
- [ ] SDK has a minimal README/example.
- [ ] Demo application uses the SDK rather than calling the API directly.

**Definition of Done:** A developer can integrate compliance into an application with a few lines of TypeScript.

---

# 16. Stage 5 — Blockchain Proof

## Objective

Provide verifiable evidence that a compliance decision occurred under a specific policy version.

The blockchain should NOT contain the complete RID, personal information, receipt files, or detailed expense context.

The intended architecture is:

> **Operational data off-chain + evidence on-chain.**

This is a core architectural principle of the project.

## Data to Hash

Create a deterministic proof payload:

```typescript
{
  organizationId,
  policyVersion,
  policyHash,
  expenseHash,
  decision,
  timestamp
}
```

Generate:

```text
proofHash
```

The actual implementation may use SHA-256 or another deterministic cryptographic hash available in the chosen environment.

## On-chain Data

The MVP should record only the proof/reference.

Example conceptual payload:

```text
EJ_COMPLIANCE
policyHash: abc123...
expenseHash: def456...
decision: APPROVED
```

Do NOT put:

- student's name;
- phone;
- WhatsApp conversation;
- receipt;
- complete RID;
- personal data.

The source explicitly recommends keeping these off-chain.

## Infrastructure

Use:

```text
Application
   ↓
Solana Devnet
   ↑
Helius
```

Helius is infrastructure for interaction, reading, indexing, and monitoring; it is not part of the business logic.

## Acceptance Criteria

- [ ] A compliance decision can generate a deterministic proof.
- [ ] Policy version is included in the proof.
- [ ] Policy hash is included.
- [ ] Expense data is represented by a hash rather than raw personal information.
- [ ] Proof can be submitted to Solana Devnet.
- [ ] Transaction signature is returned.
- [ ] Transaction can be independently viewed on Solana Explorer.
- [ ] Blockchain code is isolated from Compliance Core.
- [ ] Failure to write to blockchain does not change the underlying compliance decision.

**Definition of Done:** The demo can show that an APPROVED decision has a corresponding verifiable Solana transaction.

---

# 17. Stage 6 — Simple Frontend Consumer

## Objective

Create the smallest possible UI proving that an external application can consume the SDK.

This stage is intentionally last.

If time is running out, this stage can be reduced to a minimal developer/demo interface or skipped in favor of WhatsApp.

## UI

Single screen:

```text
┌──────────────────────────────────────┐
│          EJ COMPLIANCE               │
│                                      │
│  Can I make this expense?            │
│                                      │
│  Category                            │
│  [ Transportation          ▼ ]       │
│                                      │
│  Amount                              │
│  [ R$ 80                  ]          │
│                                      │
│  Purpose                             │
│  [ Client meeting         ]          │
│                                      │
│          [ CHECK EXPENSE ]           │
│                                      │
└──────────────────────────────────────┘
```

After submission:

```text
┌──────────────────────────────────────┐
│             ✓ APPROVED               │
│                                      │
│ Transportation                       │
│ R$80                                 │
│                                      │
│ Policy limit: R$100                  │
│ Policy: RID 2026.1                   │
│                                      │
│ Transportation under daily limit    │
│                                      │
│ [ CREATE PROOF ]                     │
└──────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] User can enter category.
- [ ] User can enter amount.
- [ ] User can enter purpose.
- [ ] UI uses SDK.
- [ ] UI does not contain policy logic.
- [ ] UI displays the decision clearly.
- [ ] UI displays policy version.
- [ ] UI displays the reason.
- [ ] User can trigger proof creation.
- [ ] Transaction signature is displayed after successful proof creation.

**Definition of Done:** A judge can understand the entire product without seeing the source code.

---

# 18. Stage 7 — WhatsApp Adapter (Optional / Time Permitting)

## Priority

This stage is **strictly optional**.

It should only be implemented after the Compliance Core, API, SDK, and proof flow are working.

The WhatsApp interface should simply translate conversational input into the SDK/API request.

Example:

```text
Student:
"Gastei R$80 de transporte para uma reunião
com o cliente XPTO."

        ↓

WhatsApp Adapter

        ↓

SDK

        ↓

Compliance API

        ↓

Compliance Core

        ↓

APPROVED
```

Response:

```text
✅ Expense approved

Transportation is allowed up to R$100
according to RID 2026.1.

Your expense: R$80.
```

The architectural advantage is that WhatsApp remains replaceable because the Core knows nothing about the interface.

## Acceptance Criteria

Only attempt this if all previous mandatory stages are complete.

- [ ] User can send an expense description.
- [ ] Adapter extracts the minimum required fields.
- [ ] Adapter calls the SDK/API.
- [ ] User receives the Compliance Decision.
- [ ] No compliance logic exists inside WhatsApp code.
- [ ] Existing web/demo consumer continues working.

**Hard rule:** Never sacrifice a working Compliance Core/API for WhatsApp integration.

---

# 19. Squads Integration Strategy

Squads is part of the broader treasury architecture.

Its conceptual responsibility is:

> **Compliance decides whether an expense is allowed. Squads controls who can move treasury funds.**

This separation is central to the architecture.

However, a complete Squads integration is NOT mandatory for the 12-hour MVP.

## MVP Positioning

During the demo:

```text
Compliance Core
      ↓
Decision
      ↓
Proof
      ↓
Solana

          ┌───────────────┐
          │ Future        │
          │ Squads        │
          │ Treasury      │
          └───────────────┘
```

If integration is extremely easy and all mandatory functionality is already working, Squads can be connected as a bonus.

Otherwise:

> **Do not implement Squads at the expense of the Compliance Core.**

---

# 20. Data Architecture

## MVP

No database.

Use:

```text
JSON Policy
+
In-memory request
+
Solana proof
```

## Off-Chain

Conceptually belongs off-chain:

- member information;
- phone numbers;
- detailed expense descriptions;
- receipts;
- PDFs;
- complete RID;
- conversation history;
- administrative information.



## On-Chain

Only proof-oriented information:

- organization identifier;
- policy version/hash;
- decision;
- timestamp;
- expense/document hash;
- transaction reference.



---

# 21. API Contract

## `POST /v1/expenses/check`

### Request

```typescript
{
  organizationId: string;
  memberId: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
  project?: string;
}
```

### Success Response

```typescript
{
  decision:
    | "APPROVED"
    | "NEEDS_APPROVAL"
    | "BLOCKED";

  policyVersion: string;

  reason: string;

  requiresApproval: boolean;
}
```

### Example

```json
{
  "decision": "APPROVED",
  "policyVersion": "2026.1",
  "reason": "Transportation under daily limit",
  "requiresApproval": false
}
```

---

# 22. SDK Contract

## Constructor

```typescript
new ComplianceClient({
  baseUrl: string
});
```

## Method

```typescript
checkExpense(expense): Promise<ComplianceDecision>
```

## Example

```typescript
const client = new ComplianceClient({
  baseUrl: "http://localhost:3000"
});

const result = await client.checkExpense({
  organizationId: "ej-demo",
  memberId: "member-001",
  amount: 80,
  currency: "BRL",
  category: "transportation",
  purpose: "Client meeting"
});
```

---

# 23. Testing Requirements

Testing should prioritize the business logic.

## Core Tests

### Test 1

```text
Transportation
R$80
Limit R$100
→ APPROVED
```

### Test 2

```text
Transportation
R$120
Limit R$100
→ NEEDS_APPROVAL
```

### Test 3

```text
Entertainment
R$50
Allowed false
→ BLOCKED
```

### Test 4

```text
Unknown category
→ BLOCKED
```

### Test 5

```text
Invalid amount
→ validation error
```

## Acceptance Criteria

- [ ] All five scenarios work.
- [ ] Tests run automatically.
- [ ] Core tests do not require Solana.
- [ ] Core tests do not require Helius.
- [ ] Core tests do not require frontend.
- [ ] Core behavior is deterministic.

---

# 24. Error Handling

The API should distinguish:

## Business Decision

```text
200 OK
```

Even when the expense is:

```text
BLOCKED
```

Because the API successfully evaluated the request.

## Invalid Request

```text
400 Bad Request
```

## Internal Failure

```text
500 Internal Server Error
```

## Blockchain Failure

Blockchain proof failure must NOT turn an otherwise valid compliance decision into a different compliance decision.

Example:

```text
Compliance:
APPROVED

Proof:
FAILED
```

The UI should show:

```text
✓ Expense approved

⚠ Unable to create blockchain proof.
Please retry.
```

This preserves the separation between compliance logic and infrastructure.

---

# 25. Security & Privacy Requirements

The MVP must follow one critical principle:

> **Never put sensitive operational data directly on-chain.**

Never store on-chain:

- personal names;
- phone numbers;
- WhatsApp messages;
- receipt contents;
- PDFs;
- complete policy documents;
- unnecessary personal information.

Instead:

```text
Sensitive Data
     ↓
Off-chain

Proof of Data
     ↓
Hash
     ↓
Solana
```

This aligns with the project's blockchain architecture.

---

# 26. Demo Scenarios

The demo should contain three prepared scenarios.

## Scenario A — Approved

```text
Transportation
R$80
Client meeting
```

Expected:

```text
APPROVED
```

## Scenario B — Requires Approval

```text
Transportation
R$120
Client meeting
```

Expected:

```text
NEEDS_APPROVAL
```

## Scenario C — Blocked

```text
Entertainment
R$50
Team event
```

Expected:

```text
BLOCKED
```

The first scenario should then generate the blockchain proof.

---

# 27. Two-Minute Demo Flow

## 0:00–0:20 — Problem

> "Every EJ has rules for how members can spend organizational money. But the RID is usually a document people have to interpret manually."

## 0:20–0:40 — Policy

Show:

```text
Transportation → max R$100
Food → max R$60
Entertainment → not allowed
```

Explain:

> "We turned this policy into executable infrastructure."

## 0:40–1:00 — API/SDK

Show the application making:

```typescript
client.checkExpense(...)
```

Result:

```text
APPROVED
```

## 1:00–1:20 — Different decisions

Change:

```text
R$80 → APPROVED
R$120 → NEEDS_APPROVAL
Entertainment → BLOCKED
```

## 1:20–1:45 — Blockchain

Click:

```text
Create Proof
```

Show:

```text
Policy Hash
Expense Hash
Decision
Timestamp
Solana TX
```

Open the transaction.

## 1:45–2:00 — Vision

> "The important part is that this isn't a finance app tied to one interface. It's a Compliance Core that any application can consume — today through our demo, potentially through WhatsApp, and eventually connected to Squads treasury."

---

# 28. Definition of MVP Success

The MVP is successful if a developer can:

```text
Define Policy
      ↓
Submit Expense
      ↓
Receive Decision
      ↓
Generate Proof
      ↓
Verify Proof on Solana
```

And another application can do this through:

```typescript
Compliance SDK
```

without implementing the compliance rules itself.

---

# 29. Global Acceptance Criteria

The project is considered **MVP complete** when all of the following are true:

### Core

- [ ] Structured policy exists.
- [ ] Expense can be evaluated.
- [ ] APPROVED works.
- [ ] NEEDS_APPROVAL works.
- [ ] BLOCKED works.
- [ ] Policy version is returned.
- [ ] Human-readable reason is returned.

### API

- [ ] API exposes compliance check.
- [ ] API validates input.
- [ ] API delegates to Core.
- [ ] API works independently.

### SDK

- [ ] SDK exposes `checkExpense()`.
- [ ] SDK hides HTTP implementation.
- [ ] SDK returns typed results.
- [ ] Demo consumes SDK.

### Blockchain

- [ ] Decision generates proof.
- [ ] Proof contains policy hash/version.
- [ ] Proof does not expose sensitive information.
- [ ] Proof is submitted to Solana Devnet.
- [ ] Transaction can be verified.

### Consumer

- [ ] A simple frontend or WhatsApp adapter consumes the SDK.
- [ ] User can see the decision.
- [ ] User can see the proof result.

---

# 30. Hard Timeboxing Strategy

The project must be developed in this exact priority order:

```text
P0 — MUST WORK
│
├── Compliance Core
├── API
├── SDK
└── Blockchain Proof
│
P1 — DEMO
│
├── Simple Frontend
└── Wallet connection
│
P2 — BONUS
│
├── WhatsApp
└── Squads
```

## If 6 Hours Remain

Stop adding architecture.

Finish:

```text
Core → API → SDK → Proof
```

## If 3 Hours Remain

Build the frontend.

## If 1 Hour Remains

Polish the demo.

## If Everything Is Working

Only then attempt WhatsApp.

---

# 31. 12-Hour Execution Plan

## Hour 0–1 — Foundation

- [ ] Initialize repository.
- [ ] Create workspace structure.
- [ ] Configure TypeScript.
- [ ] Create policy JSON.
- [ ] Define shared types.

**Checkpoint:** Project architecture compiles.

---

## Hour 1–3 — Compliance Core

- [ ] Implement policy loader.
- [ ] Implement rule evaluator.
- [ ] Implement decision model.
- [ ] Add tests.
- [ ] Validate all three decisions.

**Checkpoint:** Core independently evaluates expenses.

---

## Hour 3–5 — API

- [ ] Create HTTP server.
- [ ] Implement `/v1/expenses/check`.
- [ ] Add validation.
- [ ] Connect API to Core.
- [ ] Test with curl.

**Checkpoint:** External HTTP client receives decisions.

---

## Hour 5–6:30 — SDK

- [ ] Create SDK package.
- [ ] Implement `ComplianceClient`.
- [ ] Implement `checkExpense()`.
- [ ] Add types.
- [ ] Test SDK against API.

**Checkpoint:** Consumer can call the API without knowing HTTP details.

---

## Hour 6:30–8:30 — Blockchain Proof

- [ ] Configure Solana Devnet.
- [ ] Configure Helius.
- [ ] Implement deterministic hashing.
- [ ] Create proof transaction.
- [ ] Return transaction signature.
- [ ] Verify on Explorer.

**Checkpoint:** APPROVED decision → Solana proof.

---

## Hour 8:30–10 — Frontend

- [ ] Create Next.js page.
- [ ] Add expense form.
- [ ] Connect SDK.
- [ ] Display decision.
- [ ] Display policy details.
- [ ] Add proof button.
- [ ] Display transaction.

**Checkpoint:** Complete end-to-end demo works.

---

## Hour 10–11 — Demo Polish

- [ ] Add prepared scenarios.
- [ ] Improve loading states.
- [ ] Improve decision cards.
- [ ] Add error handling.
- [ ] Remove unnecessary UI.
- [ ] Test complete demo from beginning to end.

---

## Hour 11–12 — Optional WhatsApp / Buffer

If everything is stable:

1. Attempt WhatsApp adapter.
2. Otherwise improve frontend.
3. Otherwise improve blockchain visualization.
4. Otherwise rehearse the pitch.

**Never use the final hour to rewrite the Core.**

---

# 32. Technical Non-Goals

The following should explicitly NOT be implemented during the hackathon:

### Backend

- PostgreSQL
- Prisma
- Redis
- complex authentication
- user management
- organization management
- queues
- microservices
- cloud deployment unless required

### Compliance

- AI interpretation of arbitrary RID documents
- natural-language policy parser
- complex policy DSL
- dynamic policy editor
- multi-organization administration
- sophisticated RBAC

### Finance

- actual reimbursement
- Pix
- bank integration
- crypto on/off-ramp
- treasury management
- swaps
- yield

### Blockchain

- custom Solana program unless absolutely necessary
- complex smart contracts
- NFT-based receipts
- storing documents on-chain
- full Squads workflow

### Frontend

- dashboards
- analytics
- navigation system
- complex authentication
- responsive perfection
- design system beyond basic shadcn components

---

# 33. Future Roadmap

The hackathon MVP is the foundation for:

## Phase 1

```text
Compliance Core
+
RID
+
Expense Decisions
+
Audit Proof
```

## Phase 2

```text
WhatsApp
+
Reimbursements
+
Squads Treasury
```

## Phase 3

```text
Pix On/Off-Ramp
```

## Phase 4

```text
Jupiter
+
Smart Payments
```

## Phase 5

```text
Treasury Yield
+
Solana Pay
```

This follows the project's existing roadmap from Compliance Treasury through Pix, Jupiter, treasury yield, and broader financial operations.

---

# 34. Final Product Definition

The hackathon product should NOT be presented as:

> "A finance management app for EJs."

It should be presented as:

> **"An executable compliance infrastructure for Junior Enterprises."**

The architecture demonstrates:

```text
RID
 │
 ▼
Structured Policy
 │
 ▼
Compliance Core
 │
 ▼
API
 │
 ▼
SDK
 │
 ├──────────────► Web
 │
 └──────────────► WhatsApp
 │
 ▼
Compliance Decision
 │
 ▼
Cryptographic Proof
 │
 ▼
Solana
```

The core insight is that **the policy becomes programmable infrastructure**.

The blockchain is not the product.

The WhatsApp bot is not the product.

The frontend is not the product.

**The Compliance Core is the product.**

Everything else demonstrates how that infrastructure can be consumed, integrated, and eventually connected to treasury and financial operations.
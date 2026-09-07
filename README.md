# EJ Ledger

Executable expense compliance for Junior Enterprises.

This MVP turns a structured RID policy into deterministic expense decisions and optional wallet-signed Solana devnet proof.

## Architecture

```text
RID JSON -> Compliance Core -> API -> SDK -> Demo UI -> Wallet Standard-signed Memo proof
```

The Compliance Core is pure business logic. It does not import HTTP, Solana, Helius, wallets, filesystem APIs, UI code, WhatsApp, or Telegram.

The Solana boundary uses current Solana defaults: the browser demo discovers Phantom and Solflare through Wallet Standard-compatible connectors, while the API broadcasts signed base64 wire transactions through `@solana/kit` RPC.

## Setup

```bash
npm install
npm run test
npm run typecheck
npm run build
```

Optional environment:

```bash
cp .env.example .env.local
```

Then edit values if needed:

```bash
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WS_URL=wss://api.devnet.solana.com
```

If `HELIUS_RPC_URL` is not set, the API falls back to public Solana devnet RPC.

## Run Locally

Start the API:

```bash
npm run dev:api
```

Start the demo:

```bash
npm run dev:demo
```

Open:

```text
http://localhost:3000
```

Install Phantom or Solflare, switch to devnet, and fund the wallet with devnet SOL before creating proof.

Recommended final gates:

```bash
npm run test
npm run typecheck
npm run build
```

Run `typecheck` and `build` sequentially. Next.js generates route types under `.next`, so running both at the same time can race on generated files.

## API Examples

Approved:

```bash
curl -s http://localhost:8787/v1/expenses/check \
  -H 'content-type: application/json' \
  -d '{"organizationId":"ej-demo","memberId":"member-001","amount":80,"currency":"BRL","category":"transportation","purpose":"Client meeting"}'
```

Needs approval:

```bash
curl -s http://localhost:8787/v1/expenses/check \
  -H 'content-type: application/json' \
  -d '{"organizationId":"ej-demo","memberId":"member-001","amount":120,"currency":"BRL","category":"transportation","purpose":"Client meeting"}'
```

Blocked:

```bash
curl -s http://localhost:8787/v1/expenses/check \
  -H 'content-type: application/json' \
  -d '{"organizationId":"ej-demo","memberId":"member-001","amount":50,"currency":"BRL","category":"entertainment","purpose":"Team event"}'
```

Proof intent:

```bash
curl -s http://localhost:8787/v1/proofs/intent \
  -H 'content-type: application/json' \
  -d '{"organizationId":"ej-demo","memberId":"member-001","amount":80,"currency":"BRL","category":"transportation","purpose":"Client meeting"}'
```

## Manual Wallet Smoke Test

1. Start the API and demo.
2. Open `http://localhost:3000`.
3. Connect Phantom or Solflare on devnet.
4. Click the approved scenario.
5. Check the expense.
6. Create proof.
7. Review the displayed transaction summary, then approve the simulated Memo transaction in your wallet.
8. Open the returned Solana Explorer devnet link.

## Privacy

Never put sensitive operational data directly on-chain. The proof memo contains hashes and decision metadata only. Do not include names, phone numbers, receipt contents, full RID documents, raw WhatsApp/Telegram messages, or detailed expense purpose text in the memo.

## Demo Pitch

Every EJ has a RID, but members still ask finance whether an expense is allowed. EJ Ledger turns the RID into executable infrastructure: an API and SDK that return a deterministic compliance decision. The demo then signs a Solana devnet memo with Phantom or Solflare to prove that the decision existed under a specific policy version. Future adapters can connect the same Core to WhatsApp, Telegram, or Squads without changing compliance logic.

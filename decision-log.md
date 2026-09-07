# Decision Log

## 2026-09-07 - Implementation Resume

- Decision: Continue implementing the phased PRD plan from the existing partial Phase 0/1 state.
- Rationale: The workspace already contains the npm workspace foundation, Core package, demo RID policy, and Core tests from the interrupted implementation.
- Files intentionally changed so far: root package/config files, `brand.md`, `policies/demo-rid.json`, `packages/core`.
- Gate status before resume: latest known root tests and Core typecheck passed; Core workspace test was fixed with local Vitest config and passed.
- Process rule: If implementation hits an unplanned architecture/dependency/API/signing decision, stop and ask before modifying further.

## 2026-09-07 - Planned Technical Defaults

- Decision: Use Hono for `apps/api`.
- Rationale: Hono was selected in the accepted implementation plan as the thin HTTP adapter.
- Decision: Keep Compliance Core pure and independent from Proof, Solana, HTTP, UI, filesystem, and environment access.
- Rationale: This is the main architectural invariant from the PRD and validation work.
- Decision: Use wallet signing for the MVP, behind a `ProofSigner` abstraction.
- Rationale: Supports current browser demo and future WhatsApp/Telegram/server signers without affecting the Core.
- Decision: Use Solana Memo Program for proof transactions; no custom Solana program.
- Rationale: Proof only needs verifiable memo data on devnet, not custom on-chain state.

## 2026-09-07 - Wallet Adapter Approval

- Decision: Use `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`, and `@solana/web3.js` for browser wallet signing in the MVP.
- Rationale: User explicitly approved this dependency stack after implementation paused on the unplanned wallet-library choice.
- Boundary: Wallet adapter and `@solana/web3.js` stay in browser/API Solana boundaries, not in Compliance Core.
- Status: Superseded by the later Solana Kit / Wallet Standard migration.

## 2026-09-07 - Phantom-Only Wallet Revision

- Decision: Replace the broad wallet adapter stack with a Phantom-only injected-wallet adapter for the MVP.
- Rationale: `@solana/wallet-adapter-wallets` introduced a very large dependency tree with 106 runtime vulnerabilities, including 1 critical. User approved switching to Phantom.
- Boundary: The browser demo uses `window.solana` plus `@solana/web3.js`; wallet code remains outside Compliance Core.
- Status: Superseded by the later Solana Kit / Wallet Standard migration.

## 2026-09-07 - Next Security Upgrade

- Decision: Upgrade Next.js to `16.3.4` and fix resulting breaking changes.
- Rationale: `npm audit --omit=dev` reported high-severity PostCSS issues through the installed Next.js version; user approved the breaking upgrade path.
- Follow-up: Use `next build --webpack` for the demo build because Next 16 Turbopack hit an environment-level CSS processing panic while binding an internal port.
- Follow-up: Disable `experimental.useTypeScriptCli` after Next 16 failed to parse its own captured `tsc --showConfig` output even though the same command produced valid JSON when run directly.

## 2026-09-07 - Phase Gates Through Proof API

- Phase 2 API gate: `npm run test --workspace @ej-ledger/api` passed; `npm run typecheck --workspace @ej-ledger/api` passed.
- Phase 3 SDK gate: `npm run test --workspace @ej-ledger/sdk` passed; `npm run typecheck --workspace @ej-ledger/sdk` passed.
- Phase 4 Proof gate: `npm run test --workspace @ej-ledger/proof` passed; `npm run typecheck --workspace @ej-ledger/proof` passed.
- Phase 5 Proof API gate: covered by API tests for proof intent, submit validation, mocked RPC success, and mocked RPC failure.
- Acceptance note: `packages/core` import scan found no Solana, HTTP, UI, filesystem, or proof dependency.

## 2026-09-07 - Phase 6 Demo Gate

- Phase 6 typecheck: `npm run typecheck --workspace @ej-ledger/demo` passed.
- Phase 6 build: `npm run build --workspace @ej-ledger/demo` passed after Next 16 compatibility fixes.
- Wallet scope: Phantom-only injected provider, no broad wallet adapter package.

## 2026-09-07 - Phase 7 Final Gates

- Root test gate: `npm run test` passed with 22 tests across Core, Proof, SDK, and API.
- Root build gate: `npm run build` passed across all workspaces.
- Root typecheck gate: `npm run typecheck` passed after Next generated fresh `.next/types`.
- API smoke gate: local API returned expected `APPROVED`, `NEEDS_APPROVAL`, `BLOCKED`, and proof intent responses.
- Audit status: `npm audit --omit=dev` reports 4 moderate vulnerabilities through `@solana/web3.js` transitive dependencies (`stream-json`, `uuid`). The suggested fix downgrades `@solana/web3.js` to `0.0.3`, so it was not applied.

## 2026-09-07 - Next Latest Verification

- Decision: Keep `next` at `16.3.4`, confirmed as the current npm latest with `npm view next version`.
- Decision: Upgrade the demo React pair to `react@19.2.8` and `react-dom@19.2.8`, plus `@types/react@19.2.18` and `@types/react-dom@19.2.7`.
- Rationale: The Next 16 upgrade guide says the manual upgrade path should use latest Next, latest React, latest React DOM, and current React type packages.
- Fix: Change demo typecheck to run `next typegen && tsc -p tsconfig.json --noEmit --incremental false`.
- Rationale: Next 16 route-aware types are generated by `next typegen`, `next dev`, or `next build`; direct `tsc` can fail on missing or stale `.next/types` files in clean or recently rebuilt worktrees.
- Verification: `npm run test`, `npm run typecheck`, and `npm run build` passed from the repository root after the upgrade.

## 2026-09-07 - Phase 7 Setup Hygiene

- Decision: Add `.env.example` with the API URL, browser devnet RPC URL, and optional Helius devnet RPC URL.
- Decision: Add `.gitignore` for dependencies, Next output, TypeScript build info, local env files, and logs.
- Rationale: Fresh setup instructions should be reproducible and generated files should not pollute the implementation handoff.
- Verification: README HTTP examples returned expected `APPROVED`, `NEEDS_APPROVAL`, `BLOCKED`, and proof intent responses from the local API.
- Verification: The local Next demo on `http://localhost:3000` returned `200 OK`.
- Verification: `npm run test`, `npm run typecheck`, and `npm run build` passed sequentially from the repository root.

## 2026-09-07 - Solana Kit / Wallet Standard Migration

- Decision: Replace the Phantom-only injected wallet path with `@solana/client` + `@solana/react-hooks` in the demo.
- Rationale: The `solana-dev` guidance prefers Solana Kit-style framework defaults and Wallet Standard discovery. The MVP now supports Phantom and Solflare without adding the older broad wallet-adapter stack.
- Decision: Keep the `ProofSigner` abstraction, renamed at the demo boundary to `WalletStandardProofSigner`.
- Rationale: Compliance Core and SDK APIs stay unchanged; future `ServerKeypairProofSigner`, WhatsApp, Telegram, or admin flows can still swap signers outside Core.
- Decision: Add a two-step proof flow: prepare and simulate the Memo transaction first, show wallet/fee-payer/program/cluster details, then ask the user to sign and submit.
- Rationale: `solana-dev` requires explicit user approval and transaction summary before signing/sending.
- Decision: Implement a local raw Memo Program instruction instead of depending on `@solana-program/memo`.
- Rationale: The latest generated memo package depends on a newer standalone Kit major than the framework-kit packages currently used by `@solana/client`, and raw Memo proof only needs UTF-8 bytes to the official Memo Program.
- Decision: Replace the API broadcaster’s `@solana/web3.js` `Connection.sendRawTransaction` usage with `@solana/kit` RPC `sendTransaction`.
- Rationale: The API receives an already-signed base64 wire transaction, so this boundary can use standalone Kit without mixing browser transaction object types.
- Verification: `npm run typecheck --workspace @ej-ledger/api` passed.
- Verification: `npm run typecheck --workspace @ej-ledger/demo` passed.
- Verification: `npm audit --omit=dev` passed with 0 vulnerabilities after removing direct `@solana/web3.js` usage from API and demo.
- Verification: `npm run test` passed with 22 tests across Core, Proof, SDK, and API.
- Verification: `npm run build` passed from the repository root.
- Verification: `npm run typecheck` passed from the repository root when run sequentially after build.
- Verification: Runtime scan found no direct `@solana/web3.js`, wallet-adapter, or server keypair usage in `apps`, `packages`, root package files, README, or lockfile.

## 2026-09-07 - Explicit Wallet Picker

- Decision: Present a single `Connect wallet` control that opens a chooser for Phantom and Solflare.
- Rationale: Wallet Standard discovery only exposes extensions installed in the active browser. A fixed chooser makes the supported-wallet scope visible while correctly showing an install action for a wallet that has not been detected.
- Verification: `npm run typecheck --workspace @ej-ledger/demo` and `npm run build --workspace @ej-ledger/demo` passed.

## 2026-09-07 - Core Unit and Policy Contract Test Split

- Decision: Keep `packages/core` tests self-contained with in-test `Policy` fixtures; move `demo-rid.json` scenario checks to a separate policy-contract test.
- Rationale: Core unit tests now isolate rule behavior from mutable demonstration policy, while the policy test explicitly owns the PRD scenario contract for the shipped RID.
- Verification: `npm run test --workspace @ej-ledger/core`, `npm run test`, and `npm run typecheck` passed; the root suite now has 25 tests.

## 2026-09-07 - Browser Fetch Receiver Fix

- Decision: Bind the SDK's configurable fetch implementation to `globalThis` when constructing `ComplianceClient`.
- Rationale: Chromium's native `window.fetch` throws `Illegal invocation` when called as a detached function. Binding retains the SDK's injectable fetch seam while making the browser demo work.
- Verification: SDK unit tests, demo typecheck/build, and the root suite passed; the root suite now has 26 tests.

## 2026-09-07 - Shared Organization Proof History Demo

- Decision: Use Solana devnet RPC plus a static `demo-members.json` roster to display shared public proof history without adding a database.
- Rationale: The Memo has no reversible organization or member identity. The roster maps known public wallet addresses to the EJ, while RPC verifies successful signed transactions and exposes only public memo metadata.
- Boundary: The history endpoint is a demo-only roster gate, not production authentication. It intentionally excludes private expense data, which cannot be reconstructed from on-chain hashes.
- Verification: Root tests passed with 30 tests, workspace typechecks passed, demo production build passed, and a read-only devnet RPC smoke test returned the existing `APPROVED` proof for the configured wallet.

"use client";

import type { ComplianceDecision, Expense, OrganizationProofHistory, ProofIntent, ProofSubmission } from "@ej-ledger/sdk";
import type { WalletConnector } from "@solana/client";
import { useSolanaClient, useWalletConnection } from "@solana/react-hooks";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, FileCheck2, History, Loader2, LogOut, RefreshCw, ShieldAlert, Wallet, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { complianceClient } from "../lib/client";
import { type PreparedProofTransaction, WalletStandardProofSigner } from "../lib/wallet-standard-proof-signer";

const scenarios = [
  {
    label: "Approved",
    expense: { amount: "80", category: "transportation", purpose: "Client meeting" }
  },
  {
    label: "Needs approval",
    expense: { amount: "120", category: "transportation", purpose: "Client meeting" }
  },
  {
    label: "Blocked",
    expense: { amount: "50", category: "entertainment", purpose: "Team event" }
  }
] as const;

type Status = "idle" | "checking" | "preparing-proof" | "signing-proof";

function statusTone(decision: ComplianceDecision["decision"] | undefined) {
  if (decision === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (decision === "NEEDS_APPROVAL") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  if (decision === "BLOCKED") {
    return "border-red-200 bg-red-50 text-red-950";
  }
  return "border-border bg-card text-card-foreground";
}

function decisionIcon(decision: ComplianceDecision["decision"] | undefined) {
  if (decision === "APPROVED") {
    return <CheckCircle2 className="h-5 w-5" aria-hidden="true" />;
  }
  if (decision === "NEEDS_APPROVAL") {
    return <ShieldAlert className="h-5 w-5" aria-hidden="true" />;
  }
  return <AlertCircle className="h-5 w-5" aria-hidden="true" />;
}

function buildExpense(amount: string, category: string, purpose: string): Expense {
  return {
    organizationId: "ej-demo",
    memberId: "member-001",
    amount: Number(amount.replace(",", ".")),
    currency: "BRL",
    category,
    purpose
  };
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatOccurredAt(occurredAt: string | null): string {
  if (occurredAt === null) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(occurredAt));
}

function isSupportedWalletConnector(connector: WalletConnector): boolean {
  const normalizedName = connector.name.toLowerCase();
  return normalizedName.includes("phantom") || normalizedName.includes("solflare");
}

const walletOptions = [
  { name: "Phantom", website: "https://phantom.app/" },
  { name: "Solflare", website: "https://solflare.com/" }
] as const;

function connectorForWallet(
  connectors: WalletConnector[],
  walletName: (typeof walletOptions)[number]["name"]
): WalletConnector | undefined {
  return connectors.find((connector) => connector.name.toLowerCase().includes(walletName.toLowerCase()));
}

function getErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof Error) {
    if (caught.message.includes("User rejected")) {
      return "Proof signing was cancelled.";
    }

    return caught.message;
  }

  return fallback;
}

export function EjComplianceDemo() {
  const solanaClient = useSolanaClient();
  const wallet = useWalletConnection();
  const [category, setCategory] = useState("transportation");
  const [amount, setAmount] = useState("80");
  const [purpose, setPurpose] = useState("Client meeting");
  const [decision, setDecision] = useState<ComplianceDecision | null>(null);
  const [proofIntent, setProofIntent] = useState<ProofIntent | null>(null);
  const [preparedProof, setPreparedProof] = useState<PreparedProofTransaction | null>(null);
  const [proofSubmission, setProofSubmission] = useState<ProofSubmission | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [organizationHistory, setOrganizationHistory] = useState<OrganizationProofHistory | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const expense = useMemo(() => buildExpense(amount, category, purpose), [amount, category, purpose]);
  const proofSigner = useMemo(
    () => {
      if (!wallet.wallet) {
        return null;
      }

      return new WalletStandardProofSigner({
        client: solanaClient,
        session: wallet.wallet,
        submitSignedTransaction: (signedTransaction) =>
          complianceClient.submitSignedProofTransaction(signedTransaction)
      });
    },
    [solanaClient, wallet.wallet]
  );

  const walletAddress = wallet.wallet?.account.address.toString();
  const supportedConnectors = useMemo(
    () => wallet.connectors.filter(isSupportedWalletConnector),
    [wallet.connectors]
  );

  const loadOrganizationHistory = useCallback(async () => {
    if (!walletAddress) {
      setOrganizationHistory(null);
      setHistoryError(null);
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const history = await complianceClient.getOrganizationProofHistory("ej-demo", walletAddress);
      setOrganizationHistory(history);
    } catch (caught) {
      setOrganizationHistory(null);
      setHistoryError(getErrorMessage(caught, "Could not load organization proof history."));
    } finally {
      setIsHistoryLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    setPreparedProof(null);
  }, [walletAddress]);

  useEffect(() => {
    void loadOrganizationHistory();
  }, [loadOrganizationHistory]);

  async function checkCurrentExpense(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setStatus("checking");
    setError(null);
    setProofIntent(null);
    setPreparedProof(null);
    setProofSubmission(null);

    try {
      const result = await complianceClient.checkExpense(expense);
      setDecision(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check this expense.");
    } finally {
      setStatus("idle");
    }
  }

  async function connectWallet(connectorId: string) {
    setError(null);

    try {
      await wallet.connect(connectorId);
      setIsWalletPickerOpen(false);
    } catch (caught) {
      setError(getErrorMessage(caught, "Wallet connection failed."));
    }
  }

  async function prepareProof() {
    if (!proofSigner) {
      setError("Connect Phantom or Solflare before preparing proof.");
      return;
    }

    setStatus("preparing-proof");
    setError(null);
    setPreparedProof(null);
    setProofSubmission(null);

    try {
      const intent = await complianceClient.createProofIntent(expense);
      setProofIntent(intent);
      const prepared = await proofSigner.prepareProofTransaction({
        payload: intent.payload,
        memo: intent.memo,
        cluster: intent.cluster
      });
      setPreparedProof(prepared);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not prepare proof."));
    } finally {
      setStatus("idle");
    }
  }

  async function signAndSubmitProof() {
    if (!proofSigner || !preparedProof) {
      setError("Prepare a proof transaction before signing.");
      return;
    }

    setStatus("signing-proof");
    setError(null);

    try {
      const submission = await proofSigner.signAndSendPreparedProof(preparedProof);
      setProofSubmission(submission);
      setPreparedProof(null);
      void loadOrganizationHistory();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not sign and submit proof."));
    } finally {
      setStatus("idle");
    }
  }

  const isChecking = status === "checking";
  const isPreparingProof = status === "preparing-proof";
  const isSigningProof = status === "signing-proof";
  const isProofBusy = isPreparingProof || isSigningProof;
  const canPrepareProof = Boolean(decision && wallet.connected && !isProofBusy);
  const canSignProof = Boolean(preparedProof && !isProofBusy);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Solana devnet</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal md:text-4xl">EJ Compliance Core</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {wallet.connected && walletAddress ? (
              <>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm tabular-nums hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => navigator.clipboard.writeText(walletAddress)}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  {truncateAddress(walletAddress)}
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {wallet.currentConnector?.name ?? "Wallet Standard"}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={wallet.disconnect}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Disconnect
                </button>
              </>
            ) : !wallet.isReady ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground"
                disabled
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Detecting wallets
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setIsWalletPickerOpen(true)}
                disabled={wallet.connecting}
                aria-haspopup="dialog"
                aria-expanded={isWalletPickerOpen}
                aria-controls="wallet-picker"
              >
                <Wallet className="h-4 w-4" aria-hidden="true" />
                Connect wallet
              </button>
            )}
          </div>
        </header>

        {isWalletPickerOpen && (
          <div
            id="wallet-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-picker-title"
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          >
            <section className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="wallet-picker-title" className="text-lg font-semibold">Connect a wallet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Choose Phantom or Solflare for this devnet proof.</p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setIsWalletPickerOpen(false)}
                  aria-label="Close wallet picker"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {walletOptions.map((option) => {
                  const connector = connectorForWallet(supportedConnectors, option.name);

                  return (
                    <div key={option.name} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="font-medium">{option.name}</p>
                        <p className="text-xs text-muted-foreground">{connector ? "Detected in this browser" : "Not installed in this browser"}</p>
                      </div>
                      {connector ? (
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => connectWallet(connector.id)}
                          disabled={wallet.connecting}
                        >
                          {wallet.connecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                          Connect
                        </button>
                      ) : (
                        <a
                          href={option.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          Install
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={checkCurrentExpense} className="rounded-lg border bg-card p-5">
            <fieldset className="space-y-5" disabled={isChecking || isProofBusy}>
              <legend className="text-lg font-semibold">Can I make this expense?</legend>

              <div className="grid gap-3 md:grid-cols-3">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    className="min-h-10 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => {
                      setAmount(scenario.expense.amount);
                      setCategory(scenario.expense.category);
                      setPurpose(scenario.expense.purpose);
                      setDecision(null);
                      setProofIntent(null);
                      setPreparedProof(null);
                      setProofSubmission(null);
                    }}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="transportation">Transportation</option>
                  <option value="food">Food</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="office-supplies">Office supplies</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount
                </label>
                <input
                  id="amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  className="min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-describedby="amount-helper"
                />
                <p id="amount-helper" className="text-xs text-muted-foreground">
                  Values are checked in BRL against RID 2026.1.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="purpose" className="text-sm font-medium">
                  Purpose
                </label>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <button
                type="submit"
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {isChecking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileCheck2 className="h-4 w-4" aria-hidden="true" />}
                Check expense
              </button>
            </fieldset>
          </form>

          <aside className="space-y-4">
            <section className={`rounded-lg border p-5 ${statusTone(decision?.decision)}`}>
              <div className="flex items-center gap-2">
                {decision ? decisionIcon(decision.decision) : <FileCheck2 className="h-5 w-5" aria-hidden="true" />}
                <h2 className="text-lg font-semibold">{decision?.decision ?? "No decision yet"}</h2>
              </div>
              <p className="mt-3 text-sm">
                {decision?.reason ?? "Submit an expense to evaluate it against the current RID policy."}
              </p>
              {decision && (
                <p className="mt-3 text-sm font-medium">Policy: RID {decision.policyVersion}</p>
              )}
            </section>

            <section className="rounded-lg border bg-card p-5">
              <h2 className="text-lg font-semibold">Proof</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A wallet-signed memo records hashes only. Raw purpose text and receipts stay off-chain.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canPrepareProof}
                onClick={prepareProof}
              >
                {isPreparingProof ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileCheck2 className="h-4 w-4" aria-hidden="true" />}
                {wallet.connected ? "Prepare proof transaction" : "Connect Phantom or Solflare first"}
              </button>

              {proofIntent && (
                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Proof hash</dt>
                    <dd className="break-all font-mono text-xs">{proofIntent.payload.proofHash}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Memo</dt>
                    <dd className="break-all font-mono text-xs">{proofIntent.memo}</dd>
                  </div>
                </dl>
              )}

              {preparedProof && (
                <section className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
                  <h3 className="font-semibold">Review before signing</h3>
                  <dl className="mt-3 space-y-2">
                    <div>
                      <dt className="text-muted-foreground">Wallet</dt>
                      <dd>{preparedProof.walletName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Fee payer / signer</dt>
                      <dd className="break-all font-mono text-xs">{preparedProof.feePayer}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cluster</dt>
                      <dd>{preparedProof.input.cluster}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Program</dt>
                      <dd className="break-all font-mono text-xs">{preparedProof.memoProgram}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Simulation</dt>
                      <dd>
                        Passed{preparedProof.simulation.unitsConsumed ? ` · ${preparedProof.simulation.unitsConsumed.toString()} CUs` : ""}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSignProof}
                    onClick={signAndSubmitProof}
                  >
                    {isSigningProof ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wallet className="h-4 w-4" aria-hidden="true" />}
                    Sign and submit proof
                  </button>
                </section>
              )}

              {proofSubmission && (
                <a
                  href={proofSubmission.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  View transaction
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </section>

            <section className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">Organization proof history</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Shared public proof metadata from configured EJ wallets. Demo roster access only.
                  </p>
                </div>
                {walletAddress && (
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void loadOrganizationHistory()}
                    disabled={isHistoryLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isHistoryLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                    Refresh
                  </button>
                )}
              </div>

              {!walletAddress ? (
                <p className="mt-4 text-sm text-muted-foreground">Connect a configured EJ wallet to view shared proof history.</p>
              ) : isHistoryLoading ? (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading Solana devnet proofs
                </p>
              ) : historyError ? (
                <p className="mt-4 text-sm text-destructive">{historyError}</p>
              ) : organizationHistory?.proofs.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No confirmed EJ Ledger memos found for the configured wallets yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {organizationHistory?.proofs.map((proof) => (
                    <li key={proof.signature} className="rounded-md border bg-muted/30 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{proof.memberName}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{truncateAddress(proof.signerAddress)}</p>
                        </div>
                        <span className="rounded-full border bg-background px-2 py-1 text-xs font-semibold">{proof.decision}</span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div className="flex justify-between gap-3">
                          <dt>RID</dt>
                          <dd className="font-medium text-foreground">{proof.policyVersion}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Confirmed</dt>
                          <dd className="text-right font-medium text-foreground">{formatOccurredAt(proof.occurredAt)} · {proof.confirmationStatus}</dd>
                        </div>
                      </dl>
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer text-muted-foreground">View proof hashes</summary>
                        <dl className="mt-2 space-y-1 break-all font-mono text-[11px] text-muted-foreground">
                          <div><dt className="inline">Proof: </dt><dd className="inline">{proof.proofHash}</dd></div>
                          <div><dt className="inline">Policy: </dt><dd className="inline">{proof.policyHash}</dd></div>
                          <div><dt className="inline">Expense: </dt><dd className="inline">{proof.expenseHash}</dd></div>
                        </dl>
                      </details>
                      <a
                        href={proof.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
                      >
                        View on Explorer
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {error && (
              <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </section>
            )}

            {wallet.error !== null && wallet.error !== undefined && (
              <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {String(wallet.error)}
              </section>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

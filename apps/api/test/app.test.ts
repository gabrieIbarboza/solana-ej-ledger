import { describe, expect, it, vi } from "vitest";
import type { Policy } from "@ej-ledger/core";
import { createApp } from "../src/app";

const signedTransaction = "AQIDBA==";

const policy: Policy = {
  organizationId: "ej-demo",
  version: "2026.1",
  rules: [
    { category: "transportation", allowed: true, maxAmount: 100 },
    { category: "food", allowed: true, maxAmount: 60 },
    { category: "entertainment", allowed: false }
  ]
};

const baseExpense = {
  organizationId: "ej-demo",
  memberId: "member-001",
  amount: 80,
  currency: "BRL",
  category: "transportation",
  purpose: "Client meeting"
};

function appWithPolicy(overrides?: { sendRawTransaction?: (tx: string) => Promise<string> }) {
  return createApp({
    broadcaster: {
      sendRawTransaction: overrides?.sendRawTransaction ?? vi.fn(async () => "mock-signature")
    },
    getPolicy: (organizationId) => (organizationId === policy.organizationId ? policy : undefined)
  });
}

describe("api", () => {
  it("returns the demo policy", async () => {
    const response = await appWithPolicy().request("/v1/policies/ej-demo");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ organizationId: "ej-demo" });
  });

  it("returns correct decisions for the PRD scenarios", async () => {
    const app = appWithPolicy();

    const approved = await app.request("/v1/expenses/check", {
      method: "POST",
      body: JSON.stringify(baseExpense),
      headers: { "content-type": "application/json" }
    });
    const needsApproval = await app.request("/v1/expenses/check", {
      method: "POST",
      body: JSON.stringify({ ...baseExpense, amount: 120 }),
      headers: { "content-type": "application/json" }
    });
    const blocked = await app.request("/v1/expenses/check", {
      method: "POST",
      body: JSON.stringify({ ...baseExpense, category: "entertainment", amount: 50 }),
      headers: { "content-type": "application/json" }
    });

    await expect(approved.json()).resolves.toMatchObject({ decision: "APPROVED" });
    await expect(needsApproval.json()).resolves.toMatchObject({ decision: "NEEDS_APPROVAL" });
    await expect(blocked.json()).resolves.toMatchObject({ decision: "BLOCKED" });
  });

  it("returns controlled errors for invalid payload and unknown policy", async () => {
    const app = appWithPolicy();

    const invalid = await app.request("/v1/expenses/check", {
      method: "POST",
      body: JSON.stringify({ ...baseExpense, amount: -1 }),
      headers: { "content-type": "application/json" }
    });
    const unknown = await app.request("/v1/expenses/check", {
      method: "POST",
      body: JSON.stringify({ ...baseExpense, organizationId: "missing" }),
      headers: { "content-type": "application/json" }
    });

    expect(invalid.status).toBe(400);
    expect(unknown.status).toBe(404);
  });

  it("creates proof intent by recomputing the decision server-side", async () => {
    const response = await appWithPolicy().request("/v1/proofs/intent", {
      method: "POST",
      body: JSON.stringify(baseExpense),
      headers: { "content-type": "application/json" }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toMatchObject({ decision: "APPROVED" });
    expect(body.memo).toMatch(/^EJ_COMPLIANCE:v1:/);
    expect(body.payload.proofHash).toHaveLength(64);
  });

  it("validates signed transaction shape before RPC submission", async () => {
    const sendRawTransaction = vi.fn(async () => "mock-signature");
    const response = await appWithPolicy({ sendRawTransaction }).request("/v1/proofs/submit", {
      method: "POST",
      body: JSON.stringify({ signedTransaction: "" }),
      headers: { "content-type": "application/json" }
    });

    expect(response.status).toBe(400);
    expect(sendRawTransaction).not.toHaveBeenCalled();
  });

  it("returns signature and explorer URL on mocked RPC success", async () => {
    const response = await appWithPolicy().request("/v1/proofs/submit", {
      method: "POST",
      body: JSON.stringify({ signedTransaction }),
      headers: { "content-type": "application/json" }
    });

    await expect(response.json()).resolves.toMatchObject({
      signature: "mock-signature",
      explorerUrl: "https://explorer.solana.com/tx/mock-signature?cluster=devnet"
    });
  });

  it("returns a controlled error on mocked RPC failure", async () => {
    const response = await appWithPolicy({
      sendRawTransaction: vi.fn(async () => {
        throw new Error("rpc down");
      })
    }).request("/v1/proofs/submit", {
      method: "POST",
      body: JSON.stringify({ signedTransaction }),
      headers: { "content-type": "application/json" }
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: "failed to submit signed transaction" });
  });
});

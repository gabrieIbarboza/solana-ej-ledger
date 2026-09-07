import { describe, expect, it } from "vitest";
import type { ComplianceDecision, Expense, Policy } from "@ej-ledger/core";
import {
  createExpenseHash,
  createPolicyHash,
  createProofMemo,
  createProofPayload,
  parseProofMemo,
  type ProofSigner
} from ".";

const policy: Policy = {
  organizationId: "ej-demo",
  version: "2026.1",
  rules: [{ category: "transportation", allowed: true, maxAmount: 100 }]
};

const expense: Expense = {
  organizationId: "ej-demo",
  memberId: "member-001",
  amount: 80,
  currency: "BRL",
  category: "transportation",
  purpose: "Client meeting with private details"
};

const decision: ComplianceDecision = {
  decision: "APPROVED",
  policyVersion: "2026.1",
  reason: "Transportation under limit",
  requiresApproval: false
};

describe("proof utilities", () => {
  it("creates deterministic policy, expense and proof hashes", () => {
    const first = createProofPayload({ expense, policy, decision, timestamp: "2026-09-07T00:00:00.000Z" });
    const second = createProofPayload({ expense, policy, decision, timestamp: "2026-09-07T00:00:00.000Z" });

    expect(createPolicyHash(policy)).toHaveLength(64);
    expect(createExpenseHash(expense)).toHaveLength(64);
    expect(second).toEqual(first);
  });

  it("changes the proof hash when the policy version changes", () => {
    const first = createProofPayload({ expense, policy, decision, timestamp: "2026-09-07T00:00:00.000Z" });
    const changed = createProofPayload({
      expense,
      policy: { ...policy, version: "2026.2" },
      decision: { ...decision, policyVersion: "2026.2" },
      timestamp: "2026-09-07T00:00:00.000Z"
    });

    expect(changed.proofHash).not.toBe(first.proofHash);
  });

  it("keeps sensitive raw content out of the memo", () => {
    const payload = createProofPayload({ expense, policy, decision, timestamp: "2026-09-07T00:00:00.000Z" });
    const memo = createProofMemo(payload);

    expect(memo).toMatch(/^EJ_COMPLIANCE:v1:/);
    expect(memo).not.toContain(expense.purpose);
    expect(memo).not.toContain("Client meeting");
    expect(memo).not.toContain("receipt");
    expect(memo).not.toContain(JSON.stringify(policy));
  });

  it("parses valid proof memos and rejects malformed data", () => {
    const payload = createProofPayload({ expense, policy, decision, timestamp: "2026-09-07T00:00:00.000Z" });
    const memo = createProofMemo(payload);

    expect(parseProofMemo(memo)).toMatchObject({
      proofHash: payload.proofHash,
      policyHash: payload.policyHash,
      expenseHash: payload.expenseHash,
      decision: "APPROVED",
      policyVersion: "2026.1"
    });
    expect(parseProofMemo(`[${memo.length}] ${memo}`)).toMatchObject({ proofHash: payload.proofHash });
    expect(parseProofMemo(`${memo}:extra`)).toBeNull();
    expect(parseProofMemo("EJ_COMPLIANCE:v1:not-a-hash")).toBeNull();
  });

  it("allows signer implementations behind the ProofSigner interface", async () => {
    const mockSigner: ProofSigner = {
      kind: "user-wallet",
      getAddress: async () => "Signer111111111111111111111111111111111",
      signAndSendProof: async () => ({
        signature: "mock-signature",
        explorerUrl: "https://explorer.solana.com/tx/mock-signature?cluster=devnet",
        signerAddress: "Signer111111111111111111111111111111111",
        submittedAt: "2026-09-07T00:00:00.000Z"
      })
    };

    await expect(mockSigner.signAndSendProof({
      payload: createProofPayload({ expense, policy, decision }),
      memo: "EJ_COMPLIANCE:v1:mock",
      cluster: "devnet"
    })).resolves.toMatchObject({ signature: "mock-signature" });
  });
});

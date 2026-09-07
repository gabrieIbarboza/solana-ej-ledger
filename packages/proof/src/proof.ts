import { createHash } from "node:crypto";
import type { Expense, Policy } from "@ej-ledger/core";
import type { CreateProofPayloadInput, ProofPayload } from "./types";
import { stableJson } from "./stable-json";

const MEMO_PREFIX = "EJ_COMPLIANCE";
const MEMO_VERSION = "v1";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createPolicyHash(policy: Policy): string {
  return sha256(stableJson(policy));
}

export function createExpenseHash(expense: Expense): string {
  const privacySafeExpense = {
    organizationId: expense.organizationId,
    memberId: expense.memberId,
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    project: expense.project
  };

  return sha256(stableJson(privacySafeExpense));
}

export function createProofPayload({
  expense,
  policy,
  decision,
  timestamp = new Date().toISOString()
}: CreateProofPayloadInput): ProofPayload {
  const policyHash = createPolicyHash(policy);
  const expenseHash = createExpenseHash(expense);
  const proofBase = {
    organizationId: expense.organizationId,
    policyVersion: policy.version,
    policyHash,
    expenseHash,
    decision: decision.decision,
    timestamp
  };

  return {
    ...proofBase,
    proofHash: sha256(stableJson(proofBase))
  };
}

export function createProofMemo(payload: ProofPayload): string {
  return [
    MEMO_PREFIX,
    MEMO_VERSION,
    payload.proofHash,
    payload.policyHash,
    payload.expenseHash,
    payload.decision,
    payload.policyVersion
  ].join(":");
}

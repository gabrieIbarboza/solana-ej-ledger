import { createHash } from "node:crypto";
import type { Expense, Policy } from "@ej-ledger/core";
import type { CreateProofPayloadInput, ParsedProofMemo, ProofPayload } from "./types";
import { stableJson } from "./stable-json";

const MEMO_PREFIX = "EJ_COMPLIANCE";
const MEMO_VERSION_V1 = "v1";
const MEMO_VERSION_V2 = "v2";
const HASH_PATTERN = /^[a-f0-9]{64}$/;

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
  receiptHash,
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
  const receiptProofBase = receiptHash === undefined ? proofBase : { ...proofBase, receiptHash };

  return {
    ...receiptProofBase,
    proofHash: sha256(stableJson(receiptProofBase))
  };
}

export function createProofMemo(payload: ProofPayload): string {
  if (payload.receiptHash !== undefined) {
    return [MEMO_PREFIX, MEMO_VERSION_V2, payload.proofHash, payload.policyHash, payload.expenseHash, payload.receiptHash, payload.decision, payload.policyVersion].join(":");
  }

  return [
    MEMO_PREFIX,
    MEMO_VERSION_V1,
    payload.proofHash,
    payload.policyHash,
    payload.expenseHash,
    payload.decision,
    payload.policyVersion
  ].join(":");
}

export function parseProofMemo(memo: string): ParsedProofMemo | null {
  const normalizedMemo = memo.replace(/^\[\d+\]\s+/, "");
  const parts = normalizedMemo.split(":");
  const [prefix, version, proofHash, policyHash, expenseHash] = parts;
  const isV1 = version === MEMO_VERSION_V1 && parts.length === 7;
  const isV2 = version === MEMO_VERSION_V2 && parts.length === 8;
  const receiptHash = isV2 ? parts[5] : undefined;
  const decision = isV2 ? parts[6] : parts[5];
  const policyVersion = isV2 ? parts[7] : parts[6];

  if (
    prefix !== MEMO_PREFIX ||
    (!isV1 && !isV2) ||
    !proofHash ||
    !policyHash ||
    !expenseHash ||
    !decision ||
    !policyVersion ||
    !HASH_PATTERN.test(proofHash) ||
    !HASH_PATTERN.test(policyHash) ||
    !HASH_PATTERN.test(expenseHash) ||
    (receiptHash !== undefined && !HASH_PATTERN.test(receiptHash)) ||
    (decision !== "APPROVED" && decision !== "NEEDS_APPROVAL" && decision !== "BLOCKED")
  ) {
    return null;
  }

  return receiptHash === undefined
    ? { proofHash, policyHash, expenseHash, decision, policyVersion }
    : { proofHash, policyHash, expenseHash, receiptHash, decision, policyVersion };
}

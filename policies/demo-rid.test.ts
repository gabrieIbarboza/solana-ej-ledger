import { describe, expect, it } from "vitest";
import { checkExpense, type Expense, type Policy } from "@ej-ledger/core";
import demoPolicy from "./demo-rid.json";

const policy = demoPolicy as Policy;

function expense(overrides: Partial<Expense>): Expense {
  return {
    organizationId: "ej-demo",
    memberId: "member-001",
    amount: 80,
    currency: "BRL",
    category: "transportation",
    purpose: "Client meeting",
    ...overrides
  };
}

describe("demo RID policy contract", () => {
  it("keeps the approved PRD scenario approved", () => {
    expect(checkExpense({ expense: expense({ amount: 80 }), policy })).toMatchObject({
      decision: "APPROVED",
      policyVersion: "2026.1",
      requiresApproval: false
    });
  });

  it("keeps the over-limit PRD scenario pending approval", () => {
    expect(checkExpense({ expense: expense({ amount: 120 }), policy })).toMatchObject({
      decision: "NEEDS_APPROVAL",
      policyVersion: "2026.1",
      requiresApproval: true
    });
  });

  it("keeps the disallowed PRD scenario blocked", () => {
    expect(
      checkExpense({ expense: expense({ category: "entertainment", amount: 50 }), policy })
    ).toMatchObject({
      decision: "BLOCKED",
      policyVersion: "2026.1",
      requiresApproval: false
    });
  });
});

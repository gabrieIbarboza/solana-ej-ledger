import { describe, expect, it } from "vitest";
import { checkExpense, ExpenseValidationError, type Expense, type Policy } from ".";

const policy: Policy = {
  organizationId: "ej-demo",
  version: "2026.1",
  rules: [
    { category: "transportation", allowed: true, maxAmount: 100 },
    { category: "food", allowed: true, maxAmount: 60 },
    { category: "entertainment", allowed: false }
  ]
};

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

describe("checkExpense", () => {
  it("approves transportation under the policy limit", () => {
    expect(checkExpense({ expense: expense({ amount: 80 }), policy })).toMatchObject({
      decision: "APPROVED",
      policyVersion: "2026.1",
      requiresApproval: false
    });
  });

  it("requires approval for transportation over the policy limit", () => {
    expect(checkExpense({ expense: expense({ amount: 120 }), policy })).toMatchObject({
      decision: "NEEDS_APPROVAL",
      requiresApproval: true
    });
  });

  it("blocks a category that is explicitly disallowed", () => {
    expect(checkExpense({ expense: expense({ category: "entertainment", amount: 50 }), policy })).toMatchObject({
      decision: "BLOCKED",
      requiresApproval: false
    });
  });

  it("blocks an unknown category", () => {
    expect(checkExpense({ expense: expense({ category: "office-supplies" }), policy })).toMatchObject({
      decision: "BLOCKED"
    });
  });

  it("throws a validation error for invalid amounts", () => {
    expect(() => checkExpense({ expense: expense({ amount: 0 }), policy })).toThrow(ExpenseValidationError);
  });

  it("respects a caller-supplied policy without changing core logic", () => {
    const changedPolicy: Policy = {
      ...policy,
      rules: policy.rules.map((rule) =>
        rule.category === "transportation" ? { ...rule, maxAmount: 50 } : rule
      )
    };

    expect(checkExpense({ expense: expense({ amount: 80 }), policy: changedPolicy })).toMatchObject({
      decision: "NEEDS_APPROVAL"
    });
  });
});

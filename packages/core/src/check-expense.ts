import type { CheckExpenseInput, ComplianceDecision, PolicyRule } from "./types";
import { ExpenseValidationError } from "./types";

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}

function findRule(rules: PolicyRule[], category: string): PolicyRule | undefined {
  const normalizedCategory = normalizeCategory(category);
  return rules.find((rule) => normalizeCategory(rule.category) === normalizedCategory);
}

export function checkExpense({ expense, policy }: CheckExpenseInput): ComplianceDecision {
  if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
    throw new ExpenseValidationError("amount must be greater than zero");
  }

  const rule = findRule(policy.rules, expense.category);

  if (!rule) {
    return {
      decision: "BLOCKED",
      policyVersion: policy.version,
      reason: `Category "${expense.category}" is not defined in the organization's policy.`,
      requiresApproval: false
    };
  }

  if (!rule.allowed) {
    return {
      decision: "BLOCKED",
      policyVersion: policy.version,
      reason: `${rule.category} is not allowed by RID ${policy.version}.`,
      requiresApproval: false
    };
  }

  if (typeof rule.maxAmount !== "number") {
    return {
      decision: "APPROVED",
      policyVersion: policy.version,
      reason: `${rule.category} is allowed by RID ${policy.version}.`,
      requiresApproval: false
    };
  }

  if (expense.amount <= rule.maxAmount) {
    return {
      decision: "APPROVED",
      policyVersion: policy.version,
      reason: `${rule.category} under limit ${expense.currency} ${rule.maxAmount}.`,
      requiresApproval: false
    };
  }

  const overLimitDecision = rule.overLimitDecision ?? "NEEDS_APPROVAL";

  return {
    decision: overLimitDecision,
    policyVersion: policy.version,
    reason: `${rule.category} exceeds limit ${expense.currency} ${rule.maxAmount}.`,
    requiresApproval: overLimitDecision === "NEEDS_APPROVAL"
  };
}

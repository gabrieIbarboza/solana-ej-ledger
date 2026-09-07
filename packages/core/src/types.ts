export type ComplianceStatus = "APPROVED" | "NEEDS_APPROVAL" | "BLOCKED";

export interface Expense {
  organizationId: string;
  memberId: string;
  amount: number;
  currency: string;
  category: string;
  purpose: string;
  project?: string;
}

export interface PolicyRule {
  category: string;
  allowed: boolean;
  maxAmount?: number;
  overLimitDecision?: "NEEDS_APPROVAL" | "BLOCKED";
}

export interface Policy {
  organizationId: string;
  version: string;
  rules: PolicyRule[];
}

export interface ComplianceDecision {
  decision: ComplianceStatus;
  policyVersion: string;
  reason: string;
  requiresApproval: boolean;
}

export interface CheckExpenseInput {
  expense: Expense;
  policy: Policy;
}

export class ExpenseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseValidationError";
  }
}

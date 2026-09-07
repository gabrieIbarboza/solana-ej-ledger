import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { checkExpense, ExpenseValidationError, type Expense } from "@ej-ledger/core";
import { createProofMemo, createProofPayload } from "@ej-ledger/proof";
import { expenseSchema, signedTransactionSchema } from "./schemas";
import { createExplorerUrl, type TransactionBroadcaster } from "./solana";
import { getPolicy as getPolicyById } from "./policies";

export interface AppDependencies {
  broadcaster: TransactionBroadcaster;
  getPolicy?: typeof getPolicyById;
}

function jsonError(message: string, status: 400 | 404 | 500) {
  return { error: message, status };
}

function toExpense(value: z.infer<typeof expenseSchema>): Expense {
  const expense: Expense = {
    organizationId: value.organizationId,
    memberId: value.memberId,
    amount: value.amount,
    currency: value.currency,
    category: value.category,
    purpose: value.purpose
  };

  if (value.project !== undefined) {
    expense.project = value.project;
  }

  return expense;
}

export function createApp({ broadcaster, getPolicy = getPolicyById }: AppDependencies) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/v1/policies/:organizationId", (c) => {
    const policy = getPolicy(c.req.param("organizationId"));

    if (!policy) {
      return c.json(jsonError("policy not found", 404), 404);
    }

    return c.json(policy);
  });

  app.post("/v1/expenses/check", async (c) => {
    const parsed = expenseSchema.safeParse(await c.req.json().catch(() => undefined));

    if (!parsed.success) {
      return c.json(jsonError("invalid expense request", 400), 400);
    }

    const expense = toExpense(parsed.data);
    const policy = getPolicy(expense.organizationId);

    if (!policy) {
      return c.json(jsonError("policy not found", 404), 404);
    }

    try {
      return c.json(checkExpense({ expense, policy }));
    } catch (error) {
      if (error instanceof ExpenseValidationError) {
        return c.json(jsonError(error.message, 400), 400);
      }
      throw error;
    }
  });

  app.post("/v1/proofs/intent", async (c) => {
    const parsed = expenseSchema.safeParse(await c.req.json().catch(() => undefined));

    if (!parsed.success) {
      return c.json(jsonError("invalid expense request", 400), 400);
    }

    const expense = toExpense(parsed.data);
    const policy = getPolicy(expense.organizationId);

    if (!policy) {
      return c.json(jsonError("policy not found", 404), 404);
    }

    const decision = checkExpense({ expense, policy });
    const payload = createProofPayload({ expense, policy, decision });
    const memo = createProofMemo(payload);

    return c.json({ payload, memo, decision, cluster: "devnet" });
  });

  app.post("/v1/proofs/submit", async (c) => {
    const parsed = signedTransactionSchema.safeParse(await c.req.json().catch(() => undefined));

    if (!parsed.success) {
      return c.json(jsonError("invalid signed transaction", 400), 400);
    }

    try {
      const signature = await broadcaster.sendRawTransaction(parsed.data.signedTransaction);
      return c.json({
        signature,
        explorerUrl: createExplorerUrl(signature),
        submittedAt: new Date().toISOString()
      });
    } catch {
      return c.json(jsonError("failed to submit signed transaction", 500), 500);
    }
  });

  return app;
}

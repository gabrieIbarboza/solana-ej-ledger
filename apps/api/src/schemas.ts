import { z } from "zod";

export const expenseSchema = z.object({
  organizationId: z.string().min(1),
  memberId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  category: z.string().min(1),
  purpose: z.string().min(1),
  project: z.string().min(1).optional()
});

export const signedTransactionSchema = z.object({
  signedTransaction: z.string().min(1)
});

export const proofIntentSchema = expenseSchema.extend({
  receiptHash: z.string().regex(/^[a-f0-9]{64}$/).optional()
});

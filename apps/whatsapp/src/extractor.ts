import OpenAI from "openai";
import { z } from "zod";

export const expenseExtractionSchema = z.object({
  intent: z.enum(["expense", "history", "help", "cancel"]),
  amount: z.number().positive().nullable(),
  category: z.string().min(1).nullable(),
  purpose: z.string().min(1).nullable()
});

export type ExpenseExtraction = z.infer<typeof expenseExtractionSchema>;

export interface ExpenseExtractor {
  extract(message: string, categories: string[]): Promise<ExpenseExtraction>;
}

export class OpenAIExpenseExtractor implements ExpenseExtractor {
  constructor(private readonly client: OpenAI, private readonly model: string) {}

  async extract(message: string, categories: string[]): Promise<ExpenseExtraction> {
    const response = await this.client.responses.create({
      model: this.model,
      input: `Extract an EJ Ledger WhatsApp request in Brazilian Portuguese. Return only JSON. Known policy categories: ${categories.join(", ")}. Map synonyms only when confident; otherwise preserve the user's category. Message: ${message}`,
      text: {
        format: {
          type: "json_schema",
          name: "expense_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              intent: { type: "string", enum: ["expense", "history", "help", "cancel"] },
              amount: { type: ["number", "null"] },
              category: { type: ["string", "null"] },
              purpose: { type: ["string", "null"] }
            },
            required: ["intent", "amount", "category", "purpose"]
          }
        }
      }
    });

    return expenseExtractionSchema.parse(JSON.parse(response.output_text));
  }
}

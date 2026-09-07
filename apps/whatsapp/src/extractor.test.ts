import { describe, expect, it, vi } from "vitest";
import { expenseExtractionSchema, OpenAIExpenseExtractor } from "./extractor";

type OpenAiRequest = {
  text: {
    format: {
      schema: {
        required: string[];
        properties: { amount: { type: string[] } };
      };
    };
  };
};

describe("expense extraction", () => {
  it("accepts explicit null fields for intents that are not expenses", () => {
    expect(expenseExtractionSchema.parse({
      intent: "history",
      amount: null,
      category: null,
      purpose: null
    })).toEqual({ intent: "history", amount: null, category: null, purpose: null });
  });

  it("sends an OpenAI strict schema with every property required", async () => {
    const create = vi.fn(async (_request: OpenAiRequest) => ({
      output_text: JSON.stringify({ intent: "expense", amount: 70, category: "transportation", purpose: "client meeting" })
    }));
    const extractor = new OpenAIExpenseExtractor({ responses: { create } } as never, "gpt-4o-mini");

    await expect(extractor.extract("Gastei R$70", ["transportation"])).resolves.toMatchObject({ intent: "expense", amount: 70 });

    const request = create.mock.calls[0]?.[0];
    if (!request) throw new Error("Expected the extractor to call OpenAI.");
    const schema = request.text.format.schema;
    expect(schema.required).toEqual(["intent", "amount", "category", "purpose"]);
    expect(schema.properties.amount.type).toEqual(["number", "null"]);
  });
});

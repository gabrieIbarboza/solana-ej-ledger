import { describe, expect, it, vi } from "vitest";
import { ComplianceClient, ComplianceClientError } from ".";

const expense = {
  organizationId: "ej-demo",
  memberId: "member-001",
  amount: 80,
  currency: "BRL",
  category: "transportation",
  purpose: "Client meeting"
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("ComplianceClient", () => {
  it("calls the API and returns typed compliance decisions", async () => {
    const fetcher = vi.fn(async () => response({
      decision: "APPROVED",
      policyVersion: "2026.1",
      reason: "ok",
      requiresApproval: false
    }));
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787", fetcher });

    await expect(client.checkExpense(expense)).resolves.toMatchObject({ decision: "APPROVED" });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:8787/v1/expenses/check", expect.objectContaining({
      method: "POST"
    }));
  });

  it("fetches policies", async () => {
    const fetcher = vi.fn(async () => response({ organizationId: "ej-demo", version: "2026.1", rules: [] }));
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787/", fetcher });

    await expect(client.getPolicy("ej-demo")).resolves.toMatchObject({ organizationId: "ej-demo" });
  });

  it("preserves the fetch receiver for browser-compatible fetch implementations", async () => {
    let receiver: unknown;
    const fetcher = function (this: typeof globalThis): Promise<Response> {
      receiver = this;
      return Promise.resolve(response({ organizationId: "ej-demo", version: "2026.1", rules: [] }));
    };
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787", fetcher: fetcher as typeof fetch });

    await client.getPolicy("ej-demo");

    expect(receiver).toBe(globalThis);
  });

  it("creates proof intents and submits signed transactions", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ payload: { proofHash: "a" }, memo: "EJ_COMPLIANCE:v1:a", decision: {}, cluster: "devnet" }))
      .mockResolvedValueOnce(response({ signature: "sig", explorerUrl: "url", submittedAt: "now" }));
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787", fetcher });

    await expect(client.createProofIntent(expense)).resolves.toMatchObject({ memo: "EJ_COMPLIANCE:v1:a" });
    await expect(client.submitSignedProofTransaction("AQID")).resolves.toMatchObject({ signature: "sig" });
  });

  it("fetches shared organization proof history for a configured viewer wallet", async () => {
    const fetcher = vi.fn(async () => response({
      organizationId: "ej-demo",
      proofs: [{ signature: "proof-signature", decision: "APPROVED" }]
    }));
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787", fetcher });

    await expect(
      client.getOrganizationProofHistory("ej-demo", "H3uFYgtCaTbbHHPtePrHy8o4gXV1YfBZ2wgpVvPCDLgp")
    ).resolves.toMatchObject({ proofs: [{ signature: "proof-signature", decision: "APPROVED" }] });
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:8787/v1/organizations/ej-demo/proofs?viewerWallet=H3uFYgtCaTbbHHPtePrHy8o4gXV1YfBZ2wgpVvPCDLgp",
      expect.any(Object)
    );
  });

  it("normalizes API errors", async () => {
    const fetcher = vi.fn(async () => response({ error: "policy not found" }, 404));
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787", fetcher });

    await expect(client.getPolicy("missing")).rejects.toMatchObject({
      name: "ComplianceClientError",
      message: "policy not found",
      status: 404
    } satisfies Partial<ComplianceClientError>);
  });

  it("normalizes empty server errors", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 500 }));
    const client = new ComplianceClient({ baseUrl: "http://localhost:8787", fetcher });

    await expect(client.getPolicy("ej-demo")).rejects.toMatchObject({
      message: "Request failed with 500",
      status: 500
    });
  });
});

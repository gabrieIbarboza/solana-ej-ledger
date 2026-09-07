import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppComplianceBot } from "./bot";

const expense = { organizationId: "ej-demo", memberId: "member-001", amount: 70, currency: "BRL", category: "transportation", purpose: "client meeting" };
const sdk = {
  getPolicy: vi.fn(async () => ({ organizationId: "ej-demo", version: "2026.1", rules: [{ category: "transportation", allowed: true, maxAmount: 100 }] })),
  checkExpense: vi.fn(async () => ({ decision: "APPROVED" as const, policyVersion: "2026.1", reason: "ok", requiresApproval: false })),
  createProofIntent: vi.fn(async () => ({ payload: {}, memo: "memo", decision: { decision: "APPROVED", policyVersion: "2026.1" }, cluster: "devnet" as const })),
  getOrganizationProofHistory: vi.fn(async () => ({ organizationId: "ej-demo", proofs: [{ memberName: "Bot", decision: "APPROVED", policyVersion: "2026.1", explorerUrl: "https://explorer" }] }))
};
const extractor = { extract: vi.fn(async () => ({ intent: "expense" as const, amount: 70, category: "transportation", purpose: "client meeting" })) };
const signer = { kind: "server-keypair" as const, getAddress: vi.fn(), signAndSendProof: vi.fn(async () => ({ signature: "sig", explorerUrl: "https://explorer", signerAddress: "bot", submittedAt: "now" })) };
const downloader = { download: vi.fn(async () => new Uint8Array([1, 2, 3])) };

function bot() {
  return new WhatsAppComplianceBot({ organizationId: "ej-demo", memberId: "member-001", viewerWallet: "viewer" }, sdk as never, extractor, signer, downloader);
}

beforeEach(() => {
  vi.clearAllMocks();
  sdk.checkExpense.mockResolvedValue({ decision: "APPROVED", policyVersion: "2026.1", reason: "ok", requiresApproval: false });
});

describe("WhatsAppComplianceBot", () => {
  it("confirms an approved expense before requesting a receipt and proof", async () => {
    const subject = bot();
    await expect(subject.handle({ sender: "whatsapp:+55", body: "Gastei R$70 transporte" })).resolves.toContain("CONFIRMAR");
    await expect(subject.handle({ sender: "whatsapp:+55", body: "CONFIRMAR" })).resolves.toContain("SOLICITAR AGORA");
    await subject.handle({ sender: "whatsapp:+55", body: "SOLICITAR AGORA" });
    const receiptPrompt = await subject.handle({ sender: "whatsapp:+55", body: "", media: { url: "https://media", contentType: "application/pdf" } });
    expect(receiptPrompt).toContain("CONFIRMAR PROOF");
    await expect(subject.handle({ sender: "whatsapp:+55", body: "CONFIRMAR PROOF" })).resolves.toContain("https://explorer");
    expect(sdk.createProofIntent).toHaveBeenCalledWith(expense, expect.objectContaining({ receiptHash: expect.any(String) }));
    expect(signer.signAndSendProof).toHaveBeenCalledOnce();
  });

  it("does not request a receipt for blocked decisions", async () => {
    sdk.checkExpense.mockResolvedValueOnce({ decision: "BLOCKED", policyVersion: "2026.1", reason: "blocked", requiresApproval: false } as never);
    const subject = bot();
    await subject.handle({ sender: "other", body: "expense" });
    await expect(subject.handle({ sender: "other", body: "CONFIRMAR" })).resolves.toContain("BLOCKED");
    expect(downloader.download).not.toHaveBeenCalled();
  });

  it("returns the ten newest history entries through the SDK", async () => {
    await expect(bot().handle({ sender: "history", body: "HISTÓRICO" })).resolves.toContain("RID 2026.1");
    expect(sdk.getOrganizationProofHistory).toHaveBeenCalledWith("ej-demo", "viewer");
  });
});

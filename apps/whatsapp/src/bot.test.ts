import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppComplianceBot } from "./bot";

const expense = { organizationId: "ej-demo", memberId: "member-001", amount: 70, currency: "BRL", category: "transportation", purpose: "client meeting" };
const historyProof = {
  memberId: "whatsapp-bot",
  memberName: "WhatsApp bot",
  signerAddress: "signer",
  signature: "signature",
  explorerUrl: "https://explorer/transaction",
  occurredAt: "2026-09-07T12:00:00.000Z",
  confirmationStatus: "finalized" as const,
  decision: "APPROVED" as const,
  policyVersion: "2026.1",
  proofHash: "p".repeat(64),
  policyHash: "q".repeat(64),
  expenseHash: "r".repeat(64),
  receiptHash: "s".repeat(64)
};
const sdk = {
  getPolicy: vi.fn(async () => ({ organizationId: "ej-demo", version: "2026.1", rules: [{ category: "transportation", allowed: true, maxAmount: 100 }] })),
  checkExpense: vi.fn(async () => ({ decision: "APPROVED" as const, policyVersion: "2026.1", reason: "ok", requiresApproval: false })),
  createProofIntent: vi.fn(async () => ({ payload: {}, memo: "memo", decision: { decision: "APPROVED", policyVersion: "2026.1" }, cluster: "devnet" as const })),
  getOrganizationProofHistory: vi.fn(async () => ({ organizationId: "ej-demo", proofs: [historyProof] }))
};
const extractor = { extract: vi.fn(async () => ({ intent: "expense" as const, amount: 70, category: "transportation", purpose: "client meeting" })) };
const signer = { kind: "server-keypair" as const, getAddress: vi.fn(), signAndSendProof: vi.fn(async () => ({ signature: "sig", explorerUrl: "https://explorer", signerAddress: "bot", submittedAt: "now" })) };
const downloader = { download: vi.fn(async () => new Uint8Array([1, 2, 3])) };

function bot() {
  return new WhatsAppComplianceBot({ organizationId: "ej-demo", memberId: "member-001", viewerWallet: "viewer" }, sdk as never, extractor as never, signer, downloader);
}

async function approveExpense(subject: WhatsAppComplianceBot, sender = "whatsapp:+55") {
  await subject.handle({ sender, body: "Gastei R$70 transporte" });
  return subject.handle({ sender, body: "CONFIRMAR" });
}

beforeEach(() => {
  vi.clearAllMocks();
  sdk.getPolicy.mockResolvedValue({ organizationId: "ej-demo", version: "2026.1", rules: [{ category: "transportation", allowed: true, maxAmount: 100 }] });
  sdk.checkExpense.mockResolvedValue({ decision: "APPROVED", policyVersion: "2026.1", reason: "ok", requiresApproval: false });
  sdk.createProofIntent.mockResolvedValue({ payload: {}, memo: "memo", decision: { decision: "APPROVED", policyVersion: "2026.1" }, cluster: "devnet" });
  sdk.getOrganizationProofHistory.mockResolvedValue({ organizationId: "ej-demo", proofs: [historyProof] });
  extractor.extract.mockResolvedValue({ intent: "expense", amount: 70, category: "transportation", purpose: "client meeting" });
  signer.signAndSendProof.mockResolvedValue({ signature: "sig", explorerUrl: "https://explorer", signerAddress: "bot", submittedAt: "now" });
  downloader.download.mockResolvedValue(new Uint8Array([1, 2, 3]));
});

describe("WhatsAppComplianceBot", () => {
  it("welcomes help and unrecognized messages without checking compliance", async () => {
    const subject = bot();
    await expect(subject.handle({ sender: "help", body: "AJUDA" })).resolves.toContain("Sou o bot do EJ Ledger");
    expect(sdk.getPolicy).not.toHaveBeenCalled();
    expect(sdk.checkExpense).not.toHaveBeenCalled();

    extractor.extract.mockResolvedValueOnce({ intent: "help", amount: null, category: null, purpose: null } as never);
    await expect(subject.handle({ sender: "other", body: "Como você funciona?" })).resolves.toContain("HISTÓRICO");
    expect(sdk.checkExpense).not.toHaveBeenCalled();
  });

  it("goes from approval to receipt upload and creates one proof without technical confirmation commands", async () => {
    const subject = bot();
    await expect(subject.handle({ sender: "whatsapp:+55", body: "Gastei R$70 transporte" })).resolves.toContain("CONFIRMAR");
    await expect(subject.handle({ sender: "whatsapp:+55", body: "CONFIRMAR" })).resolves.toContain("anexe um comprovante");

    const reply = await subject.handle({ sender: "whatsapp:+55", body: "", media: { url: "https://media", contentType: "application/pdf" } });
    expect(reply).toContain("https://explorer");
    expect(reply).not.toContain("CONFIRMAR PROOF");
    expect(reply).not.toContain("SOLICITAR AGORA");
    expect(sdk.createProofIntent).toHaveBeenCalledWith(expense, expect.objectContaining({ receiptHash: expect.any(String) }));
    expect(signer.signAndSendProof).toHaveBeenCalledOnce();
  });

  it("keeps the receipt step after invalid media or a failed proof submission", async () => {
    const subject = bot();
    await approveExpense(subject);
    await expect(subject.handle({ sender: "whatsapp:+55", body: "", media: { url: "https://media", contentType: "text/plain" } })).resolves.toContain("Formato inválido");
    expect(downloader.download).not.toHaveBeenCalled();

    downloader.download.mockResolvedValueOnce(new Uint8Array(5 * 1024 * 1024 + 1));
    await expect(subject.handle({ sender: "whatsapp:+55", body: "", media: { url: "https://media", contentType: "application/pdf" } })).resolves.toContain("ultrapassa 5 MB");
    expect(signer.signAndSendProof).not.toHaveBeenCalled();

    signer.signAndSendProof.mockRejectedValueOnce(new Error("rpc unavailable"));
    await expect(subject.handle({ sender: "whatsapp:+55", body: "", media: { url: "https://media", contentType: "application/pdf" } })).resolves.toContain("Não foi possível confirmar");
    await expect(subject.handle({ sender: "whatsapp:+55", body: "", media: { url: "https://media", contentType: "application/pdf" } })).resolves.toContain("https://explorer");
  });

  it.each(["BLOCKED", "NEEDS_APPROVAL"] as const)("does not request a receipt or sign %s decisions", async (decision) => {
    sdk.checkExpense.mockResolvedValueOnce({ decision, policyVersion: "2026.1", reason: "not approved", requiresApproval: decision === "NEEDS_APPROVAL" } as never);
    const subject = bot();
    await subject.handle({ sender: decision, body: "expense" });
    await expect(subject.handle({ sender: decision, body: "CONFIRMAR" })).resolves.toContain(decision);
    expect(downloader.download).not.toHaveBeenCalled();
    expect(signer.signAndSendProof).not.toHaveBeenCalled();
  });

  it("returns the ten newest history rows with the public hashes and receipt hash", async () => {
    sdk.getOrganizationProofHistory.mockResolvedValueOnce({
      organizationId: "ej-demo",
      proofs: Array.from({ length: 11 }, (_, index) => ({ ...historyProof, signature: `signature-${index}`, proofHash: String(index).padStart(64, "0") }))
    });

    const replies = await bot().handle({ sender: "history", body: "HISTÓRICO" });
    expect(Array.isArray(replies)).toBe(true);
    const messages = replies as string[];
    const reply = messages.join("\n");
    expect(messages.length).toBeGreaterThan(1);
    expect(messages.every((message) => message.length <= 1_500)).toBe(true);
    expect(messages[0]).toContain("⚠️ POC");
    expect(reply).toContain(`Proof: ${"0".repeat(64)}`);
    expect(reply).toContain(`Policy: ${historyProof.policyHash}`);
    expect(reply).toContain(`Expense: ${historyProof.expenseHash}`);
    expect(reply).toContain(`Receipt: ${historyProof.receiptHash}`);
    expect(reply).toContain("Explorer: https://explorer/transaction");
    expect(reply).toContain("10. WhatsApp bot");
    expect(reply).not.toContain("11. WhatsApp bot");
    expect(sdk.getOrganizationProofHistory).toHaveBeenCalledWith("ej-demo", "viewer");
  });
});

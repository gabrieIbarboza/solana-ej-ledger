import { createHash } from "node:crypto";
import type { Expense } from "@ej-ledger/core";
import type { ComplianceClient, ProofSigner } from "@ej-ledger/sdk";
import type { ExpenseExtractor } from "./extractor";
import { SessionStore, type ConversationState } from "./state";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ACCEPTED_RECEIPT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export interface IncomingMessage {
  sender: string;
  body: string;
  media?: { url: string; contentType: string };
}

export interface WhatsAppBotConfig {
  organizationId: string;
  memberId: string;
  viewerWallet: string;
}

export interface ReceiptDownloader {
  download(url: string): Promise<Uint8Array>;
}

function command(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

function formatDecision(decision: { decision: string; policyVersion: string; reason: string }): string {
  return `${decision.decision === "APPROVED" ? "✅" : decision.decision === "NEEDS_APPROVAL" ? "🟡" : "❌"} ${decision.decision}\nRID ${decision.policyVersion}: ${decision.reason}`;
}

export class WhatsAppComplianceBot {
  constructor(
    private readonly config: WhatsAppBotConfig,
    private readonly sdk: ComplianceClient,
    private readonly extractor: ExpenseExtractor,
    private readonly signer: ProofSigner,
    private readonly receipts: ReceiptDownloader,
    private readonly sessions = new SessionStore()
  ) {}

  async handle(message: IncomingMessage): Promise<string> {
    const value = command(message.body);
    if (value === "CANCELAR") {
      this.sessions.clear(message.sender);
      return "Conversa cancelada. Envie uma nova despesa quando quiser.";
    }
    if (value === "HISTORICO" || value === "HISTÓRICO" || value.includes("TRANSAC")) return this.history();

    const state = this.sessions.get(message.sender);
    if (state) return this.handleState(message.sender, state, value, message);

    const policy = await this.sdk.getPolicy(this.config.organizationId);
    const extracted = await this.extractor.extract(message.body, policy.rules.map((rule) => rule.category));
    if (extracted.intent === "history") return this.history();
    if (extracted.intent !== "expense" || !extracted.amount || !extracted.category || !extracted.purpose) {
      return "Não consegui identificar valor, categoria e finalidade. Exemplo: Gastei R$70 de transporte para falar com cliente.";
    }
    const expense: Expense = {
      organizationId: this.config.organizationId,
      memberId: this.config.memberId,
      amount: extracted.amount,
      currency: "BRL",
      category: extracted.category.toLowerCase(),
      purpose: extracted.purpose
    };
    this.sessions.set(message.sender, { kind: "awaiting-confirmation", expense });
    return `Entendi: R$${expense.amount.toFixed(2)} em ${expense.category} para “${expense.purpose}”.\nResponda CONFIRMAR, CORRIGIR ou CANCELAR.`;
  }

  private async handleState(sender: string, state: ConversationState, value: string, message: IncomingMessage): Promise<string> {
    if (state.kind === "awaiting-confirmation") {
      if (value === "CORRIGIR") { this.sessions.clear(sender); return "Envie novamente a descrição completa da despesa."; }
      if (value !== "CONFIRMAR") return "Responda CONFIRMAR, CORRIGIR ou CANCELAR.";
      const decision = await this.sdk.checkExpense(state.expense);
      if (decision.decision !== "APPROVED") { this.sessions.clear(sender); return formatDecision(decision); }
      this.sessions.set(sender, { kind: "awaiting-request", expense: state.expense, decision });
      return `${formatDecision(decision)}\nDeseja solicitar a proof de teste agora? Responda SOLICITAR AGORA.`;
    }
    if (state.kind === "awaiting-request") {
      if (value !== "SOLICITAR AGORA") return "Responda SOLICITAR AGORA ou CANCELAR.";
      this.sessions.set(sender, { kind: "awaiting-receipt", expense: state.expense, decision: state.decision });
      return "Anexe um comprovante PDF, JPEG ou PNG de até 5 MB.";
    }
    if (state.kind === "awaiting-receipt") {
      if (!message.media) return "Envie um comprovante PDF, JPEG ou PNG de até 5 MB.";
      if (!ACCEPTED_RECEIPT_TYPES.has(message.media.contentType)) return "Formato inválido. Envie PDF, JPEG ou PNG.";
      const bytes = await this.receipts.download(message.media.url);
      if (bytes.byteLength > MAX_RECEIPT_BYTES) return "O comprovante ultrapassa 5 MB.";
      const receiptHash = createHash("sha256").update(bytes).digest("hex");
      this.sessions.set(sender, { kind: "awaiting-proof-confirmation", expense: state.expense, decision: state.decision, receiptHash });
      return `Comprovante recebido e descartado após o hash.\nProof devnet: nenhuma transferência; a wallet do servidor paga a taxa.\nReceipt hash: ${receiptHash}\nResponda CONFIRMAR PROOF para simular, assinar e enviar.`;
    }
    if (value !== "CONFIRMAR PROOF") return "Responda CONFIRMAR PROOF ou CANCELAR.";
    const intent = await this.sdk.createProofIntent(state.expense, { receiptHash: state.receiptHash });
    const submission = await this.signer.signAndSendProof({ payload: intent.payload, memo: intent.memo, cluster: intent.cluster });
    this.sessions.clear(sender);
    return `✅ Proof devnet criada para RID ${intent.decision.policyVersion}.\n${submission.explorerUrl}`;
  }

  private async history(): Promise<string> {
    const history = await this.sdk.getOrganizationProofHistory(this.config.organizationId, this.config.viewerWallet);
    if (history.proofs.length === 0) return "Nenhuma proof encontrada ainda.";
    return history.proofs.slice(0, 10).map((proof, index) => `${index + 1}. ${proof.memberName} — ${proof.decision} — RID ${proof.policyVersion}\n${proof.explorerUrl}`).join("\n\n");
  }
}

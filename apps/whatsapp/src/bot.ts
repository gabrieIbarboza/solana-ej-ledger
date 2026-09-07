import { createHash } from "node:crypto";
import type { Expense } from "@ej-ledger/core";
import type { ComplianceClient, ProofSigner } from "@ej-ledger/sdk";
import type { ExpenseExtractor } from "./extractor";
import { SessionStore, type ConversationState } from "./state";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const MAX_TWILIO_MESSAGE_CHARACTERS = 1_500;
const ACCEPTED_RECEIPT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const HISTORY_NOTICE = "⚠️ POC: por enquanto, o histórico mostra apenas hashes públicos on-chain. Ainda não há banco de dados para exibir detalhes off-chain. \n\n Saldo Atual da EJ: R$ 1350,00";
const WELCOME_MESSAGE = [
  "Olá! Sou o bot do EJ Ledger 💜🤖",
  "\nPosso verificar se uma despesa segue o RID (Requerimento Interno de Despesas), confirmar uma solicitação de teste com comprovante e mostrar o histórico público da EJ.",
  "Exemplos: ",
  "* Gastei R$70 de transporte para falar com cliente.",
  "* Envie HISTÓRICO para consultar as transações da EJ."
].join("\n");

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

export type BotReply = string | string[];

function command(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

function formatDecision(decision: { decision: string; policyVersion: string; reason: string }): string {
  return `${decision.decision === "APPROVED" ? "✅" : decision.decision === "NEEDS_APPROVAL" ? "🟡" : "❌"} ${decision.decision}\nRID ${decision.policyVersion}: ${decision.reason}`;
}

function formatOccurredAt(occurredAt: string | null): string {
  if (occurredAt === null) return "horário indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(occurredAt));
}

function splitHistoryMessages(entries: string[]): string[] {
  const messages = [HISTORY_NOTICE];

  for (const entry of entries) {
    const current = messages.at(-1) ?? HISTORY_NOTICE;
    const combined = `${current}\n\n${entry}`;
    if (combined.length <= MAX_TWILIO_MESSAGE_CHARACTERS) {
      messages[messages.length - 1] = combined;
    } else {
      messages.push(entry);
    }
  }

  return messages;
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

  async handle(message: IncomingMessage): Promise<BotReply> {
    const value = command(message.body);
    if (value === "CANCELAR") {
      this.sessions.clear(message.sender);
      return "Conversa cancelada. Envie uma nova despesa quando quiser.";
    }
    if (value === "HISTORICO" || value.includes("TRANSAC")) return this.history();

    const state = this.sessions.get(message.sender);
    if (state) return this.handleState(message.sender, state, value, message);

    if (value === "AJUDA" || value === "OI" || value === "OLA" || value === "OLÁ") return WELCOME_MESSAGE;

    const policy = await this.sdk.getPolicy(this.config.organizationId);
    const extracted = await this.extractor.extract(message.body, policy.rules.map((rule) => rule.category));
    if (extracted.intent === "history") return this.history();
    if (extracted.intent !== "expense" || !extracted.amount || !extracted.category || !extracted.purpose) {
      return WELCOME_MESSAGE;
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
      this.sessions.set(sender, { kind: "awaiting-receipt", expense: state.expense });
      return `${formatDecision(decision)}\nSe desejar confirmar o reembolso agora, anexe um comprovante PDF, JPEG ou PNG de até 5 MB.`;
    }
    if (!message.media) return "Envie um comprovante PDF, JPEG ou PNG de até 5 MB.";
    if (!ACCEPTED_RECEIPT_TYPES.has(message.media.contentType)) return "Formato inválido. Envie PDF, JPEG ou PNG.";

    try {
      const bytes = await this.receipts.download(message.media.url);
      if (bytes.byteLength > MAX_RECEIPT_BYTES) return "O comprovante ultrapassa 5 MB.";
      const receiptHash = createHash("sha256").update(bytes).digest("hex");
      const intent = await this.sdk.createProofIntent(state.expense, { receiptHash });
      const submission = await this.signer.signAndSendProof({ payload: intent.payload, memo: intent.memo, cluster: intent.cluster });
      this.sessions.clear(sender);
      return `✅ Solicitação confirmada para teste.\n\nVeja a transação (devmode): ${submission.explorerUrl}`;
    } catch {
      return "Não foi possível confirmar a solicitação agora. Envie o comprovante novamente para tentar de novo.";
    }
  }

  private async history(): Promise<BotReply> {
    const history = await this.sdk.getOrganizationProofHistory(this.config.organizationId, this.config.viewerWallet);
    if (history.proofs.length === 0) return `${HISTORY_NOTICE}\n\nNenhuma proof encontrada ainda.`;
    const proofs = history.proofs.slice(0, 10).map((proof, index) => {
      const receiptHash = proof.receiptHash === undefined ? "" : `\nReceipt: ${proof.receiptHash}`;
      return `${index + 1}. ${proof.memberName} — ${proof.decision} — RID ${proof.policyVersion}\n${formatOccurredAt(proof.occurredAt)}\nProof: ${proof.proofHash}\nPolicy: ${proof.policyHash}\nExpense: ${proof.expenseHash}${receiptHash}\nExplorer: ${proof.explorerUrl}`;
    });
    return splitHistoryMessages(proofs);
  }
}

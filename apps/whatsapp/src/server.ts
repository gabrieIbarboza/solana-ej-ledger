import { serve } from "@hono/node-server";
import OpenAI from "openai";
import { ComplianceClient } from "@ej-ledger/sdk";
import { createWhatsAppApp } from "./app";
import { WhatsAppComplianceBot } from "./bot";
import { OpenAIExpenseExtractor } from "./extractor";
import { ServerKeypairProofSigner } from "./server-keypair-proof-signer";

function required(name: string): string { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
const accountSid = required("TWILIO_ACCOUNT_SID");
const authToken = required("TWILIO_AUTH_TOKEN");
const sdk = new ComplianceClient({ baseUrl: process.env.EJ_LEDGER_API_BASE_URL ?? "http://localhost:8787" });
const signer = new ServerKeypairProofSigner({
  rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  secretKey: new Uint8Array(JSON.parse(required("EJ_LEDGER_DEVNET_SIGNER_SECRET_KEY"))),
  submitSignedTransaction: (serializedTransaction) => sdk.submitSignedProofTransaction(serializedTransaction)
});
const downloader = { download: async (url: string) => {
  const response = await fetch(url, { headers: { authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` } });
  if (!response.ok) throw new Error("Could not download receipt from Twilio.");
  return new Uint8Array(await response.arrayBuffer());
} };
const bot = new WhatsAppComplianceBot({
  organizationId: process.env.WHATSAPP_ORGANIZATION_ID ?? "ej-demo",
  memberId: process.env.WHATSAPP_MEMBER_ID ?? "member-001",
  viewerWallet: required("WHATSAPP_VIEWER_WALLET")
}, sdk, new OpenAIExpenseExtractor(new OpenAI({ apiKey: required("OPENAI_API_KEY") }), process.env.OPENAI_MODEL ?? "gpt-4o-mini"), signer, downloader);
const app = createWhatsAppApp({ authToken, allowedFrom: required("TWILIO_ALLOWED_FROM"), publicWebhookUrl: required("PUBLIC_WEBHOOK_URL") }, bot);
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8788) });

import { Hono } from "hono";
import twilio from "twilio";
import type { WhatsAppComplianceBot } from "./bot";

export interface WhatsAppAppConfig {
  authToken: string;
  allowedFrom: string;
  publicWebhookUrl: string;
}

export function createWhatsAppApp(config: WhatsAppAppConfig, bot: WhatsAppComplianceBot) {
  const processed = new Set<string>();
  const app = new Hono();

  app.post("/webhooks/twilio/whatsapp", async (c) => {
    const form = await c.req.parseBody();
    const params = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value)]));
    const signature = c.req.header("X-Twilio-Signature") ?? "";
    if (!twilio.validateRequest(config.authToken, signature, config.publicWebhookUrl, params)) return c.text("forbidden", 403);
    if (params.From !== config.allowedFrom) return c.text("forbidden", 403);
    const sender = params.From;
    const messageSid = params.MessageSid;
    if (!sender || !messageSid) return c.text("invalid message", 400);
    if (processed.has(messageSid)) return c.text("");
    processed.add(messageSid);
    const reply = await bot.handle({
      sender,
      body: params.Body ?? "",
      ...(params.NumMedia !== "0" && params.MediaUrl0 && params.MediaContentType0
        ? { media: { url: params.MediaUrl0, contentType: params.MediaContentType0 } }
        : {})
    });
    return c.text(`<Response><Message>${escapeXml(reply)}</Message></Response>`, 200, { "content-type": "text/xml" });
  });

  return app;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] ?? character);
}

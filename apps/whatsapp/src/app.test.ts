import { describe, expect, it, vi } from "vitest";
import { getExpectedTwilioSignature } from "twilio";
import { createWhatsAppApp } from "./app";

const url = "https://example.test/webhooks/twilio/whatsapp";
const authToken = "test-token";
const params = { From: "whatsapp:+5511999999999", Body: "histórico", MessageSid: "SM1", NumMedia: "0" };

function request(app: ReturnType<typeof createWhatsAppApp>, body = params, signature = getExpectedTwilioSignature(authToken, url, body)) {
  return app.request("/webhooks/twilio/whatsapp", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "X-Twilio-Signature": signature },
    body: new URLSearchParams(body).toString()
  });
}

describe("Twilio WhatsApp webhook", () => {
  it("rejects invalid signatures before dispatching the message", async () => {
    const handle = vi.fn();
    const app = createWhatsAppApp({ authToken, allowedFrom: params.From, publicWebhookUrl: url }, { handle } as never);
    await expect(request(app, params, "invalid")).resolves.toMatchObject({ status: 403 });
    expect(handle).not.toHaveBeenCalled();
  });

  it("rejects a signed but unauthorized sender", async () => {
    const handle = vi.fn();
    const body = { ...params, From: "whatsapp:+5500000000000" };
    const app = createWhatsAppApp({ authToken, allowedFrom: params.From, publicWebhookUrl: url }, { handle } as never);
    await expect(request(app, body)).resolves.toMatchObject({ status: 403 });
    expect(handle).not.toHaveBeenCalled();
  });
});

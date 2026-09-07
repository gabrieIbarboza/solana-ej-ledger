import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createHeliusBroadcaster } from "./solana";

const port = Number(process.env.PORT ?? 8787);
const rpcUrl = process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com";

const app = createApp({
  broadcaster: createHeliusBroadcaster(rpcUrl)
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`EJ Ledger API listening on http://localhost:${info.port}`);
});

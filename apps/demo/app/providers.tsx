"use client";

import type { ReactNode } from "react";
import { SolanaProvider } from "@solana/react-hooks";

function getSolanaEndpoint(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
}

function getSolanaWebsocketEndpoint(endpoint: string): string {
  return process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? endpoint.replace("https://", "wss://").replace("http://", "ws://");
}

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const endpoint = getSolanaEndpoint();

  return (
    <SolanaProvider
      config={{
        endpoint,
        websocketEndpoint: getSolanaWebsocketEndpoint(endpoint),
        commitment: "confirmed",
        walletConnectors: "default"
      }}
    >
      {children}
    </SolanaProvider>
  );
}

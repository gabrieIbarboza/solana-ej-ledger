import { createSolanaRpc, type Base64EncodedWireTransaction, type Signature } from "@solana/kit";

export interface TransactionBroadcaster {
  sendRawTransaction(serializedTransaction: string): Promise<string>;
}

export function createExplorerUrl(signature: string, cluster = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function createHeliusBroadcaster(rpcUrl: string): TransactionBroadcaster {
  const rpc = createSolanaRpc(rpcUrl);

  return {
    async sendRawTransaction(serializedTransaction: string): Promise<string> {
      const signature: Signature = await rpc
        .sendTransaction(serializedTransaction as Base64EncodedWireTransaction, {
          encoding: "base64",
          preflightCommitment: "confirmed",
          skipPreflight: false
        })
        .send();

      return signature.toString();
    }
  };
}

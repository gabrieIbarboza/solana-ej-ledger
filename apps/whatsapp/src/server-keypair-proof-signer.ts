import {
  address,
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners
} from "@solana/kit";
import type { ProofSignInput, ProofSubmission } from "@ej-ledger/sdk";

const MEMO_PROGRAM = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface ServerKeypairProofSignerConfig {
  rpcUrl: string;
  secretKey: Uint8Array;
  submitSignedTransaction(serializedTransaction: string): Promise<{ signature: string; explorerUrl: string; submittedAt: string }>;
}

export class ServerKeypairProofSigner {
  readonly kind = "server-keypair" as const;
  private readonly rpc;
  private readonly signerPromise;

  constructor(private readonly config: ServerKeypairProofSignerConfig) {
    this.rpc = createSolanaRpc(config.rpcUrl);
    this.signerPromise = createKeyPairSignerFromBytes(config.secretKey);
  }

  async getAddress(): Promise<string> {
    return (await this.signerPromise).address;
  }

  async signAndSendProof(input: ProofSignInput): Promise<ProofSubmission> {
    if (input.cluster !== "devnet") throw new Error("ServerKeypairProofSigner only permits devnet proofs.");
    const signer = await this.signerPromise;
    const latestBlockhash = await this.rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
    const message = pipe(
      createTransactionMessage({ version: "legacy" }),
      (transaction) => setTransactionMessageFeePayerSigner(signer, transaction),
      (transaction) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash.value, transaction),
      (transaction) => appendTransactionMessageInstruction({ programAddress: MEMO_PROGRAM, data: new TextEncoder().encode(input.memo) }, transaction)
    );
    const signed = await signTransactionMessageWithSigners(message);
    const serializedTransaction = getBase64EncodedWireTransaction(signed);
    const simulation = await this.rpc.simulateTransaction(serializedTransaction, {
      commitment: "confirmed",
      encoding: "base64",
      sigVerify: true
    }).send();
    if (simulation.value.err !== null) throw new Error("Proof transaction simulation failed.");
    const submission = await this.config.submitSignedTransaction(serializedTransaction);
    return { ...submission, signerAddress: signer.address };
  }
}

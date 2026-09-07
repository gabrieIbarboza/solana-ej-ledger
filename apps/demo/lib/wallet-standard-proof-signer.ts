import type { ProofSignInput, ProofSubmission } from "@ej-ledger/sdk";
import type { SolanaClient, TransactionInstructionInput, WalletSession } from "@solana/client";
import { transactionToBase64, toAddress } from "@solana/client";

const MEMO_PROGRAM_ADDRESS = toAddress("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface WalletStandardProofSignerConfig {
  client: SolanaClient;
  session: WalletSession;
  submitSignedTransaction: (serializedTransaction: string) => Promise<{
    signature: string;
    explorerUrl: string;
    submittedAt: string;
  }>;
}

type PreparedTransaction = Awaited<ReturnType<SolanaClient["transaction"]["prepare"]>>;

export interface PreparedProofTransaction {
  input: ProofSignInput;
  prepared: PreparedTransaction;
  feePayer: string;
  memoProgram: string;
  walletName: string;
  simulation: {
    ok: boolean;
    unitsConsumed?: bigint | number;
  };
}

export class WalletStandardProofSigner {
  readonly kind = "user-wallet" as const;

  constructor(private readonly config: WalletStandardProofSignerConfig) {}

  async getAddress(): Promise<string> {
    return this.config.session.account.address.toString();
  }

  async prepareProofTransaction(input: ProofSignInput): Promise<PreparedProofTransaction> {
    const instruction = createMemoInstruction(input.memo);
    const prepared = await this.config.client.transaction.prepare({
      authority: this.config.session,
      commitment: "confirmed",
      feePayer: this.config.session.account.address,
      instructions: [instruction],
      version: "legacy"
    });

    const unsignedTransaction = transactionToBase64(prepared.message);
    const simulation = await this.config.client.runtime.rpc
      .simulateTransaction(unsignedTransaction, {
        commitment: "confirmed",
        encoding: "base64",
        replaceRecentBlockhash: false,
        sigVerify: false
      })
      .send();

    if (simulation.value.err) {
      throw new Error("Proof transaction simulation failed before wallet signing.");
    }

    return {
      input,
      prepared,
      feePayer: this.config.session.account.address.toString(),
      memoProgram: MEMO_PROGRAM_ADDRESS.toString(),
      walletName: this.config.session.connector.name,
      simulation: simulation.value.unitsConsumed === undefined
        ? { ok: true }
        : { ok: true, unitsConsumed: simulation.value.unitsConsumed }
    };
  }

  async signAndSendPreparedProof(preparedProof: PreparedProofTransaction): Promise<ProofSubmission> {
    const serializedTransaction = await this.config.client.transaction.toWire(preparedProof.prepared);
    const result = await this.config.submitSignedTransaction(serializedTransaction);

    return {
      ...result,
      signerAddress: this.config.session.account.address.toString()
    };
  }

  async signAndSendProof(input: ProofSignInput): Promise<ProofSubmission> {
    const preparedProof = await this.prepareProofTransaction(input);
    return this.signAndSendPreparedProof(preparedProof);
  }
}

function createMemoInstruction(memo: string): TransactionInstructionInput {
  return {
    data: new TextEncoder().encode(memo),
    programAddress: MEMO_PROGRAM_ADDRESS
  };
}

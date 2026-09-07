import type { ComplianceDecision, ComplianceStatus, Expense, Policy } from "@ej-ledger/core";

export type ProofSignerKind = "user-wallet" | "server-keypair";
export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

export interface ProofPayload {
  organizationId: string;
  policyVersion: string;
  policyHash: string;
  expenseHash: string;
  decision: ComplianceStatus;
  timestamp: string;
  proofHash: string;
}

export interface CreateProofPayloadInput {
  expense: Expense;
  policy: Policy;
  decision: ComplianceDecision;
  timestamp?: string;
}

export interface ProofSignInput {
  payload: ProofPayload;
  memo: string;
  cluster: SolanaCluster;
  rpcUrl?: string;
}

export interface ProofSubmission {
  signature: string;
  explorerUrl: string;
  signerAddress: string;
  submittedAt: string;
}

export interface ProofSigner {
  kind: ProofSignerKind;
  getAddress(): Promise<string>;
  signAndSendProof(input: ProofSignInput): Promise<ProofSubmission>;
}

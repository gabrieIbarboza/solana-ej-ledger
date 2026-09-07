import { address, createSolanaRpc, type Signature } from "@solana/kit";
import { parseProofMemo } from "@ej-ledger/proof";
import { createExplorerUrl } from "./solana";
import type { OrganizationMember } from "./members";

const HISTORY_LIMIT_PER_MEMBER = 25;

export type ProofConfirmationStatus = "confirmed" | "finalized" | "unknown";

export interface ObservedProofTransaction {
  signature: string;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: ProofConfirmationStatus;
  succeeded: boolean;
  memoVerified: boolean;
  signerAddresses: string[];
}

export interface ProofHistorySource {
  getTransactions(walletAddress: string): Promise<ObservedProofTransaction[]>;
}

export interface OrganizationProofHistoryItem {
  memberId: string;
  memberName: string;
  signerAddress: string;
  signature: string;
  explorerUrl: string;
  occurredAt: string | null;
  confirmationStatus: ProofConfirmationStatus;
  decision: "APPROVED" | "NEEDS_APPROVAL" | "BLOCKED";
  policyVersion: string;
  proofHash: string;
  policyHash: string;
  expenseHash: string;
}

function addressesMatch(first: string, second: string): boolean {
  return first === second;
}

function toOccurredAt(blockTime: number | null): string | null {
  return blockTime === null ? null : new Date(blockTime * 1_000).toISOString();
}

function byNewestFirst(first: OrganizationProofHistoryItem, second: OrganizationProofHistoryItem): number {
  const firstTime = first.occurredAt === null ? 0 : Date.parse(first.occurredAt);
  const secondTime = second.occurredAt === null ? 0 : Date.parse(second.occurredAt);
  return secondTime - firstTime;
}

export async function getOrganizationProofHistory(
  members: OrganizationMember[],
  source: ProofHistorySource
): Promise<OrganizationProofHistoryItem[]> {
  const observedByMember = await Promise.all(
    members.map(async (member) => ({ member, transactions: await source.getTransactions(member.walletAddress) }))
  );
  const proofs = new Map<string, OrganizationProofHistoryItem>();

  for (const { member, transactions } of observedByMember) {
    for (const transaction of transactions) {
      const parsedMemo = transaction.memo === null ? null : parseProofMemo(transaction.memo);
      const isSignedByMember = transaction.signerAddresses.some((signer) =>
        addressesMatch(signer, member.walletAddress)
      );

      if (!parsedMemo || !transaction.succeeded || !transaction.memoVerified || !isSignedByMember) {
        continue;
      }

      proofs.set(transaction.signature, {
        memberId: member.memberId,
        memberName: member.displayName,
        signerAddress: member.walletAddress,
        signature: transaction.signature,
        explorerUrl: createExplorerUrl(transaction.signature),
        occurredAt: toOccurredAt(transaction.blockTime),
        confirmationStatus: transaction.confirmationStatus,
        ...parsedMemo
      });
    }
  }

  return [...proofs.values()].sort(byNewestFirst);
}

function toConfirmationStatus(value: string | null): ProofConfirmationStatus {
  return value === "finalized" || value === "confirmed" ? value : "unknown";
}

function normalizeRpcMemo(memo: string | null): string | null {
  return memo === null ? null : memo.replace(/^\[\d+\]\s+/, "");
}

export function createSolanaProofHistorySource(rpcUrl: string): ProofHistorySource {
  const rpc = createSolanaRpc(rpcUrl);

  return {
    async getTransactions(walletAddress: string): Promise<ObservedProofTransaction[]> {
      const signatures = await rpc
        .getSignaturesForAddress(address(walletAddress), {
          commitment: "confirmed",
          limit: HISTORY_LIMIT_PER_MEMBER
        })
        .send();
      const candidates = signatures.filter((transaction) =>
        transaction.err === null && parseProofMemo(normalizeRpcMemo(transaction.memo) ?? "") !== null
      );

      const observed = await Promise.all(
        candidates.map(async (candidate): Promise<ObservedProofTransaction | null> => {
          const transaction = await rpc
            .getTransaction(candidate.signature as Signature, {
              commitment: "confirmed",
              encoding: "jsonParsed",
              maxSupportedTransactionVersion: 0
            })
            .send();

          if (transaction === null || transaction.meta === null) {
            return null;
          }

          const memo = normalizeRpcMemo(candidate.memo);
          const logs = transaction.meta.logMessages ?? [];

          return {
            signature: candidate.signature.toString(),
            memo,
            blockTime: candidate.blockTime === null ? null : Number(candidate.blockTime),
            confirmationStatus: toConfirmationStatus(candidate.confirmationStatus),
            succeeded: transaction.meta.err === null,
            memoVerified: memo !== null && logs.some((log) => log.includes(memo)),
            signerAddresses: transaction.transaction.message.accountKeys
              .filter((account) => account.signer)
              .map((account) => account.pubkey.toString())
          };
        })
      );

      return observed.filter((transaction): transaction is ObservedProofTransaction => transaction !== null);
    }
  };
}

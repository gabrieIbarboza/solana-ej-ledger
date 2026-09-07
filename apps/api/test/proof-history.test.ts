import { describe, expect, it } from "vitest";
import { getOrganizationProofHistory, type ProofHistorySource } from "../src/proof-history";

const member = {
  memberId: "member-001",
  displayName: "Gabriel Barboza",
  walletAddress: "H3uFYgtCaTbbHHPtePrHy8o4gXV1YfBZ2wgpVvPCDLgp"
};

const validMemo = [
  "EJ_COMPLIANCE",
  "v1",
  "a".repeat(64),
  "b".repeat(64),
  "c".repeat(64),
  "APPROVED",
  "2026.1"
].join(":");

describe("organization proof history", () => {
  it("keeps only successful, signer-verified EJ proof memos and sorts them newest first", async () => {
    const source: ProofHistorySource = {
      getTransactions: async () => [
        {
          signature: "older-proof",
          memo: validMemo,
          blockTime: 1_700_000_000,
          confirmationStatus: "confirmed",
          succeeded: true,
          memoVerified: true,
          signerAddresses: [member.walletAddress]
        },
        {
          signature: "newer-proof",
          memo: validMemo.replace(":APPROVED:", ":BLOCKED:"),
          blockTime: 1_700_000_100,
          confirmationStatus: "finalized",
          succeeded: true,
          memoVerified: true,
          signerAddresses: [member.walletAddress]
        },
        {
          signature: "wrong-signer",
          memo: validMemo,
          blockTime: 1_700_000_200,
          confirmationStatus: "finalized",
          succeeded: true,
          memoVerified: true,
          signerAddresses: ["Another111111111111111111111111111111111"]
        },
        {
          signature: "failed-proof",
          memo: validMemo,
          blockTime: 1_700_000_300,
          confirmationStatus: "finalized",
          succeeded: false,
          memoVerified: true,
          signerAddresses: [member.walletAddress]
        },
        {
          signature: "unverified-memo",
          memo: validMemo,
          blockTime: 1_700_000_400,
          confirmationStatus: "finalized",
          succeeded: true,
          memoVerified: false,
          signerAddresses: [member.walletAddress]
        },
        {
          signature: "not-an-ej-proof",
          memo: "hello world",
          blockTime: 1_700_000_500,
          confirmationStatus: "finalized",
          succeeded: true,
          memoVerified: true,
          signerAddresses: [member.walletAddress]
        }
      ]
    };

    const history = await getOrganizationProofHistory([member], source);

    expect(history).toHaveLength(2);
    expect(history.map((proof) => proof.signature)).toEqual(["newer-proof", "older-proof"]);
    expect(history[0]).toMatchObject({
      memberName: "Gabriel Barboza",
      decision: "BLOCKED",
      policyVersion: "2026.1",
      confirmationStatus: "finalized"
    });
  });
});

import type { ComplianceDecision, Expense, Policy } from "@ej-ledger/core";
import type { ProofPayload } from "@ej-ledger/proof";

export interface ComplianceClientConfig {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export interface ProofIntent {
  payload: ProofPayload;
  memo: string;
  decision: ComplianceDecision;
  cluster: "devnet";
}

export interface ProofSubmitResult {
  signature: string;
  explorerUrl: string;
  submittedAt: string;
}

export type ProofConfirmationStatus = "confirmed" | "finalized" | "unknown";

export interface OrganizationProofHistoryItem {
  memberId: string;
  memberName: string;
  signerAddress: string;
  signature: string;
  explorerUrl: string;
  occurredAt: string | null;
  confirmationStatus: ProofConfirmationStatus;
  decision: ComplianceDecision["decision"];
  policyVersion: string;
  proofHash: string;
  policyHash: string;
  expenseHash: string;
}

export interface OrganizationProofHistory {
  organizationId: string;
  proofs: OrganizationProofHistoryItem[];
}

export class ComplianceClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ComplianceClientError";
    this.status = status;
  }
}

export class ComplianceClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor({ baseUrl, fetcher = fetch }: ComplianceClientConfig) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetcher = fetcher.bind(globalThis);
  }

  async checkExpense(expense: Expense): Promise<ComplianceDecision> {
    return this.request<ComplianceDecision>("/v1/expenses/check", {
      method: "POST",
      body: JSON.stringify(expense)
    });
  }

  async getPolicy(organizationId: string): Promise<Policy> {
    return this.request<Policy>(`/v1/policies/${encodeURIComponent(organizationId)}`);
  }

  async createProofIntent(expense: Expense): Promise<ProofIntent> {
    return this.request<ProofIntent>("/v1/proofs/intent", {
      method: "POST",
      body: JSON.stringify(expense)
    });
  }

  async submitSignedProofTransaction(signedTransaction: string): Promise<ProofSubmitResult> {
    return this.request<ProofSubmitResult>("/v1/proofs/submit", {
      method: "POST",
      body: JSON.stringify({ signedTransaction })
    });
  }

  async getOrganizationProofHistory(
    organizationId: string,
    viewerWallet: string
  ): Promise<OrganizationProofHistory> {
    const query = new URLSearchParams({ viewerWallet });
    return this.request<OrganizationProofHistory>(
      `/v1/organizations/${encodeURIComponent(organizationId)}/proofs?${query.toString()}`
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers
      }
    });

    const body = await response.json().catch(() => undefined) as unknown;

    if (!response.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : `Request failed with ${response.status}`;
      throw new ComplianceClientError(message, response.status);
    }

    return body as T;
  }
}

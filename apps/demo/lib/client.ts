import { ComplianceClient } from "@ej-ledger/sdk";

export const complianceClient = new ComplianceClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787"
});

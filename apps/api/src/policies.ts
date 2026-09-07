import demoPolicy from "../../../policies/demo-rid.json";
import type { Policy } from "@ej-ledger/core";

const policies = new Map<string, Policy>([[demoPolicy.organizationId, demoPolicy as Policy]]);

export function getPolicy(organizationId: string): Policy | undefined {
  return policies.get(organizationId);
}

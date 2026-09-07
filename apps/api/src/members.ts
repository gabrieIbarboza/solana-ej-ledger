import demoMembers from "../../../policies/demo-members.json";

export interface OrganizationMember {
  memberId: string;
  displayName: string;
  walletAddress: string;
}

export interface OrganizationMembers {
  organizationId: string;
  members: OrganizationMember[];
}

const organizations = new Map<string, OrganizationMembers>([
  [demoMembers.organizationId, demoMembers as OrganizationMembers]
]);

export function getMembers(organizationId: string): OrganizationMembers | undefined {
  return organizations.get(organizationId);
}

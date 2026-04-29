export type Role = "ADMIN" | "CORE_MEMBER" | "MEMBER";

export interface Membership {
  clubId: string;
  clubName: string;
  role: Role;
}

export interface User {
  id: string;
  fullName: string;
  collegeEmail: string;
  memberships: Membership[];
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface Proposal {
  id: string;
  clubId: string;
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED" | "CLOSED";
  startTime?: string;
  endTime?: string;
  quorumPercent: number;
  passThresholdPercent: number;
  treasuryImpactAmount: number;
  createdAt: string;
}

export interface TreasuryAccount {
  id: string;
  clubId: string;
  currencyCode: string;
  currentBalance: string;
}

export const severities = ["ROUTINE", "URGENT", "CRITICAL"] as const;
export type Severity = (typeof severities)[number];

export const requestStatuses = [
  "INTAKE",
  "HUMAN_REVIEW",
  "AWAITING_OUTREACH_APPROVAL",
  "SOURCING",
  "AWAITING_BOOKING_APPROVAL",
  "SCHEDULED",
  "RESOLVED",
  "CANCELLED",
  "RECONCILIATION_REQUIRED",
] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export type ApprovalKind = "VENDOR_OUTREACH" | "BOOKING" | "DATA_SHARING" | "EXCEPTION";
export type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "CONSUMED";

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  unitId: string;
  reporterPersonId: string;
  source: "SMS" | "VOICE" | "WEB" | "DEMO_FIXTURE";
  category: string;
  severity: Severity;
  summary: string;
  status: RequestStatus;
  ruleFlags: string[];
  humanOverride: Severity | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ApprovalScope {
  vendorIds?: string[];
  purpose?: "QUOTE_ONLY" | "BOOKING";
  amountCeilingCents?: number;
  windowStart?: string;
  windowEnd?: string;
  permittedDisclosure?: string[];
}

export interface Approval {
  id: string;
  maintenanceRequestId: string;
  requestedFromPersonId: string;
  kind: ApprovalKind;
  scope: ApprovalScope;
  status: ApprovalStatus;
  expiresAt: string;
  decidedAt: string | null;
  consumedAt: string | null;
  requestVersion: number;
}

export interface VendorQuote {
  id: string;
  maintenanceRequestId: string;
  vendorId: string;
  interactionId: string;
  amountMinCents: number;
  amountMaxCents: number;
  currency: "USD";
  availabilityWindows: Array<{ start: string; end: string }>;
  scopeSummary: string;
  confidence: number;
  humanVerified: boolean;
}

export interface AuditEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventName: string;
  actorType: "SYSTEM" | "LANDLORD" | "TENANT" | "VENDOR";
  actorId: string | null;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

import type { Approval, ApprovalKind, ApprovalScope, MaintenanceRequest } from "./types.js";
export declare function createApproval(input: {
    id: string;
    request: MaintenanceRequest;
    requestedFromPersonId: string;
    kind: ApprovalKind;
    scope: ApprovalScope;
    expiresAt: Date;
}): Approval;
export declare function approve(approval: Approval, now?: Date): Approval;
export declare function consumeApproval(approval: Approval, request: MaintenanceRequest, expectedKind: ApprovalKind, now?: Date): Approval;

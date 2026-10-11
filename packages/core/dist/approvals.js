import { DomainRuleError } from "./state-machine.js";
export function createApproval(input) {
    if (input.expiresAt.getTime() <= Date.now())
        throw new DomainRuleError("Approval expiry must be in the future.", "INVALID_EXPIRY");
    return {
        id: input.id,
        maintenanceRequestId: input.request.id,
        requestedFromPersonId: input.requestedFromPersonId,
        kind: input.kind,
        scope: input.scope,
        status: "PENDING",
        expiresAt: input.expiresAt.toISOString(),
        decidedAt: null,
        consumedAt: null,
        requestVersion: input.request.version,
    };
}
export function approve(approval, now = new Date()) {
    if (approval.status !== "PENDING")
        throw new DomainRuleError("Only pending approvals can be decided.", "APPROVAL_NOT_PENDING");
    if (Date.parse(approval.expiresAt) <= now.getTime())
        throw new DomainRuleError("This approval has expired.", "APPROVAL_EXPIRED");
    return { ...approval, status: "APPROVED", decidedAt: now.toISOString() };
}
export function consumeApproval(approval, request, expectedKind, now = new Date()) {
    if (approval.status !== "APPROVED")
        throw new DomainRuleError("Approval is not available.", "APPROVAL_UNAVAILABLE");
    if (approval.kind !== expectedKind)
        throw new DomainRuleError("Approval does not authorize this action.", "APPROVAL_SCOPE_MISMATCH");
    if (approval.requestVersion !== request.version)
        throw new DomainRuleError("Approval is for an older request version.", "APPROVAL_VERSION_MISMATCH");
    if (Date.parse(approval.expiresAt) <= now.getTime())
        throw new DomainRuleError("Approval has expired.", "APPROVAL_EXPIRED");
    return { ...approval, status: "CONSUMED", consumedAt: now.toISOString() };
}
//# sourceMappingURL=approvals.js.map
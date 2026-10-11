const allowed = {
    INTAKE: ["HUMAN_REVIEW", "AWAITING_OUTREACH_APPROVAL", "CANCELLED"],
    HUMAN_REVIEW: ["AWAITING_OUTREACH_APPROVAL", "CANCELLED", "RESOLVED"],
    AWAITING_OUTREACH_APPROVAL: ["SOURCING", "HUMAN_REVIEW", "CANCELLED"],
    SOURCING: ["AWAITING_BOOKING_APPROVAL", "RECONCILIATION_REQUIRED", "HUMAN_REVIEW", "CANCELLED"],
    AWAITING_BOOKING_APPROVAL: ["SCHEDULED", "SOURCING", "HUMAN_REVIEW", "CANCELLED"],
    SCHEDULED: ["RESOLVED", "HUMAN_REVIEW", "CANCELLED"],
    RESOLVED: [],
    CANCELLED: [],
    RECONCILIATION_REQUIRED: ["SOURCING", "HUMAN_REVIEW", "CANCELLED"],
};
export class DomainRuleError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "DomainRuleError";
    }
}
export function transitionRequest(request, next, expectedVersion, now = new Date()) {
    if (request.version !== expectedVersion) {
        throw new DomainRuleError("The request changed. Refresh before acting.", "VERSION_CONFLICT");
    }
    if (!allowed[request.status].includes(next)) {
        throw new DomainRuleError(`Cannot transition ${request.status} to ${next}.`, "INVALID_TRANSITION");
    }
    if ((request.severity === "CRITICAL" || request.severity === "URGENT") && next === "SOURCING") {
        throw new DomainRuleError("Urgent requests require human review and cannot start vendor automation.", "URGENT_AUTOMATION_BLOCKED");
    }
    return { ...request, status: next, version: request.version + 1, updatedAt: now.toISOString() };
}
//# sourceMappingURL=state-machine.js.map
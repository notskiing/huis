import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { assertAnalyticsSafe } from "@relaypm/core";
import { Keewano } from "@keewano/node-sdk";
import { batchReportAppointmentConfirmed, batchReportApprovalDecided, batchReportApprovalRequested, batchReportIntegrationFallbackActivated, batchReportMaintenanceRequested, batchReportQuoteCaptured, batchReportRequestResolved, batchReportUrgencyClassified, batchReportUrgentIssueRouted, batchReportVendorCallCompleted, batchReportVendorOutreachStarted, batchReportPropertyStatusSnapshot, customEventSet, } from "./generated/keewano-events.generated.js";
export function queueAnalytics(payload) {
    assertAnalyticsSafe(payload);
    return process.env.KEEWANO_ENABLED === "true" ? "PENDING" : "SKIPPED_DISABLED";
}
export function keewanoEnabled() { return process.env.KEEWANO_ENABLED === "true"; }
export function stableKeewanoUserId(aggregateId) {
    const hex = createHash("sha256").update(`huis:maintenance:${aggregateId}`).digest("hex").slice(0, 32).split("");
    hex[12] = "4";
    hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const value = hex.join("");
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
function token(value, fallback = "unknown") {
    const normalized = typeof value === "string" ? value : fallback;
    return normalized.replace(/[^a-zA-Z0-9_./:-]/g, "_").slice(0, 120) || fallback;
}
function eventValue(event) {
    const payload = event.payload;
    switch (event.eventName.toUpperCase()) {
        case "REQUEST_CREATED": return `${token(payload.channel, "unknown")}:${token(payload.category, "unknown")}`;
        case "MAINTENANCE_REQUESTED": return `${token(payload.channel, "unknown")}:${token(payload.category, "unknown")}`;
        case "URGENCY_CLASSIFIED": return token(payload.severity);
        case "HUMAN_ESCALATION_REQUIRED": return token(payload.severity, "CRITICAL");
        case "URGENT_ISSUE_ROUTED": return token(payload.severity, "CRITICAL");
        case "OUTREACH_APPROVAL_REQUESTED":
        case "BOOKING_APPROVAL_REQUESTED":
        case "APPROVAL_REQUESTED": return token(payload.purpose ?? event.eventName);
        case "OUTREACH_APPROVED":
        case "BOOKING_APPROVED": return "approved";
        case "VENDOR_OUTREACH_STARTED": return token(payload.provider);
        case "VENDOR_CALL_COMPLETED": return token(payload.provider);
        case "QUOTE_CAPTURED": return token(payload.currency, "USD");
        case "APPOINTMENT_CONFIRMED": return "confirmed";
        case "REQUEST_RESOLVED": return "resolved";
        case "INTEGRATION_FALLBACK_ACTIVATED": return token(payload.reason);
        case "PROPERTY_STATUS_SNAPSHOT": return `${token(payload.statusKey)}:${token(String(payload.openRequests ?? 0))}:${token(String(payload.urgentRequests ?? 0))}:${token(String(payload.approvalsDue ?? 0))}`;
        default: return token(event.eventName);
    }
}
function emitEvent(event, reporter) {
    const value = eventValue(event);
    switch (event.eventName.toUpperCase()) {
        case "REQUEST_CREATED": return batchReportMaintenanceRequested(reporter, value);
        case "MAINTENANCE_REQUESTED": return batchReportMaintenanceRequested(reporter, value);
        case "URGENCY_CLASSIFIED": return batchReportUrgencyClassified(reporter, value);
        case "HUMAN_ESCALATION_REQUIRED": return batchReportUrgentIssueRouted(reporter, value);
        case "URGENT_ISSUE_ROUTED": return batchReportUrgentIssueRouted(reporter, value);
        case "OUTREACH_APPROVAL_REQUESTED":
        case "BOOKING_APPROVAL_REQUESTED":
        case "APPROVAL_REQUESTED": return batchReportApprovalRequested(reporter, value);
        case "OUTREACH_APPROVED":
        case "BOOKING_APPROVED": return batchReportApprovalDecided(reporter, value);
        case "VENDOR_OUTREACH_STARTED": return batchReportVendorOutreachStarted(reporter, value);
        case "VENDOR_CALL_COMPLETED": return batchReportVendorCallCompleted(reporter, value);
        case "QUOTE_CAPTURED": return batchReportQuoteCaptured(reporter, value);
        case "APPOINTMENT_CONFIRMED": return batchReportAppointmentConfirmed(reporter, value);
        case "REQUEST_RESOLVED": return batchReportRequestResolved(reporter, value);
        case "INTEGRATION_FALLBACK_ACTIVATED": return batchReportIntegrationFallbackActivated(reporter, value);
        case "PROPERTY_STATUS_SNAPSHOT": return batchReportPropertyStatusSnapshot(reporter, value);
        default: throw new Error(`Unsupported Keewano domain event: ${event.eventName}`);
    }
}
export class KeewanoTimeline {
    state = keewanoEnabled() ? "degraded" : "disabled";
    initError = null;
    get status() { return this.state; }
    get error() { return this.initError; }
    async init() {
        if (!keewanoEnabled()) {
            this.state = "disabled";
            return this.state;
        }
        const apiKey = process.env.KEEWANO_PROJECT_API_KEY?.trim();
        if (!apiKey) {
            this.state = "degraded";
            this.initError = "KEEWANO_PROJECT_API_KEY is required when Keewano is enabled";
            throw new Error(this.initError);
        }
        if (Keewano.isReady()) {
            this.state = "live";
            return this.state;
        }
        const dataDir = resolve(process.cwd(), process.env.KEEWANO_DATA_DIR ?? ".data/keewano");
        const config = {
            apiKey,
            dataDir,
            customEventSet,
            ...(process.env.KEEWANO_ENDPOINT ? { endpoint: process.env.KEEWANO_ENDPOINT } : {}),
        };
        try {
            await Keewano.init(config);
            if (!Keewano.isReady())
                throw new Error("Keewano SDK did not become ready");
            this.state = "live";
            this.initError = null;
            return this.state;
        }
        catch (error) {
            this.state = "degraded";
            this.initError = error instanceof Error ? error.message : "Keewano initialization failed";
            throw error;
        }
    }
    async report(event) {
        await this.init();
        await Keewano.reportUserBatch({
            userId: stableKeewanoUserId(event.aggregateId),
            build: (reporter) => emitEvent(event, reporter),
        });
    }
    async shutdown() { if (Keewano.isReady())
        await Keewano.shutdown(); }
}
export class KeewanoOutbox {
    store;
    timeline;
    intervalMs;
    timer = null;
    draining = false;
    constructor(store, timeline = new KeewanoTimeline(), intervalMs = 5_000) {
        this.store = store;
        this.timeline = timeline;
        this.intervalMs = intervalMs;
    }
    async start() {
        if (!keewanoEnabled())
            return;
        await this.drainOnce();
        this.timer ??= setInterval(() => { void this.drainOnce(); }, this.intervalMs);
    }
    async drainOnce() {
        if (this.draining || !keewanoEnabled())
            return;
        this.draining = true;
        try {
            for (const event of this.store.pendingAnalyticsEvents()) {
                try {
                    await this.timeline.report(event);
                    this.store.markAnalyticsDelivered(event.id);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : "Keewano delivery failed";
                    const permanent = /required|did not become ready|invalid|401|403/i.test(message);
                    const next = new Date(Date.now() + Math.min(60 * 60_000, 2 ** Math.min(event.attempts, 7) * 1_000)).toISOString();
                    this.store.markAnalyticsFailed(event.id, message, permanent, next);
                    console.warn(`[huis] Keewano ${permanent ? "configuration" : "delivery"} failure: ${message.slice(0, 160)}`);
                }
            }
        }
        finally {
            this.draining = false;
        }
    }
    async stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
        await this.timeline.shutdown();
    }
}
//# sourceMappingURL=index.js.map
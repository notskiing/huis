import { DatabaseSync } from "node:sqlite";
import { type Approval, type AuditEvent, type MaintenanceRequest, type RequestStatus, type VendorQuote } from "@relaypm/core";
export declare class RelayRepository {
    readonly db: DatabaseSync;
    constructor(path?: string);
    close(): void;
    ensurePickerDemoProperty(): void;
    resetDemo(now?: Date): void;
    saveRequest(request: MaintenanceRequest): void;
    getRequest(id: string): MaintenanceRequest | null;
    updateRequestStatus(id: string, status: RequestStatus, version: number, updatedAt: string): boolean;
    saveApproval(approval: Approval): void;
    getApproval(id: string): Approval | null;
    latestApproval(requestId: string, kind: string): Approval | null;
    saveQuote(quote: VendorQuote): void;
    addAudit(requestId: string, eventName: string, actorType: AuditEvent["actorType"], actorId: string | null, payload: Record<string, unknown>, createdAt?: string): void;
    addDomainEvent(requestId: string, eventName: string, payload: Record<string, unknown>, createdAt?: string): void;
    pendingAnalyticsEvents(limit?: number, now?: string): Array<{
        id: string;
        aggregateId: string;
        eventName: string;
        payload: Record<string, unknown>;
        createdAt: string;
        attempts: number;
    }>;
    markAnalyticsDelivered(id: string, deliveredAt?: string): void;
    markAnalyticsFailed(id: string, error: string, permanent: boolean, nextAttemptAt: string | null): void;
    insertWebhook(eventId: string, eventType: string, rawBody: string): boolean;
    properties(): Array<Record<string, unknown>>;
    dashboard(propertyId?: string): Record<string, unknown>;
}

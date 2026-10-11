import { DatabaseSync } from "node:sqlite";
import type { Approval, AuditEvent, MaintenanceRequest, RequestStatus, VendorQuote } from "@relaypm/core";
export declare class RelayRepository {
    readonly db: DatabaseSync;
    constructor(path?: string);
    close(): void;
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
    insertWebhook(eventId: string, eventType: string, rawBody: string): boolean;
    dashboard(): Record<string, unknown>;
}

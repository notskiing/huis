export type AnalyticsDelivery = "SKIPPED_DISABLED" | "PENDING" | "DELIVERED" | "FAILED_PERMANENT" | "DEAD_LETTER";
export type KeewanoStatus = "disabled" | "live" | "degraded";
export interface AnalyticsDomainEvent {
    id: string;
    aggregateId: string;
    eventName: string;
    payload: Record<string, unknown>;
    createdAt: string;
    attempts: number;
}
export interface AnalyticsOutboxStore {
    pendingAnalyticsEvents(limit?: number, now?: string): AnalyticsDomainEvent[];
    markAnalyticsDelivered(id: string, deliveredAt?: string): void;
    markAnalyticsFailed(id: string, error: string, permanent: boolean, nextAttemptAt: string | null): void;
}
export declare function queueAnalytics(payload: Record<string, unknown>): AnalyticsDelivery;
export declare function keewanoEnabled(): boolean;
export declare function stableKeewanoUserId(aggregateId: string): string;
export declare class KeewanoTimeline {
    private state;
    private initError;
    get status(): KeewanoStatus;
    get error(): string | null;
    init(): Promise<KeewanoStatus>;
    report(event: AnalyticsDomainEvent): Promise<void>;
    shutdown(): Promise<void>;
}
export declare class KeewanoOutbox {
    private readonly store;
    private readonly timeline;
    private readonly intervalMs;
    private timer;
    private draining;
    constructor(store: AnalyticsOutboxStore, timeline?: KeewanoTimeline, intervalMs?: number);
    start(): Promise<void>;
    drainOnce(): Promise<void>;
    stop(): Promise<void>;
}

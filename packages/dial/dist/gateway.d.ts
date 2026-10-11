export interface DialOperationResult {
    providerId: string;
    status: "accepted" | "simulated";
}
export interface InboundDialCall {
    id: string;
    from: string;
    direction: string;
    transcript: string | null;
    createdAt: string;
}
export interface DialAccountEvent {
    id: string;
    type: string;
    createdAt: string;
    data: Record<string, unknown>;
}
export declare class DialGateway {
    private readonly live;
    constructor();
    get mode(): "live" | "simulation";
    private client;
    sendMessage(to: string, body: string): Promise<DialOperationResult>;
    makeQuoteCall(to: string, summary: string, idempotencyKey: string): Promise<DialOperationResult>;
    getCall(callId: string): Promise<InboundDialCall>;
    openEventStream(): Promise<{
        events: AsyncIterable<DialAccountEvent>;
        close: () => Promise<void>;
    }>;
    makeResolutionCall(to: string, caseFile: {
        propertyName: string;
        landlordAction: string;
        summary: string;
    }, idempotencyKey: string): Promise<DialOperationResult>;
}

export interface DialOperationResult {
    providerId: string;
    status: "accepted" | "simulated";
}
export declare class DialGateway {
    private readonly live;
    constructor();
    get mode(): "live" | "simulation";
    private client;
    sendMessage(to: string, body: string): Promise<DialOperationResult>;
    makeQuoteCall(to: string, summary: string, idempotencyKey: string): Promise<DialOperationResult>;
}

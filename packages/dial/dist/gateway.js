function normalizeE164(value) {
    const compact = value.trim().replace(/[\s().-]/g, "");
    if (compact.startsWith("00"))
        return `+${compact.slice(2)}`;
    return compact.startsWith("+") ? compact : `+${compact}`;
}
function allowlisted(to) {
    const entries = (process.env.DIAL_ALLOWLIST_E164 ?? "").split(",").map(normalizeE164).filter(Boolean);
    return process.env.NODE_ENV === "production" || entries.includes(normalizeE164(to));
}
export class DialGateway {
    live;
    constructor() {
        this.live = Boolean(process.env.DIAL_API_KEY);
    }
    get mode() { return this.live ? "live" : "simulation"; }
    async client() {
        if (!process.env.DIAL_API_KEY)
            return null;
        try {
            const packageName = "@getdial/sdk";
            const { DialClient } = await import(packageName);
            return new DialClient({
                apiKey: process.env.DIAL_API_KEY,
                ...(process.env.DIAL_API_URL ? { baseUrl: process.env.DIAL_API_URL } : {}),
                userAgent: "huis/0.1.0",
            });
        }
        catch {
            throw new Error("Live Dial mode requires the optional @getdial/sdk package. Run pnpm install without --no-optional.");
        }
    }
    async sendMessage(to, body) {
        const client = await this.client();
        if (!client)
            return { providerId: `sim_msg_${crypto.randomUUID()}`, status: "simulated" };
        if (!allowlisted(to))
            throw new Error("Live destination is not in DIAL_ALLOWLIST_E164");
        if (!process.env.DIAL_PHONE_NUMBER_ID)
            throw new Error("DIAL_PHONE_NUMBER_ID is required");
        const message = await client.sendMessage({ to, fromNumberId: process.env.DIAL_PHONE_NUMBER_ID, body });
        return { providerId: message.id, status: "accepted" };
    }
    async makeQuoteCall(to, summary, idempotencyKey) {
        const client = await this.client();
        if (!client)
            return { providerId: `sim_call_${crypto.randomUUID()}`, status: "simulated" };
        if (!allowlisted(to))
            throw new Error("Live destination is not in DIAL_ALLOWLIST_E164");
        if (!process.env.DIAL_PHONE_NUMBER_ID)
            throw new Error("DIAL_PHONE_NUMBER_ID is required");
        const call = await client.makeCall({
            to,
            fromNumberId: process.env.DIAL_PHONE_NUMBER_ID,
            outboundInstruction: `Identify yourself as Huis, a maintenance coordinator. Ask only for availability and a quote for: ${summary}. Do not book, authorize work, or request access codes.`,
            language: "en-US",
            idempotencyKey,
        });
        return { providerId: call.id, status: "accepted" };
    }
    async getCall(callId) {
        const client = await this.client();
        if (!client)
            throw new Error("Dial is not configured");
        const call = await client.getCall(callId);
        return { id: call.id, from: call.from, direction: call.direction, transcript: call.transcript, createdAt: call.createdAt };
    }
    async openEventStream() {
        const client = await this.client();
        if (!client)
            throw new Error("Dial is not configured");
        const connection = await client.newEventsConnection();
        return { events: connection, close: () => connection.close() };
    }
    async makeResolutionCall(to, caseFile, idempotencyKey) {
        const client = await this.client();
        if (!client)
            return { providerId: `sim_call_${crypto.randomUUID()}`, status: "simulated" };
        if (!allowlisted(to))
            throw new Error("Live destination is not in DIAL_ALLOWLIST_E164");
        if (!process.env.DIAL_PHONE_NUMBER_ID)
            throw new Error("DIAL_PHONE_NUMBER_ID is required");
        const call = await client.makeCall({
            to,
            fromNumberId: process.env.DIAL_PHONE_NUMBER_ID,
            outboundInstruction: `Identify yourself as an agent speaking on behalf of Huis, the maintenance coordinator, regarding their property ${caseFile.propertyName}. Read their case file and tell them what the landlord has done for their situation: ${caseFile.landlordAction}. The case file concerns: ${caseFile.summary}. Ask, “Is there anything else I can help you with today?” Do not make safety claims, discuss money, or promise more work.`,
            language: "en-US",
            idempotencyKey,
        });
        return { providerId: call.id, status: "accepted" };
    }
}
//# sourceMappingURL=gateway.js.map
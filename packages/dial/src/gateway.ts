export interface DialOperationResult { providerId: string; status: "accepted" | "simulated" }
export interface InboundDialCall { id: string; from: string; direction: string; transcript: string | null; createdAt: string }
export interface DialAccountEvent { id: string; type: string; createdAt: string; data: Record<string, unknown> }

function allowlisted(to: string): boolean {
  const entries = (process.env.DIAL_ALLOWLIST_E164 ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return process.env.NODE_ENV === "production" || entries.includes(to);
}

export class DialGateway {
  private readonly live: boolean;

  constructor() {
    this.live = Boolean(process.env.DIAL_API_KEY);
  }

  get mode(): "live" | "simulation" { return this.live ? "live" : "simulation"; }

  private async client() {
    if (!process.env.DIAL_API_KEY) return null;
    try {
      const packageName = "@getdial/sdk";
      const { DialClient } = await import(packageName) as typeof import("./getdial-sdk.js");
      return new DialClient({
        apiKey: process.env.DIAL_API_KEY,
        ...(process.env.DIAL_API_URL ? { baseUrl: process.env.DIAL_API_URL } : {}),
        userAgent: "huis/0.1.0",
      });
    } catch {
      throw new Error("Live Dial mode requires the optional @getdial/sdk package. Run pnpm install without --no-optional.");
    }
  }

  async sendMessage(to: string, body: string): Promise<DialOperationResult> {
    const client = await this.client();
    if (!client) return { providerId: `sim_msg_${crypto.randomUUID()}`, status: "simulated" };
    if (!allowlisted(to)) throw new Error("Live destination is not in DIAL_ALLOWLIST_E164");
    if (!process.env.DIAL_PHONE_NUMBER_ID) throw new Error("DIAL_PHONE_NUMBER_ID is required");
    const message = await client.sendMessage({ to, fromNumberId: process.env.DIAL_PHONE_NUMBER_ID, body });
    return { providerId: message.id, status: "accepted" };
  }

  async makeQuoteCall(to: string, summary: string, idempotencyKey: string): Promise<DialOperationResult> {
    const client = await this.client();
    if (!client) return { providerId: `sim_call_${crypto.randomUUID()}`, status: "simulated" };
    if (!allowlisted(to)) throw new Error("Live destination is not in DIAL_ALLOWLIST_E164");
    if (!process.env.DIAL_PHONE_NUMBER_ID) throw new Error("DIAL_PHONE_NUMBER_ID is required");
    const call = await client.makeCall({
      to,
      fromNumberId: process.env.DIAL_PHONE_NUMBER_ID,
      outboundInstruction: `Identify yourself as Huis, a maintenance coordinator. Ask only for availability and a quote for: ${summary}. Do not book, authorize work, or request access codes.`,
      language: "en-US",
      idempotencyKey,
    });
    return { providerId: call.id, status: "accepted" };
  }

  async getCall(callId: string): Promise<InboundDialCall> {
    const client = await this.client();
    if (!client) throw new Error("Dial is not configured");
    const call = await client.getCall(callId);
    return { id: call.id, from: call.from, direction: call.direction, transcript: call.transcript, createdAt: call.createdAt };
  }

  async openEventStream(): Promise<{ events: AsyncIterable<DialAccountEvent>; close: () => Promise<void> }> {
    const client = await this.client();
    if (!client) throw new Error("Dial is not configured");
    const connection = await client.newEventsConnection();
    return { events: connection as AsyncIterable<DialAccountEvent>, close: () => connection.close() };
  }

  async makeResolutionCall(to: string, summary: string, idempotencyKey: string): Promise<DialOperationResult> {
    const client = await this.client();
    if (!client) return { providerId: `sim_call_${crypto.randomUUID()}`, status: "simulated" };
    if (!allowlisted(to)) throw new Error("Live destination is not in DIAL_ALLOWLIST_E164");
    if (!process.env.DIAL_PHONE_NUMBER_ID) throw new Error("DIAL_PHONE_NUMBER_ID is required");
    const call = await client.makeCall({
      to,
      fromNumberId: process.env.DIAL_PHONE_NUMBER_ID,
      outboundInstruction: `Identify yourself as Huis, the maintenance coordinator. Tell the tenant that their request has been marked resolved: ${summary}. Ask whether the issue is actually resolved. Do not make safety claims, discuss money, or promise more work. If they say the issue remains, tell them you will reopen the request for landlord review.`,
      language: "en-US",
      idempotencyKey,
    });
    return { providerId: call.id, status: "accepted" };
  }
}

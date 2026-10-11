export class DialClient {
  constructor(config: { apiKey: string; baseUrl?: string; userAgent?: string });
  sendMessage(input: { to: string; fromNumberId: string; body: string }): Promise<{ id: string }>;
  makeCall(input: { to: string; fromNumberId: string; outboundInstruction: string; language: string; idempotencyKey?: string }): Promise<{ id: string }>;
  getCall(callId: string): Promise<{ id: string; from: string; direction: string; transcript: string | null; createdAt: string }>;
  newEventsConnection(): Promise<AsyncIterable<{ id: string; type: string; createdAt: string; data: Record<string, unknown> }> & { close(): Promise<void> }>;
}

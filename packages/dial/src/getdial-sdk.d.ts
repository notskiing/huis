export class DialClient {
  constructor(config: { apiKey: string; baseUrl?: string; userAgent?: string });
  sendMessage(input: { to: string; fromNumberId: string; body: string }): Promise<{ id: string }>;
  makeCall(input: { to: string; fromNumberId: string; outboundInstruction: string; language: string; idempotencyKey?: string }): Promise<{ id: string }>;
}

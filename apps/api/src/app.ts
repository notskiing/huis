import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { approve, classifyUrgency, consumeApproval, createApproval, DomainRuleError, transitionRequest, type MaintenanceRequest, type VendorQuote } from "@relaypm/core";
import { encrypt, RelayRepository } from "@relaypm/db";
import { verifyDialWebhook } from "@relaypm/dial";
import { AgentPlanner } from "@relaypm/agentic";
import { KeewanoOutbox, KeewanoTimeline } from "@relaypm/keewano";

function databasePath(): string {
  const configured = process.env.DATABASE_URL ?? "file:./.data/huis.db";
  if (configured === "file::memory:") return ":memory:";
  const relative = configured.replace(/^file:/, "");
  const path = resolve(process.cwd(), relative);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

export function createApp(repo = new RelayRepository(databasePath())) {
  const app = Fastify({ logger: false });
  const keewanoTimeline = new KeewanoTimeline();
  const keewanoOutbox = new KeewanoOutbox(repo, keewanoTimeline);
  const agentPlanner = new AgentPlanner();
  void keewanoOutbox.start();
  app.addHook("onClose", async () => { await keewanoOutbox.stop(); });
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    (request as typeof request & { rawBody: string }).rawBody = body as string;
    try { done(null, JSON.parse(body as string)); }
    catch (error) { done(error as Error, undefined); }
  });
  void app.register(cors, { origin: true });

  const hasSeed = repo.db.prepare("SELECT COUNT(*) AS n FROM properties").get() as { n: number };
  if (!hasSeed.n) repo.resetDemo();
  repo.ensurePickerDemoProperty();

  app.get("/health", async () => ({ ok: true, service: "huis-api", storage: process.env.MONGODB_URI ? "mongodb-configured" : "local-demo", integrations: { keewano: keewanoTimeline.status } }));
  app.get("/api/properties", async () => ({ properties: repo.properties() }));
  app.get<{ Querystring: { propertyId?: string } }>("/api/dashboard", async (request, reply) => {
    const propertyId = request.query.propertyId ?? "property_demo";
    let dashboard: Record<string, unknown>;
    try { dashboard = repo.dashboard(propertyId); }
    catch { return reply.code(404).send({ error: "PROPERTY_NOT_FOUND", message: "Property not found" }); }
    return {
      ...dashboard,
      integrations: { ...(dashboard.integrations as Record<string, unknown>), keewano: keewanoTimeline.status },
      intakeEmail: process.env.TENANT_INTAKE_EMAIL ?? "maintenance@your-domain.com",
      storage: process.env.MONGODB_URI ? "mongodb-configured" : "local-demo",
    };
  });
  app.get<{ Params: { id: string } }>("/api/requests/:id/agent-plan", async (request, reply) => {
    const item = repo.getRequest(request.params.id);
    if (!item) return reply.code(404).send({ error: "NOT_FOUND", message: "Request not found" });
    return agentPlanner.plan({ category: item.category, severity: item.severity, status: item.status, source: item.source, ruleFlags: item.ruleFlags });
  });

  app.post("/api/demo/reset", async () => {
    repo.resetDemo();
    return repo.dashboard();
  });

  app.post<{ Body: { scenario?: "critical" | "email"; propertyId?: string } }>("/api/demo/intake", async (request, reply) => {
    const scenario = request.body?.scenario ?? "critical";
    const now = new Date();
    const isCritical = scenario === "critical";
    const text = isCritical
      ? "I smell gas near the stove and the alarm is sounding."
      : "The bedroom window frame is damp. I emailed two photos and the inspection PDF.";
    const urgency = classifyUrgency(text);
    const id = `req_${randomUUID()}`;
    const source = scenario === "email" ? "WEB" : "VOICE";
    const propertyId = request.body?.propertyId ?? "property_demo";
    const unit = repo.db.prepare("SELECT id FROM units WHERE property_id=? ORDER BY label LIMIT 1").get(propertyId) as { id: string } | undefined;
    if (!unit) return reply.code(404).send({ error: "PROPERTY_NOT_FOUND", message: "Property not found" });
    const item: MaintenanceRequest = {
      id, propertyId, unitId: unit.id, reporterPersonId: "person_tenant", source,
      category: isCritical ? "Gas / life safety" : "Water intrusion", severity: urgency.severity,
      summary: isCritical ? "Tenant reports a gas odor near the stove and an active alarm." : "Tenant emailed photos and an inspection PDF showing dampness at the bedroom window.",
      status: urgency.severity === "ROUTINE" ? "AWAITING_OUTREACH_APPROVAL" : "HUMAN_REVIEW",
      ruleFlags: urgency.flags, humanOverride: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1,
    };
    repo.saveRequest(item);
    repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      `int_${randomUUID()}`, id, scenario === "email" ? "EMAIL" : "VOICE", "INBOUND", "person_tenant", scenario === "email" ? "EMAIL_SIMULATED" : "DIAL_SIMULATED",
      `sim_${randomUUID()}`, `evt_${randomUUID()}`, encrypt(text),
      scenario === "email" ? "Tenant email received with 3 evidence attachments." : "AI call intake flagged a gas odor and active alarm.", now.toISOString(), now.toISOString(),
    );
    repo.addAudit(id, "REQUEST_CREATED", "TENANT", "person_tenant", { channel: scenario === "email" ? "EMAIL" : "VOICE", attachmentCount: scenario === "email" ? 3 : 0 });
    repo.addAudit(id, "URGENCY_CLASSIFIED", "SYSTEM", null, { severity: urgency.severity, ruleFlags: urgency.flags });
    if (isCritical) repo.addAudit(id, "HUMAN_ESCALATION_REQUIRED", "SYSTEM", null, { automationStopped: true, guidance: "Contact emergency services or the gas utility and leave danger when appropriate." });
    if (!isCritical) {
      repo.saveApproval(createApproval({ id: `approval_${randomUUID()}`, request: item, requestedFromPersonId: "person_landlord", kind: "VENDOR_OUTREACH", scope: { vendorIds: ["vendor_plumber"], purpose: "QUOTE_ONLY" }, expiresAt: new Date(now.getTime() + 4 * 60 * 60_000) }));
      repo.addDomainEvent(id, "approval_requested", { purpose: "VENDOR_OUTREACH" }, new Date(now.getTime() + 2).toISOString());
    }
    repo.addDomainEvent(id, "maintenance_requested", { severity: urgency.severity, category: item.category, channel: scenario === "email" ? "EMAIL" : "VOICE" }, now.toISOString());
    repo.addDomainEvent(id, "urgency_classified", { severity: urgency.severity }, new Date(now.getTime() + 1).toISOString());
    if (isCritical) repo.addDomainEvent(id, "urgent_issue_routed", { severity: urgency.severity }, new Date(now.getTime() + 2).toISOString());
    reply.code(201);
    return repo.dashboard(item.propertyId);
  });

  app.post<{ Params: { id: string }; Body: { approvalId: string } }>("/api/requests/:id/approve-outreach", async (request) => {
    const item = repo.getRequest(request.params.id);
    const pending = repo.getApproval(request.body.approvalId);
    if (!item || !pending) throw new DomainRuleError("Request or approval not found.", "NOT_FOUND");
    const decided = approve(pending);
    const consumed = consumeApproval(decided, item, "VENDOR_OUTREACH");
    const next = transitionRequest(item, "SOURCING", item.version);
    repo.db.exec("BEGIN IMMEDIATE");
    try {
      repo.saveApproval(consumed);
      repo.saveRequest(next);
      repo.db.prepare("INSERT INTO external_operations VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(`op_${randomUUID()}`, item.id, "VENDOR_QUOTE_CALL", "DIAL_SIMULATED", `sim_call_${randomUUID()}`, JSON.stringify({ vendorIds: consumed.scope.vendorIds, purpose: "QUOTE_ONLY" }), "SUCCEEDED_SIMULATED", new Date().toISOString());
      repo.addAudit(item.id, "OUTREACH_APPROVED", "LANDLORD", "person_landlord", { vendors: consumed.scope.vendorIds, purpose: "QUOTE_ONLY" });
      repo.addAudit(item.id, "VENDOR_OUTREACH_STARTED", "SYSTEM", null, { provider: "DIAL_SIMULATED", commitmentAllowed: false });
      repo.addDomainEvent(item.id, "approval_decided", { outcome: "approved", purpose: "VENDOR_OUTREACH" });
      repo.addDomainEvent(item.id, "vendor_outreach_started", { severity: item.severity, category: item.category, vendorCount: consumed.scope.vendorIds?.length ?? 0 });
      repo.db.exec("COMMIT");
    } catch (error) { repo.db.exec("ROLLBACK"); throw error; }
    return repo.dashboard(item.propertyId);
  });

  app.post<{ Params: { id: string } }>("/api/requests/:id/simulate-quote", async (request) => {
    const item = repo.getRequest(request.params.id);
    if (!item) throw new DomainRuleError("Request not found.", "NOT_FOUND");
    const next = transitionRequest(item, "AWAITING_BOOKING_APPROVAL", item.version);
    const now = new Date();
    const interactionId = `int_${randomUUID()}`;
    const start = new Date(now.getTime() + 25 * 60 * 60_000);
    const end = new Date(start.getTime() + 2 * 60 * 60_000);
    const quote: VendorQuote = {
      id: `quote_${randomUUID()}`, maintenanceRequestId: item.id, vendorId: "vendor_plumber", interactionId,
      amountMinCents: 18500, amountMaxCents: 24000, currency: "USD", availabilityWindows: [{ start: start.toISOString(), end: end.toISOString() }],
      scopeSummary: "Inspect supply line and trap; repair within quoted range if no hidden damage is found.", confidence: 0.91, humanVerified: false,
    };
    repo.db.exec("BEGIN IMMEDIATE");
    try {
      repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(interactionId, item.id, "VOICE", "OUTBOUND", "person_plumber", "DIAL_SIMULATED", `call_${randomUUID()}`, `evt_${randomUUID()}`, encrypt("I can come tomorrow between 10 and noon. It should be between $185 and $240 depending on the supply line. That does not include hidden cabinet damage."), "Bluebird Plumbing quoted $185–$240 and offered tomorrow, 10:00 AM–12:00 PM.", now.toISOString(), now.toISOString());
      repo.saveQuote(quote);
      repo.saveRequest(next);
      const booking = createApproval({ id: `approval_${randomUUID()}`, request: next, requestedFromPersonId: "person_landlord", kind: "BOOKING", scope: { vendorIds: ["vendor_plumber"], purpose: "BOOKING", amountCeilingCents: 24000, windowStart: start.toISOString(), windowEnd: end.toISOString(), permittedDisclosure: ["request_summary", "unit_label", "tenant_first_name"] }, expiresAt: new Date(now.getTime() + 4 * 60 * 60_000) });
      repo.saveApproval(booking);
      repo.addAudit(item.id, "QUOTE_CAPTURED", "SYSTEM", null, { amountMinCents: 18500, amountMaxCents: 24000, confidence: 0.91, humanVerified: false });
      repo.addAudit(item.id, "BOOKING_APPROVAL_REQUESTED", "SYSTEM", null, { amountCeilingCents: 24000, vendorId: "vendor_plumber" });
      repo.addDomainEvent(item.id, "approval_requested", { purpose: "BOOKING" });
      repo.addDomainEvent(item.id, "quote_captured", { severity: item.severity, category: item.category, elapsedMilliseconds: now.getTime() - Date.parse(item.createdAt) });
      repo.db.exec("COMMIT");
    } catch (error) { repo.db.exec("ROLLBACK"); throw error; }
    return repo.dashboard(item.propertyId);
  });

  app.post<{ Params: { id: string }; Body: { approvalId: string } }>("/api/requests/:id/approve-booking", async (request) => {
    const item = repo.getRequest(request.params.id);
    const pending = repo.getApproval(request.body.approvalId);
    if (!item || !pending) throw new DomainRuleError("Request or approval not found.", "NOT_FOUND");
    const decided = approve(pending);
    const consumed = consumeApproval(decided, item, "BOOKING");
    const next = transitionRequest(item, "SCHEDULED", item.version);
    const quote = repo.db.prepare("SELECT * FROM vendor_quotes WHERE maintenance_request_id=? ORDER BY rowid DESC LIMIT 1").get(item.id) as any;
    if (!quote) throw new DomainRuleError("A source quote is required.", "QUOTE_REQUIRED");
    const window = JSON.parse(quote.availability_windows_json)[0];
    repo.db.exec("BEGIN IMMEDIATE");
    try {
      repo.saveApproval(consumed);
      repo.saveRequest(next);
      repo.db.prepare("INSERT INTO appointments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(`appt_${randomUUID()}`, item.id, quote.vendor_id, quote.id, consumed.id, window.start, window.end, "CONFIRMED_SIMULATED", "Vendor confirmed the approved window. No payment or access code was authorized.", new Date().toISOString());
      repo.addAudit(item.id, "BOOKING_APPROVED", "LANDLORD", "person_landlord", { vendorId: quote.vendor_id, amountCeilingCents: consumed.scope.amountCeilingCents, windowStart: window.start, windowEnd: window.end });
      repo.addAudit(item.id, "APPOINTMENT_CONFIRMED", "SYSTEM", null, { provider: "DIAL_SIMULATED", tenantNotified: true, landlordNotified: true, paymentAuthorized: false, accessCodeShared: false });
      repo.addDomainEvent(item.id, "approval_decided", { outcome: "approved", purpose: "BOOKING" });
      repo.addDomainEvent(item.id, "appointment_confirmed", { severity: item.severity, category: item.category, elapsedMilliseconds: Date.now() - Date.parse(item.createdAt) });
      repo.db.exec("COMMIT");
    } catch (error) { repo.db.exec("ROLLBACK"); throw error; }
    return repo.dashboard(item.propertyId);
  });

  app.post("/webhooks/dial", { config: { rawBody: true } }, async (request, reply) => {
    const signature = String(request.headers["x-dial-signature"] ?? "");
    const eventId = String(request.headers["x-dial-event-id"] ?? "");
    const eventType = String(request.headers["x-dial-event-type"] ?? "");
    const raw = (request as typeof request & { rawBody?: string }).rawBody ?? "";
    const secret = process.env.DIAL_WEBHOOK_SECRET ?? "";
    if (!secret || !verifyDialWebhook(secret, signature, raw)) return reply.code(401).send({ error: "invalid_signature" });
    if (!eventId || !eventType) return reply.code(400).send({ error: "missing_headers" });
    const inserted = repo.insertWebhook(eventId, eventType, raw);
    return reply.code(202).send({ accepted: true, duplicate: !inserted });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainRuleError) return reply.code(error.code === "NOT_FOUND" ? 404 : 409).send({ error: error.code, message: error.message });
    return reply.code(500).send({ error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unexpected error" });
  });

  return { app, repo };
}

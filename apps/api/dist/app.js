import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { approve, classifyUrgency, consumeApproval, createApproval, DomainRuleError, transitionRequest } from "@relaypm/core";
import { encrypt, MongoDocumentStore, mongoConfigFromEnv, RelayRepository } from "@relaypm/db";
import { DialGateway, verifyDialWebhook } from "@relaypm/dial";
import { AgentPlanner, IntakeInference } from "@relaypm/agentic";
import { KeewanoOutbox, KeewanoTimeline } from "@relaypm/keewano";
function databasePath() {
    const configured = process.env.DATABASE_URL ?? "file:./.data/huis.db";
    if (configured === "file::memory:")
        return ":memory:";
    const relative = configured.replace(/^file:/, "");
    const path = resolve(process.cwd(), relative);
    mkdirSync(dirname(path), { recursive: true });
    return path;
}
function vendorIdForCategory(category) {
    return /electric|heat|hvac|thermostat|furnace|boiler/i.test(category) ? "vendor_electrician" : "vendor_plumber";
}
function vendorPersonId(vendorId) {
    return vendorId === "vendor_electrician" ? "person_electrician" : "person_plumber";
}
export function createApp(repo = new RelayRepository(databasePath())) {
    const app = Fastify({ logger: false });
    const keewanoTimeline = new KeewanoTimeline();
    const keewanoOutbox = new KeewanoOutbox(repo, keewanoTimeline);
    const agentPlanner = new AgentPlanner();
    const intakeInference = new IntakeInference();
    const dialGateway = new DialGateway();
    const mongoConfig = mongoConfigFromEnv();
    const mongoStore = mongoConfig ? new MongoDocumentStore(mongoConfig) : null;
    let mongoStatus = mongoStore ? "connecting" : "disabled";
    const mongoReady = mongoStore
        ? mongoStore.connect().then(() => { mongoStatus = "connected"; }).catch((error) => { mongoStatus = "error"; console.warn(`[huis] MongoDB connection failed: ${error instanceof Error ? error.message : "unknown error"}`); })
        : Promise.resolve();
    void keewanoOutbox.start();
    app.addHook("onClose", async () => { await keewanoOutbox.stop(); await mongoReady; await mongoStore?.close(); });
    app.removeContentTypeParser("application/json");
    app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
        request.rawBody = body;
        try {
            done(null, JSON.parse(body));
        }
        catch (error) {
            done(error, undefined);
        }
    });
    void app.register(cors, { origin: true });
    const hasSeed = repo.db.prepare("SELECT COUNT(*) AS n FROM properties").get();
    if (!hasSeed.n)
        repo.resetDemo();
    repo.ensurePickerDemoProperty();
    const statusIntervalMs = Number(process.env.KEEWANO_STATUS_INTERVAL_MS ?? 60 * 60 * 1000);
    const publishPropertyStatuses = async () => {
        const updatedAt = new Date().toISOString();
        for (const property of repo.properties())
            repo.recordPropertyStatusSnapshot(String(property.id), updatedAt);
        await keewanoOutbox.drainOnce();
    };
    void publishPropertyStatuses();
    const statusTimer = setInterval(() => { void publishPropertyStatuses(); }, statusIntervalMs);
    statusTimer.unref();
    app.addHook("onClose", async () => { clearInterval(statusTimer); });
    const createInboundTicket = async (input) => {
        if (repo.hasInteractionProviderId(input.providerId))
            return;
        const text = input.text.trim().slice(0, 8_000);
        if (!text)
            return;
        const properties = repo.properties().map((property) => ({ id: String(property.id), name: String(property.name) }));
        const matchedProperty = repo.propertyForPhone(input.from);
        const inferred = await intakeInference.classify(text, properties, matchedProperty);
        const propertyId = inferred.propertyId ?? matchedProperty?.id ?? process.env.DIAL_INTAKE_PROPERTY_ID ?? "property_demo";
        const unit = repo.db.prepare("SELECT id FROM units WHERE property_id=? ORDER BY label LIMIT 1").get(propertyId);
        if (!unit)
            throw new DomainRuleError("Configured Dial intake property was not found.", "PROPERTY_NOT_FOUND");
        const now = new Date(input.occurredAt).toISOString();
        const safetyFloor = classifyUrgency(text);
        const urgency = {
            severity: safetyFloor.severity === "CRITICAL" || safetyFloor.severity === "URGENT" ? safetyFloor.severity : inferred.urgency,
            flags: safetyFloor.flags,
        };
        const reporterPersonId = `person_dial_${createHash("sha256").update(input.from).digest("hex").slice(0, 16)}`;
        const item = {
            id: `req_${randomUUID()}`, propertyId, unitId: unit.id, reporterPersonId, source: input.source,
            category: inferred.category, severity: urgency.severity, summary: inferred.summary,
            status: urgency.severity === "ROUTINE" ? "AWAITING_OUTREACH_APPROVAL" : "HUMAN_REVIEW",
            ruleFlags: urgency.flags, humanOverride: null, createdAt: now, updatedAt: now, version: 1,
        };
        repo.db.exec("BEGIN IMMEDIATE");
        try {
            repo.db.prepare("INSERT OR IGNORE INTO people VALUES (?, ?, ?, ?, ?, ?)").run(reporterPersonId, "TENANT", "Dial tenant", encrypt(input.from), JSON.stringify({ sms: true, voice: true }), "en-US");
            repo.saveRequest(item);
            repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(`int_${randomUUID()}`, item.id, input.source, "INBOUND", reporterPersonId, "DIAL", input.providerId, input.eventId, encrypt(text), input.source === "SMS" ? "Tenant text received through Dial." : "Tenant voice intake transcribed through Dial.", now, new Date().toISOString());
            repo.addAudit(item.id, "REQUEST_CREATED", "TENANT", reporterPersonId, { channel: input.source, severity: urgency.severity }, now);
            repo.addAudit(item.id, "AI_INTAKE_CLASSIFIED", "SYSTEM", null, { source: inferred.source, model: inferred.model, category: inferred.category, urgency: inferred.urgency, propertyId: inferred.propertyId }, now);
            repo.addAudit(item.id, "URGENCY_CLASSIFIED", "SYSTEM", null, { severity: urgency.severity, ruleFlags: urgency.flags }, now);
            if (urgency.severity === "ROUTINE") {
                repo.saveApproval(createApproval({ id: `approval_${randomUUID()}`, request: item, requestedFromPersonId: "person_landlord", kind: "VENDOR_OUTREACH", scope: { vendorIds: [vendorIdForCategory(inferred.category)], purpose: "QUOTE_ONLY" }, expiresAt: new Date(Date.parse(now) + 4 * 60 * 60_000) }));
                repo.addDomainEvent(item.id, "approval_requested", { purpose: "VENDOR_OUTREACH" }, now);
            }
            else {
                repo.addAudit(item.id, "SAFETY_STEP_REQUIRED", "SYSTEM", null, { nextStep: "START_SAFETY_RESPONSE", guidance: "Confirm the immediate safety step and record the landlord's next action." }, now);
                repo.addDomainEvent(item.id, "urgent_issue_routed", { severity: urgency.severity }, now);
            }
            repo.addDomainEvent(item.id, "maintenance_requested", { severity: urgency.severity, category: item.category, channel: input.source }, now);
            repo.addDomainEvent(item.id, "urgency_classified", { severity: urgency.severity }, now);
            repo.addDomainEvent(item.id, "vendor_routed", { category: inferred.category, vendorId: vendorIdForCategory(inferred.category), automatedContact: false }, now);
            repo.db.exec("COMMIT");
        }
        catch (error) {
            repo.db.exec("ROLLBACK");
            throw error;
        }
        try {
            const confirmation = inferred.confirmation || `We received “${inferred.summary}” for ${inferred.propertyName ?? "your property"}. Your Huis maintenance request is now active.`;
            const sent = await dialGateway.sendMessage(input.from, confirmation);
            repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(`int_${randomUUID()}`, item.id, "SMS", "OUTBOUND", reporterPersonId, "DIAL", sent.providerId, `confirm_${input.eventId}`, encrypt(confirmation), "Huis confirmation sent after reading the tenant message.", new Date().toISOString(), new Date().toISOString());
            repo.addAudit(item.id, "TENANT_CONFIRMATION_SENT", "SYSTEM", null, { channel: "SMS", provider: "DIAL", status: sent.status });
        }
        catch (error) {
            repo.addAudit(item.id, "TENANT_CONFIRMATION_FAILED", "SYSTEM", null, { channel: "SMS", provider: "DIAL", error: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
        }
        void publishPropertyStatuses();
    };
    const logResolutionCallbackResponse = (call, eventId, occurredAt) => {
        const operation = repo.db.prepare("SELECT id, request_id, intent_json FROM external_operations WHERE provider_external_id=? AND kind='TENANT_RESOLUTION_CALLBACK' ORDER BY created_at DESC LIMIT 1").get(call.id);
        const transcript = call.transcript?.trim().slice(0, 8_000);
        if (!operation || !transcript || repo.hasInteractionProviderId(call.id))
            return;
        const item = repo.getRequest(operation.request_id);
        if (!item)
            return;
        const responseAt = new Date(call.createdAt || occurredAt).toISOString();
        const summary = `Tenant response to Huis resolution callback: ${transcript.slice(0, 500)}`;
        repo.db.exec("BEGIN IMMEDIATE");
        try {
            repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(`int_${randomUUID()}`, item.id, "VOICE", "INBOUND", item.reporterPersonId, "DIAL", call.id, eventId, encrypt(transcript), summary, responseAt, new Date().toISOString());
            repo.addAudit(item.id, "TENANT_CALLBACK_RESPONSE_LOGGED", "TENANT", item.reporterPersonId, { channel: "VOICE", provider: "DIAL", responseLength: transcript.length });
            repo.addDomainEvent(item.id, "tenant_callback_response_logged", { channel: "VOICE", provider: "DIAL" }, responseAt);
            const intent = JSON.parse(operation.intent_json);
            repo.db.prepare("UPDATE external_operations SET intent_json=? WHERE id=?").run(JSON.stringify({ ...intent, responseLoggedAt: responseAt }), operation.id);
            repo.db.exec("COMMIT");
        }
        catch (error) {
            repo.db.exec("ROLLBACK");
            throw error;
        }
    };
    const processDialEvent = async (eventId, eventType, raw) => {
        const inserted = repo.insertWebhook(eventId, eventType, raw);
        if (!inserted)
            return true;
        try {
            const envelope = JSON.parse(raw);
            const data = envelope.data ?? {};
            const occurredAt = typeof envelope.createdAt === "string" ? envelope.createdAt : new Date().toISOString();
            console.info(`[huis] Dial event received: ${eventType}`);
            if (eventType === "message.received" && typeof data.from === "string" && typeof data.body === "string" && typeof data.messageId === "string") {
                await createInboundTicket({ source: "SMS", from: data.from, text: data.body, providerId: data.messageId, eventId, occurredAt });
            }
            if ((eventType === "call.transcribed" || eventType === "call.ended") && typeof data.callId === "string") {
                const call = await dialGateway.getCall(data.callId);
                if (call.direction === "outbound")
                    logResolutionCallbackResponse(call, eventId, occurredAt);
                if (call.direction === "inbound" && call.transcript)
                    await createInboundTicket({ source: "VOICE", from: call.from, text: call.transcript, providerId: call.id, eventId, occurredAt: call.createdAt || occurredAt });
            }
            repo.markWebhookProcessed(eventId);
            return false;
        }
        catch (error) {
            repo.releaseWebhookForRetry(eventId);
            throw error;
        }
    };
    let closeDialEventStream = null;
    if (process.env.DIAL_EVENT_STREAM_ENABLED === "true" && process.env.DIAL_API_KEY) {
        void dialGateway.openEventStream().then(({ events, close }) => {
            closeDialEventStream = close;
            console.info("[huis] Dial inbound event stream connected");
            void (async () => {
                try {
                    for await (const event of events)
                        await processDialEvent(event.id, event.type, JSON.stringify(event));
                }
                catch (error) {
                    console.warn(`[huis] Dial event stream stopped: ${error instanceof Error ? error.message : "unknown error"}`);
                }
            })();
        }).catch((error) => console.warn(`[huis] Dial event stream unavailable: ${error instanceof Error ? error.message : "unknown error"}`));
    }
    app.addHook("onClose", async () => { await closeDialEventStream?.(); });
    app.get("/health", async () => ({ ok: true, service: "huis-api", storage: mongoStatus === "connected" ? "mongodb-configured" : "local-demo", integrations: { keewano: keewanoTimeline.status, mongodb: mongoStatus } }));
    app.get("/api/properties", async () => ({ properties: repo.properties() }));
    app.post("/api/properties", async (request, reply) => {
        const body = request.body ?? {};
        if (!body.name?.trim() || !body.address?.trim())
            return reply.code(400).send({ error: "INVALID_PROPERTY", message: "name and address are required" });
        if (body.tenantPhone && !/^\+[1-9]\d{7,14}$/.test(body.tenantPhone.replace(/[\s()-]/g, "")))
            return reply.code(400).send({ error: "INVALID_PHONE", message: "tenantPhone must be an international number such as +14155550123" });
        const property = repo.createProperty({ name: body.name, address: body.address, timezone: body.timezone ?? "America/Los_Angeles", unitLabel: body.unitLabel ?? "Main unit", ...(body.tenantName ? { tenantName: body.tenantName } : {}), ...(body.tenantPhone ? { tenantPhone: body.tenantPhone.replace(/[\s()-]/g, "") } : {}) });
        await publishPropertyStatuses();
        return reply.code(201).send({ property, dashboard: repo.dashboard(property.id) });
    });
    app.get("/api/dashboard", async (request, reply) => {
        const propertyId = request.query.propertyId ?? "property_demo";
        let dashboard;
        try {
            dashboard = repo.dashboard(propertyId);
        }
        catch {
            return reply.code(404).send({ error: "PROPERTY_NOT_FOUND", message: "Property not found" });
        }
        return {
            ...dashboard,
            integrations: { ...dashboard.integrations, keewano: keewanoTimeline.status },
            intakeEmail: process.env.TENANT_INTAKE_EMAIL ?? "maintenance@your-domain.com",
            storage: mongoStatus === "connected" ? "mongodb-configured" : "local-demo",
        };
    });
    app.get("/api/properties/:id/internal-documents", async (request, reply) => {
        await mongoReady;
        if (!mongoStore || mongoStatus !== "connected")
            return reply.code(503).send({ error: "MONGODB_UNAVAILABLE", message: "MongoDB is not configured or connected" });
        return { documents: await mongoStore.recentInternalDocuments(request.params.id) };
    });
    app.post("/api/properties/:id/internal-documents", async (request, reply) => {
        await mongoReady;
        if (!mongoStore || mongoStatus !== "connected")
            return reply.code(503).send({ error: "MONGODB_UNAVAILABLE", message: "MongoDB is not configured or connected" });
        const body = request.body ?? {};
        if (!body.kind || !body.title)
            return reply.code(400).send({ error: "INVALID_DOCUMENT", message: "kind and title are required" });
        const document = { ...body, id: body.id ?? randomUUID(), propertyId: request.params.id };
        await mongoStore.upsertInternalDocument(document);
        return reply.code(201).send({ document });
    });
    app.get("/api/requests/:id/agent-plan", async (request, reply) => {
        const item = repo.getRequest(request.params.id);
        if (!item)
            return reply.code(404).send({ error: "NOT_FOUND", message: "Request not found" });
        return agentPlanner.plan({ category: item.category, severity: item.severity, status: item.status, source: item.source, ruleFlags: item.ruleFlags });
    });
    app.post("/api/requests/:id/acknowledge-safety", async (request) => {
        const item = repo.getRequest(request.params.id);
        if (!item)
            throw new DomainRuleError("Request not found.", "NOT_FOUND");
        const plan = await agentPlanner.plan({ category: item.category, severity: item.severity, status: item.status, source: item.source, ruleFlags: item.ruleFlags });
        const acknowledged = { ...item, humanOverride: item.severity };
        const next = transitionRequest(acknowledged, "AWAITING_OUTREACH_APPROVAL", item.version);
        const approval = createApproval({ id: `approval_${randomUUID()}`, request: next, requestedFromPersonId: "person_landlord", kind: "VENDOR_OUTREACH", scope: { vendorIds: [vendorIdForCategory(item.category)], purpose: "QUOTE_ONLY" }, expiresAt: new Date(Date.now() + 4 * 60 * 60_000) });
        repo.db.exec("BEGIN IMMEDIATE");
        try {
            repo.saveRequest(next);
            repo.saveApproval(approval);
            repo.addAudit(item.id, "SAFETY_STEP_CONFIRMED", "LANDLORD", "person_landlord", { nextStep: "VENDOR_OUTREACH_APPROVAL", agentSource: plan.source, agentModel: plan.model, recommendedAgents: plan.agents });
            repo.addDomainEvent(item.id, "agent_plan_generated", { source: plan.source, model: plan.model ?? "rules", agentCount: plan.agents.length });
            repo.addDomainEvent(item.id, "safety_step_confirmed", { severity: item.severity, nextStep: "VENDOR_OUTREACH_APPROVAL" });
            repo.addDomainEvent(item.id, "vendor_routed", { category: item.category, vendorId: vendorIdForCategory(item.category), automatedContact: false });
            repo.addDomainEvent(item.id, "urgent_issue_routed", { severity: item.severity, nextStep: "VENDOR_OUTREACH_APPROVAL" });
            repo.addDomainEvent(item.id, "approval_requested", { purpose: "VENDOR_OUTREACH", afterSafetyStep: true });
            repo.db.exec("COMMIT");
        }
        catch (error) {
            repo.db.exec("ROLLBACK");
            throw error;
        }
        await publishPropertyStatuses();
        return repo.dashboard(item.propertyId);
    });
    app.post("/api/demo/reset", async () => {
        repo.resetDemo();
        repo.ensurePickerDemoProperty();
        await publishPropertyStatuses();
        return repo.dashboard();
    });
    app.post("/api/demo/intake", async (request, reply) => {
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
        const unit = repo.db.prepare("SELECT id FROM units WHERE property_id=? ORDER BY label LIMIT 1").get(propertyId);
        if (!unit)
            return reply.code(404).send({ error: "PROPERTY_NOT_FOUND", message: "Property not found" });
        const item = {
            id, propertyId, unitId: unit.id, reporterPersonId: "person_tenant", source,
            category: isCritical ? "Gas / life safety" : "Water intrusion", severity: urgency.severity,
            summary: isCritical ? "Tenant reports a gas odor near the stove and an active alarm." : "Tenant emailed photos and an inspection PDF showing dampness at the bedroom window.",
            status: urgency.severity === "ROUTINE" ? "AWAITING_OUTREACH_APPROVAL" : "HUMAN_REVIEW",
            ruleFlags: urgency.flags, humanOverride: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1,
        };
        repo.saveRequest(item);
        repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(`int_${randomUUID()}`, id, scenario === "email" ? "EMAIL" : "VOICE", "INBOUND", "person_tenant", scenario === "email" ? "EMAIL_SIMULATED" : "DIAL_SIMULATED", `sim_${randomUUID()}`, `evt_${randomUUID()}`, encrypt(text), scenario === "email" ? "Tenant email received with 3 evidence attachments." : "AI call intake flagged a gas odor and active alarm.", now.toISOString(), now.toISOString());
        repo.addAudit(id, "REQUEST_CREATED", "TENANT", "person_tenant", { channel: scenario === "email" ? "EMAIL" : "VOICE", attachmentCount: scenario === "email" ? 3 : 0 });
        repo.addAudit(id, "URGENCY_CLASSIFIED", "SYSTEM", null, { severity: urgency.severity, ruleFlags: urgency.flags });
        if (isCritical)
            repo.addAudit(id, "HUMAN_ESCALATION_REQUIRED", "SYSTEM", null, { automationStopped: true, guidance: "Contact emergency services or the gas utility and leave danger when appropriate." });
        if (!isCritical) {
            repo.saveApproval(createApproval({ id: `approval_${randomUUID()}`, request: item, requestedFromPersonId: "person_landlord", kind: "VENDOR_OUTREACH", scope: { vendorIds: [vendorIdForCategory(item.category)], purpose: "QUOTE_ONLY" }, expiresAt: new Date(now.getTime() + 4 * 60 * 60_000) }));
            repo.addDomainEvent(id, "approval_requested", { purpose: "VENDOR_OUTREACH" }, new Date(now.getTime() + 2).toISOString());
        }
        repo.addDomainEvent(id, "maintenance_requested", { severity: urgency.severity, category: item.category, channel: scenario === "email" ? "EMAIL" : "VOICE" }, now.toISOString());
        repo.addDomainEvent(id, "urgency_classified", { severity: urgency.severity }, new Date(now.getTime() + 1).toISOString());
        if (isCritical)
            repo.addDomainEvent(id, "urgent_issue_routed", { severity: urgency.severity }, new Date(now.getTime() + 2).toISOString());
        await publishPropertyStatuses();
        reply.code(201);
        return repo.dashboard(item.propertyId);
    });
    app.post("/api/requests/:id/approve-outreach", async (request) => {
        const item = repo.getRequest(request.params.id);
        const pending = repo.getApproval(request.body.approvalId);
        if (!item || !pending)
            throw new DomainRuleError("Request or approval not found.", "NOT_FOUND");
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
        }
        catch (error) {
            repo.db.exec("ROLLBACK");
            throw error;
        }
        await publishPropertyStatuses();
        return repo.dashboard(item.propertyId);
    });
    app.post("/api/requests/:id/simulate-quote", async (request) => {
        const item = repo.getRequest(request.params.id);
        if (!item)
            throw new DomainRuleError("Request not found.", "NOT_FOUND");
        const next = transitionRequest(item, "AWAITING_BOOKING_APPROVAL", item.version);
        const now = new Date();
        const interactionId = `int_${randomUUID()}`;
        const vendorId = vendorIdForCategory(item.category);
        const vendorContactId = vendorPersonId(vendorId);
        const start = new Date(now.getTime() + 25 * 60 * 60_000);
        const end = new Date(start.getTime() + 2 * 60 * 60_000);
        const quote = {
            id: `quote_${randomUUID()}`, maintenanceRequestId: item.id, vendorId, interactionId,
            amountMinCents: 18500, amountMaxCents: 24000, currency: "USD", availabilityWindows: [{ start: start.toISOString(), end: end.toISOString() }],
            scopeSummary: "Inspect supply line and trap; repair within quoted range if no hidden damage is found.", confidence: 0.91, humanVerified: false,
        };
        repo.db.exec("BEGIN IMMEDIATE");
        try {
            const vendorName = repo.db.prepare("SELECT business_name FROM vendors WHERE id=?").get(vendorId)?.business_name ?? "the approved vendor";
            repo.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(interactionId, item.id, "VOICE", "OUTBOUND", vendorContactId, "DIAL_SIMULATED", `call_${randomUUID()}`, `evt_${randomUUID()}`, encrypt(`I can come tomorrow between 10 and noon. The estimated repair is between $185 and $240.`), `${vendorName} quoted $185–$240 and offered tomorrow, 10:00 AM–12:00 PM.`, now.toISOString(), now.toISOString());
            repo.saveQuote(quote);
            repo.saveRequest(next);
            const booking = createApproval({ id: `approval_${randomUUID()}`, request: next, requestedFromPersonId: "person_landlord", kind: "BOOKING", scope: { vendorIds: [quote.vendorId], purpose: "BOOKING", amountCeilingCents: 24000, windowStart: start.toISOString(), windowEnd: end.toISOString(), permittedDisclosure: ["request_summary", "unit_label", "tenant_first_name"] }, expiresAt: new Date(now.getTime() + 4 * 60 * 60_000) });
            repo.saveApproval(booking);
            repo.addAudit(item.id, "QUOTE_CAPTURED", "SYSTEM", null, { amountMinCents: 18500, amountMaxCents: 24000, confidence: 0.91, humanVerified: false });
            repo.addAudit(item.id, "BOOKING_APPROVAL_REQUESTED", "SYSTEM", null, { amountCeilingCents: 24000, vendorId: quote.vendorId });
            repo.addDomainEvent(item.id, "approval_requested", { purpose: "BOOKING" });
            repo.addDomainEvent(item.id, "quote_captured", { severity: item.severity, category: item.category, elapsedMilliseconds: now.getTime() - Date.parse(item.createdAt) });
            repo.db.exec("COMMIT");
        }
        catch (error) {
            repo.db.exec("ROLLBACK");
            throw error;
        }
        await publishPropertyStatuses();
        return repo.dashboard(item.propertyId);
    });
    app.post("/api/requests/:id/approve-booking", async (request) => {
        const item = repo.getRequest(request.params.id);
        const pending = repo.getApproval(request.body.approvalId);
        if (!item || !pending)
            throw new DomainRuleError("Request or approval not found.", "NOT_FOUND");
        const decided = approve(pending);
        const consumed = consumeApproval(decided, item, "BOOKING");
        const next = transitionRequest(item, "SCHEDULED", item.version);
        const quote = repo.db.prepare("SELECT * FROM vendor_quotes WHERE maintenance_request_id=? ORDER BY rowid DESC LIMIT 1").get(item.id);
        if (!quote)
            throw new DomainRuleError("A source quote is required.", "QUOTE_REQUIRED");
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
        }
        catch (error) {
            repo.db.exec("ROLLBACK");
            throw error;
        }
        await publishPropertyStatuses();
        return repo.dashboard(item.propertyId);
    });
    app.post("/api/requests/:id/resolve-and-callback", async (request) => {
        const item = repo.getRequest(request.params.id);
        if (!item)
            throw new DomainRuleError("Request not found.", "NOT_FOUND");
        const next = transitionRequest(item, "RESOLVED", item.version);
        const tenantPhone = repo.personPhone(item.reporterPersonId);
        if (!tenantPhone)
            throw new DomainRuleError("Tenant phone number is unavailable for the callback.", "TENANT_PHONE_UNAVAILABLE");
        const propertyDashboard = repo.dashboard(item.propertyId);
        const caseFile = propertyDashboard.requests.find((candidate) => candidate.id === item.id);
        const landlordAction = caseFile?.appointment
            ? "The landlord approved the repair visit and marked the request resolved after the scheduled repair."
            : "The landlord reviewed the case and marked the request resolved.";
        const operationId = `op_${randomUUID()}`;
        repo.db.prepare("INSERT INTO external_operations VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(operationId, item.id, "TENANT_RESOLUTION_CALLBACK", "DIAL", null, JSON.stringify({ purpose: "RESOLUTION_CONFIRMATION", propertyName: propertyDashboard.property.name, landlordAction }), "PENDING", new Date().toISOString());
        try {
            const result = await dialGateway.makeResolutionCall(tenantPhone, { propertyName: propertyDashboard.property.name, landlordAction, summary: item.summary }, operationId);
            repo.db.exec("BEGIN IMMEDIATE");
            try {
                repo.saveRequest(next);
                repo.db.prepare("UPDATE external_operations SET provider_external_id=?, status=? WHERE id=?").run(result.providerId, result.status === "accepted" ? "SUCCEEDED" : "SUCCEEDED_SIMULATED", operationId);
                repo.addAudit(item.id, "TENANT_CALLBACK_STARTED", "SYSTEM", null, { provider: "DIAL", status: result.status });
                repo.addDomainEvent(item.id, "request_resolved", { channel: "VOICE" });
                repo.db.exec("COMMIT");
            }
            catch (error) {
                repo.db.exec("ROLLBACK");
                throw error;
            }
        }
        catch (error) {
            repo.db.prepare("UPDATE external_operations SET status=? WHERE id=?").run("FAILED_REQUIRES_REVIEW", operationId);
            throw error;
        }
        await publishPropertyStatuses();
        return repo.dashboard(item.propertyId);
    });
    app.post("/webhooks/dial", { config: { rawBody: true } }, async (request, reply) => {
        const signature = String(request.headers["x-dial-signature"] ?? "");
        const eventId = String(request.headers["x-dial-event-id"] ?? "");
        const eventType = String(request.headers["x-dial-event-type"] ?? "");
        const raw = request.rawBody ?? "";
        const secret = process.env.DIAL_WEBHOOK_SECRET ?? "";
        if (!secret || !verifyDialWebhook(secret, signature, raw))
            return reply.code(401).send({ error: "invalid_signature" });
        if (!eventId || !eventType)
            return reply.code(400).send({ error: "missing_headers" });
        const duplicate = await processDialEvent(eventId, eventType, raw);
        return reply.code(202).send({ accepted: true, duplicate });
    });
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof DomainRuleError)
            return reply.code(error.code === "NOT_FOUND" ? 404 : 409).send({ error: error.code, message: error.message });
        return reply.code(500).send({ error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unexpected error" });
    });
    return { app, repo };
}
//# sourceMappingURL=app.js.map
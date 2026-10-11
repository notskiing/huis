import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { assertAnalyticsSafe, type Approval, type AuditEvent, type MaintenanceRequest, type RequestStatus, type VendorQuote } from "@relaypm/core";
import { encrypt } from "./crypto.js";
import { migration } from "./schema.js";

type Row = Record<string, any>;

function parseRequest(row: Row): MaintenanceRequest {
  return {
    id: row.id, propertyId: row.property_id, unitId: row.unit_id, reporterPersonId: row.reporter_person_id,
    source: row.source, category: row.category, severity: row.severity, summary: row.summary, status: row.status,
    ruleFlags: JSON.parse(row.rule_flags_json), humanOverride: row.human_override,
    createdAt: row.created_at, updatedAt: row.updated_at, version: row.version,
  };
}

function parseApproval(row: Row): Approval {
  return {
    id: row.id, maintenanceRequestId: row.maintenance_request_id, requestedFromPersonId: row.requested_from_person_id,
    kind: row.kind, scope: JSON.parse(row.scope_json), status: row.status, expiresAt: row.expires_at,
    decidedAt: row.decided_at, consumedAt: row.consumed_at, requestVersion: row.request_version,
  };
}

export class RelayRepository {
  readonly db: DatabaseSync;

  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(migration);
    for (const statement of [
      "ALTER TABLE domain_events ADD COLUMN analytics_last_error TEXT",
      "ALTER TABLE domain_events ADD COLUMN analytics_next_attempt_at TEXT",
      "ALTER TABLE domain_events ADD COLUMN analytics_delivered_at TEXT",
    ]) {
      try { this.db.exec(statement); } catch { /* Existing databases already have the column. */ }
    }
  }

  close(): void { this.db.close(); }

  resetDemo(now = new Date()): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const table of ["external_operations", "domain_events", "webhook_inbox", "audit_events", "appointments", "vendor_quotes", "approvals", "interactions", "maintenance_requests", "vendors", "units", "people", "properties"]) {
        this.db.exec(`DELETE FROM ${table}`);
      }
      const people: Array<[string, string, string, string]> = [
        ["person_landlord", "LANDLORD", "Maya Chen", "+14155550101"],
        ["person_tenant", "TENANT", "Jordan Lee", "+14155550102"],
        ["person_plumber", "VENDOR_CONTACT", "Nina Alvarez", "+14155550103"],
        ["person_electrician", "VENDOR_CONTACT", "Theo Brooks", "+14155550104"],
      ];
      const insertPerson = this.db.prepare("INSERT INTO people VALUES (?, ?, ?, ?, ?, ?)");
      for (const [id, role, name, phone] of people) insertPerson.run(id, role, name, encrypt(phone), JSON.stringify({ sms: true, voice: true }), "en-US");
      this.db.prepare("INSERT INTO properties VALUES (?, ?, ?, ?, ?, ?)").run("property_demo", "Juniper House", "America/Los_Angeles", encrypt("1480 Juniper Street, Oakland, CA"), "person_landlord", "policy_demo");
      this.db.prepare("INSERT INTO units VALUES (?, ?, ?, ?, ?)").run("unit_2b", "property_demo", "2B", JSON.stringify(["person_tenant"]), encrypt("Coordinate all access with tenant"));
      const insertVendor = this.db.prepare("INSERT INTO vendors VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      insertVendor.run("vendor_plumber", "Plumbing", "Bluebird Plumbing", 1, 1, encrypt("+14155550103"), "Oakland / Berkeley", 1, "Preferred vendor · insured");
      insertVendor.run("vendor_electrician", "Electrical", "Brightline Electric", 1, 1, encrypt("+14155550104"), "East Bay", 0, "Licensed · weekday service");
      const created = new Date(now.getTime() - 18 * 60_000).toISOString();
      const request: MaintenanceRequest = {
        id: "req_demo_leak", propertyId: "property_demo", unitId: "unit_2b", reporterPersonId: "person_tenant",
        source: "SMS", category: "Plumbing", severity: "ROUTINE", summary: "Kitchen sink is leaking into the cabinet when the faucet runs.",
        status: "AWAITING_OUTREACH_APPROVAL", ruleFlags: [], humanOverride: null, createdAt: created, updatedAt: created, version: 1,
      };
      this.saveRequest(request);
      this.db.prepare("INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        "int_tenant_sms", request.id, "SMS", "INBOUND", "person_tenant", "DIAL_SIMULATED", "msg_demo_001", "evt_demo_001",
        encrypt("Hi, the kitchen sink is leaking under the cabinet whenever we use it. Started this morning and getting a little worse."),
        "Tenant reports a worsening kitchen sink leak into the cabinet.", created, created,
      );
      const approval: Approval = {
        id: "approval_outreach_demo", maintenanceRequestId: request.id, requestedFromPersonId: "person_landlord",
        kind: "VENDOR_OUTREACH", scope: { vendorIds: ["vendor_plumber"], purpose: "QUOTE_ONLY", permittedDisclosure: ["request_summary", "unit_label"] },
        status: "PENDING", expiresAt: new Date(now.getTime() + 4 * 60 * 60_000).toISOString(), decidedAt: null, consumedAt: null, requestVersion: 1,
      };
      this.saveApproval(approval);
      this.addAudit(request.id, "REQUEST_CREATED", "TENANT", "person_tenant", { channel: "SMS", severity: "ROUTINE" }, created);
      this.addAudit(request.id, "URGENCY_CLASSIFIED", "SYSTEM", null, { severity: "ROUTINE", ruleFlags: [] }, new Date(now.getTime() - 17 * 60_000).toISOString());
      this.addAudit(request.id, "OUTREACH_APPROVAL_REQUESTED", "SYSTEM", null, { vendorCount: 1, purpose: "QUOTE_ONLY" }, new Date(now.getTime() - 16 * 60_000).toISOString());
      this.addDomainEvent(request.id, "maintenance_requested", { severity: "ROUTINE", category: "Plumbing", channel: "SMS" }, created);
      this.addDomainEvent(request.id, "urgency_classified", { severity: "ROUTINE" }, new Date(now.getTime() - 17 * 60_000).toISOString());
      this.addDomainEvent(request.id, "approval_requested", { purpose: "VENDOR_OUTREACH" }, new Date(now.getTime() - 16 * 60_000).toISOString());
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  saveRequest(request: MaintenanceRequest): void {
    this.db.prepare(`INSERT INTO maintenance_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET severity=excluded.severity, summary=excluded.summary, status=excluded.status,
      rule_flags_json=excluded.rule_flags_json, human_override=excluded.human_override, updated_at=excluded.updated_at, version=excluded.version`)
      .run(request.id, request.propertyId, request.unitId, request.reporterPersonId, request.source, request.category, request.severity,
        request.summary, request.status, JSON.stringify(request.ruleFlags), request.humanOverride, request.createdAt, request.updatedAt, request.version);
  }

  getRequest(id: string): MaintenanceRequest | null {
    const row = this.db.prepare("SELECT * FROM maintenance_requests WHERE id = ?").get(id) as Row | undefined;
    return row ? parseRequest(row) : null;
  }

  updateRequestStatus(id: string, status: RequestStatus, version: number, updatedAt: string): boolean {
    return this.db.prepare("UPDATE maintenance_requests SET status=?, version=?, updated_at=? WHERE id=? AND version=?")
      .run(status, version + 1, updatedAt, id, version).changes === 1;
  }

  saveApproval(approval: Approval): void {
    this.db.prepare(`INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET scope_json=excluded.scope_json, status=excluded.status, decided_at=excluded.decided_at,
      consumed_at=excluded.consumed_at, request_version=excluded.request_version`)
      .run(approval.id, approval.maintenanceRequestId, approval.requestedFromPersonId, approval.kind, JSON.stringify(approval.scope), approval.status,
        approval.expiresAt, approval.decidedAt, approval.consumedAt, approval.requestVersion);
  }

  getApproval(id: string): Approval | null {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as Row | undefined;
    return row ? parseApproval(row) : null;
  }

  latestApproval(requestId: string, kind: string): Approval | null {
    const row = this.db.prepare("SELECT * FROM approvals WHERE maintenance_request_id=? AND kind=? ORDER BY rowid DESC LIMIT 1").get(requestId, kind) as Row | undefined;
    return row ? parseApproval(row) : null;
  }

  saveQuote(quote: VendorQuote): void {
    this.db.prepare("INSERT OR REPLACE INTO vendor_quotes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      quote.id, quote.maintenanceRequestId, quote.vendorId, quote.interactionId, quote.amountMinCents, quote.amountMaxCents,
      quote.currency, JSON.stringify(quote.availabilityWindows), quote.scopeSummary, quote.confidence, quote.humanVerified ? 1 : 0,
    );
  }

  addAudit(requestId: string, eventName: string, actorType: AuditEvent["actorType"], actorId: string | null, payload: Record<string, unknown>, createdAt = new Date().toISOString()): void {
    this.db.prepare("INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), "MaintenanceRequest", requestId, eventName, actorType, actorId, JSON.stringify(payload), createdAt);
  }

  addDomainEvent(requestId: string, eventName: string, payload: Record<string, unknown>, createdAt = new Date().toISOString()): void {
    assertAnalyticsSafe(payload);
    this.db.prepare(`INSERT INTO domain_events
      (id, aggregate_type, aggregate_id, event_name, payload_redacted_json, created_at, analytics_delivery_status, analytics_attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), "MaintenanceRequest", requestId, eventName, JSON.stringify(payload), createdAt, process.env.KEEWANO_ENABLED === "true" ? "PENDING" : "SKIPPED_DISABLED", 0);
  }

  pendingAnalyticsEvents(limit = 50, now = new Date().toISOString()): Array<{ id: string; aggregateId: string; eventName: string; payload: Record<string, unknown>; createdAt: string; attempts: number }> {
    const rows = this.db.prepare(`SELECT * FROM domain_events
      WHERE analytics_delivery_status='PENDING'
      AND (analytics_next_attempt_at IS NULL OR analytics_next_attempt_at <= ?)
      ORDER BY created_at ASC LIMIT ?`).all(now, limit) as Row[];
    return rows.map((row) => ({
      id: row.id, aggregateId: row.aggregate_id, eventName: row.event_name,
      payload: JSON.parse(row.payload_redacted_json) as Record<string, unknown>, createdAt: row.created_at, attempts: row.analytics_attempts,
    }));
  }

  markAnalyticsDelivered(id: string, deliveredAt = new Date().toISOString()): void {
    this.db.prepare(`UPDATE domain_events SET analytics_delivery_status='DELIVERED', analytics_delivered_at=?, analytics_last_error=NULL,
      analytics_next_attempt_at=NULL WHERE id=?`).run(deliveredAt, id);
  }

  markAnalyticsFailed(id: string, error: string, permanent: boolean, nextAttemptAt: string | null): void {
    const row = this.db.prepare("SELECT analytics_attempts FROM domain_events WHERE id=?").get(id) as Row | undefined;
    const attempts = Number(row?.analytics_attempts ?? 0) + 1;
    const status = permanent ? "FAILED_PERMANENT" : attempts >= 8 ? "DEAD_LETTER" : "PENDING";
    this.db.prepare(`UPDATE domain_events SET analytics_delivery_status=?, analytics_attempts=?, analytics_last_error=?, analytics_next_attempt_at=? WHERE id=?`)
      .run(status, attempts, error.slice(0, 500), status === "PENDING" ? nextAttemptAt : null, id);
  }

  insertWebhook(eventId: string, eventType: string, rawBody: string): boolean {
    return this.db.prepare("INSERT OR IGNORE INTO webhook_inbox VALUES (?, ?, ?, ?, ?, ?)").run("DIAL", eventId, eventType, encrypt(rawBody), new Date().toISOString(), null).changes === 1;
  }

  dashboard(): Record<string, unknown> {
    const requestRows = this.db.prepare("SELECT * FROM maintenance_requests ORDER BY updated_at DESC").all() as Row[];
    const requests = requestRows.map((row) => {
      const request = parseRequest(row);
      const approvals = (this.db.prepare("SELECT * FROM approvals WHERE maintenance_request_id=? ORDER BY rowid").all(request.id) as Row[]).map(parseApproval);
      const quotes = (this.db.prepare("SELECT q.*, v.business_name FROM vendor_quotes q JOIN vendors v ON v.id=q.vendor_id WHERE q.maintenance_request_id=?").all(request.id) as Row[]).map((quote) => ({
        id: quote.id, vendorId: quote.vendor_id, vendorName: quote.business_name, amountMinCents: quote.amount_min_cents,
        amountMaxCents: quote.amount_max_cents, availabilityWindows: JSON.parse(quote.availability_windows_json), scopeSummary: quote.scope_summary,
        confidence: quote.confidence, humanVerified: Boolean(quote.human_verified),
      }));
      const interactions = (this.db.prepare("SELECT id, channel, direction, provider, redacted_summary, occurred_at FROM interactions WHERE maintenance_request_id=? ORDER BY occurred_at").all(request.id) as Row[]).map((item) => ({
        id: item.id, channel: item.channel, direction: item.direction, provider: item.provider, summary: item.redacted_summary, occurredAt: item.occurred_at,
      }));
      const audit = (this.db.prepare("SELECT * FROM audit_events WHERE aggregate_id=? ORDER BY created_at DESC").all(request.id) as Row[]).map((event) => ({
        id: event.id, eventName: event.event_name, actorType: event.actor_type, payload: JSON.parse(event.payload_redacted_json), createdAt: event.created_at,
      }));
      const appointment = this.db.prepare("SELECT * FROM appointments WHERE maintenance_request_id=? ORDER BY rowid DESC LIMIT 1").get(request.id) as Row | undefined;
      return { ...request, approvals, quotes, interactions, audit, appointment: appointment ? { startAt: appointment.start_at, endAt: appointment.end_at, status: appointment.status } : null };
    });
    const vendors = (this.db.prepare("SELECT id, trade, business_name, approved, active, service_area, after_hours, notes FROM vendors").all() as Row[]).map((v) => ({ id: v.id, trade: v.trade, businessName: v.business_name, approved: Boolean(v.approved), active: Boolean(v.active), serviceArea: v.service_area, afterHours: Boolean(v.after_hours), notes: v.notes }));
    const open = Number((this.db.prepare("SELECT COUNT(*) AS n FROM maintenance_requests WHERE status NOT IN ('RESOLVED','CANCELLED')").get() as Row).n);
    const approvalsDue = Number((this.db.prepare("SELECT COUNT(*) AS n FROM approvals WHERE status='PENDING'").get() as Row).n);
    const urgent = Number((this.db.prepare("SELECT COUNT(*) AS n FROM maintenance_requests WHERE severity IN ('URGENT','CRITICAL') AND status NOT IN ('RESOLVED','CANCELLED')").get() as Row).n);
    const outboxPending = Number((this.db.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE analytics_delivery_status='PENDING'").get() as Row).n);
    const outboxFailed = Number((this.db.prepare("SELECT COUNT(*) AS n FROM domain_events WHERE analytics_delivery_status IN ('FAILED_PERMANENT','DEAD_LETTER')").get() as Row).n);
    return {
      property: { id: "property_demo", name: "Juniper House", unit: "2B", timezone: "America/Los_Angeles" },
      requests, vendors,
      metrics: { open, approvalsDue, urgent, medianResolutionHours: 3.2 },
      integrations: {
        dial: process.env.DIAL_API_KEY ? "configured" : "simulation",
        keewano: process.env.KEEWANO_ENABLED === "true" ? (outboxPending || outboxFailed ? "degraded" : "live") : "disabled",
        sparta: process.env.SPARTA_ENABLED === "true" ? "configured" : "skipped",
      },
    };
  }
}

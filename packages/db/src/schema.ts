export const migration = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL,
  street_address_encrypted TEXT NOT NULL, owner_person_id TEXT NOT NULL, emergency_policy_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY, property_id TEXT NOT NULL, label TEXT NOT NULL,
  tenant_person_ids_json TEXT NOT NULL, access_notes_encrypted TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY, role TEXT NOT NULL, display_name TEXT NOT NULL,
  phone_e164_encrypted TEXT NOT NULL, contact_preferences_json TEXT NOT NULL, locale TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY, trade TEXT NOT NULL, business_name TEXT NOT NULL,
  approved INTEGER NOT NULL, active INTEGER NOT NULL, phone_e164_encrypted TEXT NOT NULL,
  service_area TEXT NOT NULL, after_hours INTEGER NOT NULL, notes TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id TEXT PRIMARY KEY, property_id TEXT NOT NULL, unit_id TEXT NOT NULL, reporter_person_id TEXT NOT NULL,
  source TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL, summary TEXT NOT NULL,
  status TEXT NOT NULL, rule_flags_json TEXT NOT NULL, human_override TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY, maintenance_request_id TEXT NOT NULL, channel TEXT NOT NULL, direction TEXT NOT NULL,
  participant_person_id TEXT NOT NULL, provider TEXT NOT NULL, provider_external_id TEXT,
  provider_event_id TEXT, transcript_or_body_encrypted TEXT NOT NULL, redacted_summary TEXT NOT NULL,
  occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL,
  UNIQUE(provider, provider_event_id)
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, maintenance_request_id TEXT NOT NULL, requested_from_person_id TEXT NOT NULL,
  kind TEXT NOT NULL, scope_json TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL,
  decided_at TEXT, consumed_at TEXT, request_version INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS approvals_consumed_once ON approvals(id) WHERE consumed_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS vendor_quotes (
  id TEXT PRIMARY KEY, maintenance_request_id TEXT NOT NULL, vendor_id TEXT NOT NULL, interaction_id TEXT NOT NULL,
  amount_min_cents INTEGER NOT NULL, amount_max_cents INTEGER NOT NULL, currency TEXT NOT NULL,
  availability_windows_json TEXT NOT NULL, scope_summary TEXT NOT NULL, confidence REAL NOT NULL,
  human_verified INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, maintenance_request_id TEXT NOT NULL, vendor_id TEXT NOT NULL, quote_id TEXT NOT NULL,
  approval_id TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, status TEXT NOT NULL,
  provider_confirmation_text TEXT, confirmed_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY, aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL, event_name TEXT NOT NULL,
  actor_type TEXT NOT NULL, actor_id TEXT, payload_redacted_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_inbox (
  provider TEXT NOT NULL, provider_event_id TEXT NOT NULL, event_type TEXT NOT NULL,
  raw_payload_encrypted TEXT NOT NULL, received_at TEXT NOT NULL, processed_at TEXT,
  PRIMARY KEY(provider, provider_event_id)
);
CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY, aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL, event_name TEXT NOT NULL,
  payload_redacted_json TEXT NOT NULL, created_at TEXT NOT NULL,
  analytics_delivery_status TEXT NOT NULL, analytics_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS external_operations (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL, kind TEXT NOT NULL, provider TEXT NOT NULL,
  provider_external_id TEXT, intent_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
`;

# RelayPM — AI Maintenance Coordinator

RelayPM gives small landlords and property managers their time back by handling the coordination around a maintenance request: tenant intake, structured triage, landlord approvals, contractor outreach, scheduling, and status updates.

This is a hackathon MVP, not a full property-management system. Its wedge is **real phone and SMS coordination with explicit human control over consequential actions**.

## Sponsor priority

1. **Dial — required for the core demo.** A real phone/SMS identity, AI voice intake, outbound contractor calls, transcripts, and delivery webhooks.
2. **Keewano — optional observability.** Product and workflow events for funnel and time-to-resolution analysis.
3. **Sparta — optional evaluation.** Repeatable agent tests and fault scenarios where a supported Sparta world can observe and grade the resulting state.

If Keewano or Sparta is unavailable, the maintenance workflow still runs. The UI and demo must label fallbacks accurately; a skipped sponsor integration must never be presented as a successful live integration.

## One-sentence demo

A tenant calls about a leaking sink; RelayPM captures the problem, alerts the landlord, obtains approval, calls an approved plumber for availability and a quote, asks for final booking approval, and texts the appointment to both parties.

## Full product vision: rental operations robot

The maintenance coordinator is the hackathon wedge. The full product is an accountable rental-operations robot that manages the property lifecycle while routing regulated, financial, legal, safety-critical, and high-cost decisions to the right human or licensed professional.

### 1. Market and place a tenant

– Answer prospect questions, schedule showings, and collect applications.
- Collect screening consent and send the application to an approved tenant-screening provider.
- Organize identity, rental history, income documents, references, background report, and credit information.
- Evaluate only the landlord's published, lawful, property-specific criteria and produce an explainable decision packet.
- Route every approval, conditional approval, denial, deposit change, rent change, or co-signer requirement to the landlord, who can approve or deny tenants.
- Generate any required adverse-action notice from the screening provider's source data and preserve delivery evidence.
- Prepare a jurisdiction- and property-specific lease packet from a lawyer-approved template, route it for review, and send it through an approved e-signature provider.

The robot must not create its own notion of whether a person is a “good match.” It may apply explicit, reviewed criteria to verified data, surface inconsistencies, and explain results. It must not use protected characteristics, proxies for them, personality guesses, neighborhood stereotypes, social-media profiling, or opaque model scores.

### 2. Turn over and prepare the property

- Create move-out/move-in inspection checklists with timestamped photos and condition notes.
- Compare condition against the prior signed inspection without automatically assigning blame or withholding a deposit.
- Build a scope of work for cleaning, paint, carpet/flooring, repairs, safety checks, locks, appliances, and yard work.
- Request quotes from approved handymen, licensed trades, cleaners, painters, flooring vendors, gardeners, and landscapers.
- Present quote comparisons, insurance/license documents where applicable, timing, and approval thresholds.
- Coordinate access and work only after the owner approves vendor, scope, budget, and schedule.
- Track completion evidence and require human acceptance before marking the unit rent-ready.

### 3. Manage vendors and recurring property care

- Maintain an approved vendor roster by trade, service area, credentials, insurance expiration, rate card, and availability.
- Coordinate one-time repairs and recurring services such as monthly landscaping or yard maintenance.
- Create recurring work orders, collect proof of service, match invoices to the approved scope, and flag exceptions.
- Never expand work, accept a price change, pay an invoice, or share access instructions outside the approval envelope.

### 4. Run the tenancy

- Receive tenant phone calls, SMS, email, and portal messages about repairs, concerns, and disputes.
- Triage maintenance, coordinate approved work, notify the landlord about significant repairs, and keep the tenant updated.
- Schedule periodic inspections—six-monthly by default, configurable by lease and jurisdiction—with notice, consent, checklist, photos, findings, and follow-up work orders.
- Monitor lease dates, rent due dates, renewals, notices, recurring landscaping, and open obligations.
- Keep a complete communication and decision history without exposing sensitive data to analytics.

### 5. Collect rent, charge management fees, and keep books

- Reconcile expected rent against bank/payment-provider transactions and flag late, partial, reversed, or unmatched payments.
- Calculate the management agreement's fee schedule. Seed the requested model as configuration, not hard-coded policy: `7%` of collected monthly rent and a new-tenancy fee equal to `50%` of one month's rent.
- Generate draft charges and invoices with their source agreement, calculation, period, and approval status.
- Maintain a double-entry ledger for rent, deposits, fees, repairs, maintenance, landscaping, insurance, property tax, entity costs, and owner distributions.
- Attach receipts/invoices, reconcile accounts, and produce monthly owner statements showing rent received, fees, maintenance expenses, balances, and exceptions.
- Produce a year-end accountant packet and draft information returns only from verified ledger/payee data and the current filing rules.

The robot may calculate, reconcile, draft, and queue. Real money movement, fee changes, collections action, deposit disposition, tax filing, and year-end form submission require an authorized human and, where appropriate, a bookkeeper, CPA, attorney, or licensed property manager.

### 6. Manage owner obligations

- Track home, landlord, liability, earthquake, flood, and other owner-selected policies, including coverage summary, premium, renewal date, evidence, and gaps.
- Track property-tax installments, rental tax obligations, permits, registrations, and inspections.
- Track each property-owning LLC's state, entity number, registered agent, annual/franchise tax, statement/information-report cadence, and filing evidence.
- Send reminders early, collect supporting documents, prepare a review packet, and route payment/filing to an authorized human or professional.
- Never infer that a policy, tax treatment, form, deadline, or entity filing applies merely from a property address. Resolve it from a versioned obligation configured for the actual owner, entity, property, and jurisdiction.

### 7. Handle concerns and disputes

- Create a case from any tenant, landlord, agency, vendor, neighbor, HOA, insurer, or government concern.
- Preserve the original message and evidence, build a neutral timeline, identify deadlines, and draft a response.
- Route fair-housing, habitability, injury, eviction, deposit, discrimination, threat, insurance claim, government notice, and legal-demand matters to a human immediately.
- Never threaten, retaliate, admit liability, waive rights, offer a settlement, issue an eviction notice, or make a legal conclusion autonomously.

## Autonomy model for the full product

| Tier | Robot may do | Examples |
|---|---|---|
| `A0 — observe` | Read, reconcile, classify, remind, and surface exceptions. | Missing rent, expiring insurance, six-month inspection due. |
| `A1 — draft` | Prepare a communication, lease packet, statement, work scope, filing packet, or proposed decision with sources. | Draft owner statement or adverse-action notice for review. |
| `A2 — execute within approval` | Perform a bounded, reversible action covered by explicit policy and a valid approval. | Call an approved plumber for a quote or send an approved inspection notice. |
| `A3 — human/professional only` | Never autonomously finalize. | Tenant selection, lease terms, adverse action, money movement, tax filing, insurance purchase, LLC filing, eviction, settlement, high-cost repair. |

Every automation policy declares its jurisdiction, legal/entity owner, effective dates, approval threshold, approver role, allowed channels, data fields, and rollback/escalation behavior. Missing or stale policy means `A1 — draft`, never silent execution.

## MVP scope

### In scope

- One landlord account, a seeded property/unit, one tenant, and a small approved-vendor roster.
- Inbound tenant SMS and AI-handled voice intake through Dial.
- A structured maintenance request with category, severity, summary, evidence links, and status.
- Rule-based emergency detection before any generative classification.
- A landlord approval queue for vendor contact, spend, and booking.
- Outbound Dial voice calls to approved contractors for a quote and availability.
- Transcript-to-quote extraction, with the raw source retained for human review.
- Tenant and landlord SMS updates through Dial.
- An immutable audit trail of every state transition and external interaction.
- Keewano workflow events when configured, with a durable local outbox fallback.
- A deterministic safety/evaluation suite, with an optional Sparta runner.

### Explicitly out of the hackathon MVP

- Rent collection, accounting, leasing, screening, deposits, or payments.
- Automatically selecting an unapproved contractor.
- Automatically accepting a quote, booking access, spending money, or changing locks.
- Diagnosis of gas, electrical, structural, fire, medical, or other life-safety hazards.
- Replacing emergency services, utilities, licensed professionals, or the landlord's legal duties.
- A multi-property enterprise dashboard, marketplace, or generalized property-management suite.

These are roadmap modules described above, not rejected product goals. Keeping them out of the one-day MVP protects the quality of the live Dial workflow and the safety boundaries needed before handling applicants, money, taxes, insurance, or legal documents.

## Success criteria

The MVP is done when one live scenario can move through this path:

`tenant contact → intake captured → triage → landlord approval → vendor outreach → quote captured → booking approval → appointment confirmed → tenant notified`

It must also demonstrate the opposite path: a suspected emergency is routed to a human immediately and **does not** trigger autonomous contractor booking.

## Safety contract

The coordinator may gather information and prepare actions. It may not create a financial, access, safety, or scheduling commitment without a scoped human approval.

### Urgency levels

| Level | Examples | System behavior |
|---|---|---|
| `CRITICAL` | fire/smoke, gas smell, sparking/live wire, active break-in, medical danger, collapse risk | Tell the tenant the AI is not emergency service; instruct them to contact the appropriate emergency service/utility and leave danger when appropriate; alert the landlord/on-call human immediately; stop normal automation. |
| `URGENT` | uncontrolled water, sewage backup, no heat in dangerous weather, exterior door cannot secure | Collect only low-risk facts; alert the human immediately; do not promise arrival time, authorize spend, or book access. |
| `ROUTINE` | dripping faucet, appliance issue, cosmetic damage | Create the request, acknowledge receipt, and wait for approval before vendor outreach. |

The emergency keyword/rule layer runs before any model-based extraction. Model output may increase urgency; it may never lower a rule-triggered urgency without human review.

### Approval gates

| Action | Approval requirement |
|---|---|
| Acknowledge receipt and ask clarifying questions | Allowed under the tenant communication policy. |
| Create or update the internal request | No separate approval; always audited. |
| Contact an approved vendor to request availability/quote | Landlord approval scoped to request, vendor set, purpose, and expiration. |
| Contact an unapproved vendor | Explicit landlord approval naming the vendor. |
| Accept a quote or commit to an appointment | A second approval with vendor, amount ceiling, date/time window, and expiration. |
| Share entry instructions, door codes, or tenant personal data | Explicit human approval; share the minimum necessary. |
| Pay, reimburse, order parts, change locks, or authorize work beyond the cap | Never automated in the MVP. |

Approvals are single-purpose, immutable after decision, time-limited, and consumed at most once. Any material change to vendor, price, scope, or time invalidates the approval and creates a new request.

### Communication rules

- The voice agent identifies itself as an AI maintenance coordinator.
- It does not claim to be a licensed professional or promise that a condition is safe.
- It does not mention a budget ceiling to a contractor unless the landlord explicitly authorizes that disclosure.
- It does not expose tenant phone numbers, addresses, access codes, or full transcripts to analytics.
- Recording/transcription disclosures and consent must be configured for the jurisdictions in which the demo will operate. This repository does not provide legal advice.
- A failed or ambiguous outbound call is reconciled before retry. Never blindly redial or resend; duplicate calls and SMS are externally visible.

## Architecture

```text
Tenant phone/SMS
      │
      ▼
    Dial ──────────────── outbound call/SMS ───────────────► Contractor
      │ signed webhook                                         │
      ▼                                                        │ transcript/status
Webhook ingress ─► durable inbox ─► coordinator state machine ◄┘
      │                                  │
      │                                  ├─► approval queue ─► Landlord UI/SMS
      │                                  ├─► Postgres/SQLite + audit log
      │                                  └─► analytics outbox ─► Keewano (optional)
      │
      └─► urgent router ─► landlord/on-call human

Test-only: fixtures/fake adapters ─► evaluation runner ─► Sparta, when supported
```

Recommended implementation: a TypeScript monorepo on Node.js 24, so the same runtime satisfies the current Sparta public beta while remaining compatible with the documented Dial and Keewano Node requirements.

```text
apps/
  web/                 # landlord approval UI and demo console
  api/                 # webhook ingress and app API
  worker/              # inbox/outbox processing and coordinator jobs
packages/
  core/                # entities, policies, state machine, domain events
  db/                  # repositories and migrations
  dial/                # Dial adapter; no business policy
  keewano/             # optional analytics sink
  evals/               # fake adapters and deterministic scenarios
evals/
  fixtures/            # tenant messages, calls, approvals, vendor outcomes
  sparta/              # optional runner/config after current beta setup
```

### Design rules

- The state machine owns workflow decisions; prompts and provider adapters do not.
- Webhook handlers verify, persist, and acknowledge quickly. Slow work runs in the worker.
- External events are deduplicated before effects occur.
- Every external action has a stable internal operation ID and an audit record.
- Raw provider payloads are stored separately from normalized domain records.
- Dial is the only required external dependency at runtime. Keewano failure cannot block a request; Sparta is test-only.

## Core data model

Identifiers are UUIDs unless the provider supplies an external string ID.

### `Property`

- `id`, `name`, `timezone`
- `street_address_encrypted`
- `owner_person_id`
- `emergency_policy_id`

### `Unit`

- `id`, `property_id`, `label`
- `tenant_person_ids[]`
- `access_notes_encrypted` — never sent to analytics

### `Person`

- `id`, `role` (`TENANT`, `LANDLORD`, `ON_CALL`, `VENDOR_CONTACT`)
- `display_name`
- `phone_e164_encrypted`
- `contact_preferences`, `locale`

### `Vendor`

- `id`, `trade`, `business_name`
- `approved`, `active`
- `phone_e164_encrypted`
- `service_area`, `after_hours`, `notes`

### `MaintenanceRequest`

- `id`, `property_id`, `unit_id`, `reporter_person_id`
- `source` (`SMS`, `VOICE`, `WEB`, `DEMO_FIXTURE`)
- `category`, `severity`, `summary`
- `status` (`INTAKE`, `HUMAN_REVIEW`, `AWAITING_OUTREACH_APPROVAL`, `SOURCING`, `AWAITING_BOOKING_APPROVAL`, `SCHEDULED`, `RESOLVED`, `CANCELLED`)
- `rule_flags[]`, `model_confidence`, `human_override`
- `created_at`, `updated_at`, `version`

### `Interaction`

- `id`, `maintenance_request_id`
- `channel`, `direction`, `participant_person_id`
- `provider`, `provider_external_id`, `provider_event_id`
- `transcript_or_body_encrypted`, `redacted_summary`
- `occurred_at`, `ingested_at`

### `Approval`

- `id`, `maintenance_request_id`, `requested_from_person_id`
- `kind` (`VENDOR_OUTREACH`, `BOOKING`, `DATA_SHARING`, `EXCEPTION`)
- `scope_json` — vendor IDs, maximum amount, time window, allowed disclosure
- `status` (`PENDING`, `APPROVED`, `DENIED`, `EXPIRED`, `CONSUMED`)
- `expires_at`, `decided_at`, `consumed_at`
- `request_version` — prevents approval reuse after the request changes

### `VendorQuote`

- `id`, `maintenance_request_id`, `vendor_id`, `interaction_id`
- `amount_min_cents`, `amount_max_cents`, `currency`
- `availability_windows[]`, `scope_summary`
- `confidence`, `human_verified`

### `Appointment`

- `id`, `maintenance_request_id`, `vendor_id`, `quote_id`, `approval_id`
- `start_at`, `end_at`, `status`
- `provider_confirmation_text`, `confirmed_at`

### `DomainEvent` / `AuditEvent`

- `id`, `aggregate_type`, `aggregate_id`, `event_name`
- `actor_type`, `actor_id`
- `payload_redacted`, `created_at`
- `analytics_delivery_status`, `analytics_attempts`

The database enforces unique constraints on `(provider, provider_event_id)` and on consumed approval IDs. State transitions use optimistic concurrency through `MaintenanceRequest.version`.

### Post-MVP module models

Do not overload `MaintenanceRequest` to implement the full product. Add bounded modules with shared `Person`, `Property`, `Unit`, `Approval`, `Interaction`, `Document`, `Obligation`, and `AuditEvent` primitives.

| Module | Primary records |
|---|---|
| Leasing | `Listing`, `Prospect`, `Application`, `ScreeningConsent`, `ScreeningReportRef`, `CriteriaVersion`, `ApplicationDecision`, `AdverseActionNotice`, `LeaseTemplateVersion`, `LeasePacket`, `SignatureEnvelope` |
| Turnover/inspection | `Inspection`, `InspectionNotice`, `InspectionItem`, `ConditionEvidence`, `TurnoverPlan`, `WorkOrder`, `CompletionEvidence` |
| Vendors | `VendorCredential`, `ServiceAgreement`, `RecurringService`, `Quote`, `Invoice`, `InvoiceMatchException` |
| Tenancy | `Tenancy`, `Occupant`, `RentSchedule`, `LeaseObligation`, `Renewal`, `ConcernCase` |
| Accounting | `Account`, `JournalEntry`, `JournalLine`, `BankTransaction`, `Reconciliation`, `ManagementFeeRule`, `OwnerStatement`, `TaxPacket` |
| Owner compliance | `LegalEntity`, `EntityFilingObligation`, `InsurancePolicy`, `TaxObligation`, `PropertyTaxInstallment`, `ComplianceEvidence` |
| Disputes | `DisputeCase`, `Party`, `EvidenceItem`, `Deadline`, `DraftResponse`, `ProfessionalReferral` |

Sensitive screening data should remain with the authorized screening provider where possible. Store provider references, consent, policy version, decision inputs/outputs, notices, and audit evidence—not a shadow copy of an applicant's full consumer report.

## End-to-end call and SMS flow

### 1. Configure tenant intake

A Dial number receives SMS and voice. Set its `inboundInstruction` to:

- identify the agent as AI;
- ask for unit/name, the problem, when it started, whether it is getting worse, and whether anyone is in immediate danger;
- never diagnose or promise a repair time;
- for emergency signals, tell the caller to contact the appropriate emergency service/utility and notify the on-call human;
- summarize the request and explain that a human may review it.

Inbound calls are handled by Dial using the number's `inboundInstruction`. The application reacts to signed events. Use `message.received` for SMS and `call.ended`/`call.transcribed` for completed calls. The transcript can arrive after the call-ended event, so those events must be handled independently.

### 2. Verify and persist

`POST /webhooks/dial` must:

1. read the exact raw request body;
2. verify `X-Dial-Signature` with `DIAL_WEBHOOK_SECRET`;
3. reject stale signatures;
4. deduplicate on `X-Dial-Event-ID`;
5. persist the raw event and enqueue processing;
6. return a 2xx response quickly.

Dial webhooks are at-least-once and retry, so idempotency is mandatory.

### 3. Triage

The worker normalizes the interaction, applies emergency rules, then optionally extracts structured fields. The final severity is the maximum of rule severity, model severity, and any human override. A `CRITICAL` or `URGENT` request enters `HUMAN_REVIEW` and pages the configured person; normal vendor automation stops.

For voice, the app cannot assume it can dynamically transfer an inbound AI call. The public Dial documentation describes automatic inbound handling and outbound human transfer separately. Until the hackathon sponsor confirms an inbound-transfer capability, the safe flow is: emergency language in the inbound instruction, followed by immediate post-call human alerting.

### 4. Approve vendor outreach

For a routine request, the landlord sees the summary, transcript/body, urgency flags, and proposed approved vendors. Approval specifies which vendors may be contacted and when it expires.

### 5. Call contractors

The worker uses Dial to call one approved vendor at a time. The outbound instruction contains only the authorized request summary and asks for:

- earliest availability;
- estimated price or diagnostic fee;
- whether parts or a second visit may be required;
- a callback/reference number;
- no commitment or booking.

After `call.transcribed`, the coordinator extracts a proposed `VendorQuote`. The UI shows the transcript beside extracted fields. No quote is considered verified solely because a model parsed it.

### 6. Approve and confirm booking

The landlord approves one vendor, a maximum price, and a time window. The coordinator checks that the request version and approval still match, then contacts the vendor to confirm. A final SMS goes to the tenant and landlord. If any material term differs, the state returns to `AWAITING_BOOKING_APPROVAL`.

## Dial integration — required

Official docs verified on **2026-10-11**:

- [Dial introduction](https://docs.getdial.ai/documentation/get-started/introduction)
- [Quickstart](https://docs.getdial.ai/documentation/get-started/quickstart)
- [Authentication](https://docs.getdial.ai/documentation/get-started/authentication)
- [Node SDK](https://docs.getdial.ai/documentation/sdks/node)
- [Inbound voice](https://docs.getdial.ai/documentation/capabilities/receive-a-voice-call)
- [Outbound voice](https://docs.getdial.ai/documentation/capabilities/place-a-voice-call)
- [Webhooks](https://docs.getdial.ai/documentation/platform/webhooks)

### Setup

```bash
npm install -g @getdial/cli
dial auth login you@example.com
# Complete the documented email/phone verification steps, then:
dial doctor
dial number list
```

The current CLI quickstart requires Node.js 22 or newer. The application uses the documented SDK:

```bash
npm install @getdial/sdk
```

```ts
import { DialClient } from "@getdial/sdk";

const dial = new DialClient({
  apiKey: process.env.DIAL_API_KEY!,
  userAgent: "relaypm/0.1.0",
});

const message = await dial.sendMessage({
  to: "+14155550123",
  fromNumberId: process.env.DIAL_PHONE_NUMBER_ID!,
  body: "We received your maintenance request.",
});

const call = await dial.makeCall({
  to: "+14155550123",
  fromNumberId: process.env.DIAL_PHONE_NUMBER_ID!,
  outboundInstruction: "Identify yourself as RelayPM. Ask only for availability and a quote. Do not book or authorize work.",
  language: "en-US",
});
```

The method names and fields above come from the current official Node SDK guide. Replace sample phone numbers with records resolved from the encrypted database and enforce `DIAL_ALLOWLIST_E164` outside production.

Create a webhook for the app's public HTTPS endpoint:

```bash
curl -X POST https://api.getdial.ai/v1/webhooks \
  -H "Authorization: Bearer $DIAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://YOUR_PUBLIC_HOST/webhooks/dial","eventTypes":["message.received","message.status_changed","call.ended","call.transcribed"]}'
```

Store the returned `whsec_…` value as `DIAL_WEBHOOK_SECRET`. Verify the official HMAC format against the raw bytes and reject events older than five minutes. Deduplicate using `X-Dial-Event-ID`.

#### Retry warning

The current Dial documentation contains a conservative ambiguity: the Node SDK page documents an optional `idempotencyKey` for `makeCall`, while the outbound-call capability page warns that calls are not idempotent and advises reconciliation before retry. RelayPM therefore treats all calls and SMS as externally non-idempotent: persist the returned provider ID, inspect recent provider history after ambiguous failures, and require an operator decision before another live attempt. Do not build blind automatic retries.

## Keewano integration — optional, never blocking

Official docs verified on **2026-10-11**:

- [Connecting to Keewano](https://docs.keewano.com/getting-started/connecting-to-keewano)
- [Node.js SDK](https://docs.keewano.com/sdks/nodejs)
- [Custom Events Codegen](https://docs.keewano.com/sdks/custom-events-codegen)
- [MCP for Agents](https://docs.keewano.com/analytics/mcp-for-agents)

Use Keewano to analyze workflow behavior, not to store operational truth. Postgres/SQLite and the audit log remain authoritative.

### Setup

1. Create an **SDK-type project API key** in Keewano under Settings → API Keys.
2. Install the documented server SDK (Node.js 20+):

   ```bash
   npm install @keewano/node-sdk
   ```

3. Initialize it once with a private, persistent directory unique to this service and replica:

   ```ts
   import { Keewano } from "@keewano/node-sdk";

   await Keewano.init({
     apiKey: process.env.KEEWANO_PROJECT_API_KEY!,
     dataDir: process.env.KEEWANO_DATA_DIR!,
   });
   ```

4. Define the custom event schema in Keewano and use the official custom-events code generator with the `node` target. Use the generated functions inside the SDK's per-user batch reporter. Do not hand-write or guess custom-event SDK method names.

Suggested domain-to-analytics events:

- `maintenance_requested`
- `urgency_classified`
- `urgent_issue_routed`
- `approval_requested`
- `approval_decided`
- `vendor_outreach_started`
- `vendor_call_completed`
- `quote_captured`
- `appointment_confirmed`
- `request_resolved`
- `integration_fallback_activated`

Use a stable pseudonymous request or account identifier. Send severity, category, channel, state, elapsed milliseconds, vendor count, and approval outcome. Never send names, phone numbers, street addresses, access instructions, message bodies, transcripts, or free-form notes.

### Fallback behavior

Every analytics event is first written to the local `DomainEvent` outbox in the same transaction as the workflow change.

- When `KEEWANO_ENABLED=false`, mark delivery as `SKIPPED_DISABLED` and emit structured local logs.
- On authentication or validation failure, mark `FAILED_PERMANENT` and surface it in the demo health panel.
- On timeout/5xx, leave `PENDING`, back off, and retry without blocking the maintenance workflow.
- Cap retry age and outbox size. Expired analytics events become `DEAD_LETTER`, not an infinite queue.
- The demo displays `Keewano: live`, `degraded`, or `disabled`; it never labels local logs as Keewano data.

The official REST ingestion contract is available if the SDK is unsuitable: `POST https://api.keewano.com/event/ingress/v1/json/in` with an SDK-type key in the `k-token` header. It accepts an ordered, single-user/install batch and returns `202` for asynchronous acceptance. Custom event IDs (≥ 2000) must first be registered through the documented custom-event endpoint. Use the current Swagger reference rather than copying a guessed payload.

## Sparta integration — optional evaluation only

Official docs verified on **2026-10-11**:

- [Sparta Worlds docs](https://www.usesparta.co/docs)
- [Connect your agent](https://www.usesparta.co/docs/connect-agent)
- [Tasks and expected outcomes](https://www.usesparta.co/docs/tasks)
- [Failure conditions](https://www.usesparta.co/docs/scenarios)
- [Deployment and CI](https://www.usesparta.co/docs/deploy)

The current public beta documentation uses Node.js 24+ and identifies the current documented package as `0.9.0-beta.5`. Installation instructions are provided through Sparta's current beta/hackathon setup guide; follow that guide and pin its exact artifact. Do not invent a package name or installation URL.

### Honest scope boundary

Sparta Worlds grades state changes in supported local connector worlds. Its current public scope includes Stripe, native Zendesk, combined support/billing workflows, and specifically documented experimental subsets. It does **not** publicly document a native RelayPM/property-maintenance data model.

Therefore:

- Prefer a hackathon-provided Customer Desk/Team Inbox starter if the participant guide confirms it is available in the installed build.
- Otherwise map maintenance intake/escalation to the documented native Zendesk support workflow and grade only observable ticket outcomes.
- Keep property-specific invariants in RelayPM's deterministic test suite unless a supported custom world/connector is explicitly documented.
- Do not claim that Sparta verified a booking, phone call, or database invariant that its world could not observe.

### Runner contract

Create `evals/sparta/runner.mjs` after installing the participant build. It should:

1. read the task JSON from `WORLDS_TASK_JSON` (and stdin if required by the selected documented workflow);
2. use the per-run `WORLDS_*` connection values injected by Sparta—never hard-code or reuse them;
3. set `EVAL_MODE=1`, which swaps Dial and Keewano for deterministic fake adapters;
4. run the coordinator against the task;
5. write only the reply form required by the chosen Sparta workflow;
6. allow the world state, not a self-reported answer, to determine pass/fail.

Use documented Sparta scenarios to exercise latency, 401s, 429s, 500s, and dropped/reordered webhooks where the selected connector supports them. A strong reply is not proof; persisted state and prohibited side effects are the grade.

### Fallback behavior

`pnpm test:eval` always runs the local deterministic scenario suite. If the `worlds` CLI or a supported connector is unavailable:

- report `Sparta: SKIPPED (reason)`;
- run the same logical fixtures with fake provider adapters and database assertions;
- preserve JSON and HTML/JUnit results as artifacts;
- do not convert the skip into a pass or claim Sparta coverage.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit real values.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | yes | SQLite for a one-machine demo or Postgres for deployment. |
| `APP_BASE_URL` | yes | Public HTTPS origin used for webhook registration. |
| `APPROVAL_SIGNING_SECRET` | yes | Signs landlord approval links/tokens. |
| `DIAL_API_KEY` | yes for live demo | Dial account bearer key. |
| `DIAL_API_URL` | no | Defaults to `https://api.getdial.ai`. |
| `DIAL_PHONE_NUMBER_ID` | yes for live demo | The Dial `pn_…` sender/voice number ID. |
| `DIAL_WEBHOOK_SECRET` | yes for webhooks | Per-subscription `whsec_…` secret. |
| `DIAL_ALLOWLIST_E164` | yes outside production | Comma-separated test recipients; block all others. |
| `LANDLORD_ESCALATION_PHONE_E164` | yes | Human recipient for urgent alerts. |
| `KEEWANO_ENABLED` | no | `false` by default. |
| `KEEWANO_PROJECT_API_KEY` | when enabled | SDK-type Keewano project key. |
| `KEEWANO_DATA_DIR` | when enabled | Private persistent SDK queue directory. |
| `SPARTA_ENABLED` | no | Enables the optional installed evaluation runner. |
| `EVAL_MODE` | no | Forces fake external providers; set by tests, never production. |
| `LOG_REDACTION_SALT` | yes | Salt for deterministic pseudonymous log identifiers. |

Sparta supplies `WORLDS_TASK_JSON` and workflow-specific `WORLDS_*` values per run. Do not place those dynamic values in `.env`.

## Compliance baseline for roadmap modules

The product must use a configurable jurisdiction/compliance layer; it cannot treat this section as a complete legal or tax rules engine. Official U.S. sources checked on **2026-10-11**:

- [HUD guidance on applicant screening](https://archives.hud.gov/news/2024/FHEO_Guidance_on_Screening_of_Applicants_for_Rental_Housing.pdf) explains that the Fair Housing Act applies regardless of the technology used, including AI, and recommends clear, relevant, nondiscriminatory screening policies.
- [FTC guidance for landlords using consumer reports](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know) covers permissible housing purpose, use of tenant-screening/credit reports, adverse-action notices, extra score disclosures, and secure disposal.
- [CFPB tenant-screening guidance](https://www.consumerfinance.gov/rules-policy/tenant-background-checks/review-your-rental-background-check/) summarizes applicants' access and dispute rights.
- [IRS rental-income, expense, and recordkeeping guidance](https://www.irs.gov/businesses/small-businesses-self-employed/tips-on-rental-real-estate-income-deductions-and-recordkeeping) emphasizes reporting rental income and retaining records that support receipts and expenses.
- [IRS Publication 527](https://www.irs.gov/forms-pubs/about-publication-527) covers residential rental income, expenses, depreciation, and reporting at a federal level.

Engineering implications:

- screening criteria are versioned, published, explainable, reviewed for protected-class impact, and never silently changed by a model;
- consumer-report access requires a documented housing purpose, authorization/consent workflow, least-privilege access, retention limits, dispute handling, and secure disposal;
- adverse actions and conditional approvals remain human decisions with notice generation/delivery evidence;
- lease templates, inspection notice periods, fees, deposits, late-rent workflows, licensing, entry rules, required disclosures, and dispute handling are jurisdiction-specific;
- accounting is append-only and auditable; tax classification and form selection are professional-review decisions;
- government/insurer/entity deadlines are versioned `Obligation` records with authoritative source URLs and `last_verified_at`, not constants embedded in prompts;
- the robot never files a tax/entity form, purchases/cancels insurance, transfers money, reports a tenant to a consumer-reporting agency, or initiates eviction without an authorized human at the final step.

This is a product-control baseline, not legal, tax, insurance, or accounting advice. A production launch requires jurisdiction-specific review by qualified professionals.

## Build plan for Codex

Each task ends with tests and a short README update. Do not start the next sponsor layer until the current layer's acceptance test passes.

### P0 — project and state machine

- [ ] Scaffold the TypeScript workspace on Node.js 24 with `apps/web`, `apps/api`, `apps/worker`, and the packages shown above.
- [ ] Add migrations and repository interfaces for every core model.
- [ ] Implement allowed maintenance-state transitions and optimistic concurrency.
- [ ] Add the rule-first urgency classifier and approval policy as pure functions.
- [ ] Add encrypted-at-rest fields and centralized log redaction.
- [ ] Seed one property, tenant, landlord, plumber, and electrician with synthetic data.

**Acceptance:** unit tests prove invalid transitions, expired/reused approvals, and attempts to lower rule-triggered urgency are rejected.

### P1 — Dial tenant intake

- [ ] Implement a `DialGateway` wrapper around the official `@getdial/sdk` methods used by the MVP.
- [ ] Implement raw-body signature verification and a deduplicating webhook inbox.
- [ ] Handle `message.received`, `message.status_changed`, `call.ended`, and `call.transcribed` independently.
- [ ] Create/update requests from normalized interactions.
- [ ] Add an allowlist-protected live connectivity script that lists numbers and sends one opt-in test SMS.

**Acceptance:** replaying the same signed fixture twice creates one interaction and one request; one allowlisted live SMS reaches the test phone.

### P2 — approvals and contractor coordination

- [ ] Build the landlord request detail and approval screens.
- [ ] Create scoped, expiring, single-use outreach and booking approvals.
- [ ] Call only approved/allowlisted vendors and persist provider IDs before continuing.
- [ ] Parse vendor call results into a draft quote linked to the source transcript.
- [ ] Require a second approval before confirmation and notify both parties after confirmation.
- [ ] Add an operator reconciliation screen for ambiguous external outcomes.

**Acceptance:** no vendor call without outreach approval; no confirmed appointment without a matching, unexpired booking approval; a changed quote invalidates the old approval.

### P3 — urgent routing

- [ ] Add deterministic critical/urgent fixtures and on-call alerts.
- [ ] Stop the normal workflow as soon as a critical rule fires.
- [ ] Show emergency guidance in the Dial inbound instruction and the UI.
- [ ] Make all urgent actions prominent in the immutable audit timeline.

**Acceptance:** gas, fire, sparking wire, and active flooding tests create no quote, vendor booking, or payment action.

### P4 — Keewano analytics

- [ ] Implement the local outbox and analytics health status first.
- [ ] Configure Keewano custom events using official codegen; do not guess SDK calls.
- [ ] Send only the allowlisted, redacted analytics schema.
- [ ] Build a demo query/report for intake-to-appointment conversion and median time at each approval gate.

**Acceptance:** disabling or breaking Keewano does not change workflow results; privacy tests reject PII/transcript fields at the adapter boundary.

### P5 — Sparta and local evaluations

- [ ] Build the provider-fake scenario runner before connecting Sparta.
- [ ] Add the Sparta runner only after installing the documented participant build and selecting a supported world.
- [ ] Grade persisted outcomes and prohibited side effects, not transcript polish.
- [ ] Add failure cases for duplicate webhooks, stale approvals, timeouts, 401/429/500 responses, dropped events, and ambiguous calls.
- [ ] Export an evidence report and show whether Sparta was live or skipped.

**Acceptance:** all critical safety invariants pass in local tests; any Sparta report clearly identifies the world/connector and exactly what it observed.

### P6 — post-hackathon rental lifecycle

Build these as separate vertical slices after the maintenance demo is stable:

- [ ] Turnover inspections, rent-ready plan, approved vendor work, and completion evidence.
- [ ] Recurring landscaping/yard service with invoice matching and exception approval.
- [ ] Periodic inspection notices, scheduling, checklist, evidence, and follow-up work orders.
- [ ] Rent schedule, payment reconciliation, configurable management/new-tenancy fees, double-entry ledger, and monthly owner statement.
- [ ] Applicant intake, consented provider-based screening, published criteria, human decision, adverse-action workflow, lawyer-approved lease templates, and e-sign handoff.
- [ ] Insurance, property-tax, entity, and filing obligation calendar with professional review and payment/filing approvals.
- [ ] Year-end accountant packet and draft forms from verified ledger/payee records.
- [ ] Dispute case management with evidence timeline, deadline tracking, drafted responses, and mandatory escalation categories.

**Acceptance:** each vertical slice has a threat/privacy review, jurisdiction configuration, immutable decision evidence, role-based approval, and a `draft/disabled` fallback when authoritative policy data is missing.

## Demo script (6–8 minutes)

1. **Safety first (45 sec).** Show a pre-recorded/simulated gas-smell fixture. The request becomes `CRITICAL`, the on-call alert appears, and vendor automation stops.
2. **Live tenant intake (90 sec).** Text or call the Dial number with a routine leak. Show the signed event arrive, the request populate, and the call/SMS source attached.
3. **Human control (60 sec).** Open the landlord UI and approve contact with the seeded plumber for quote-only outreach.
4. **Real contractor coordination (90 sec).** Dial calls an opt-in demo contractor/test phone. The voice agent asks for availability and a quote without booking.
5. **Second approval (60 sec).** Show the transcript-backed draft quote, approve a capped time window, and confirm the appointment.
6. **Close the loop (30 sec).** Show the tenant and landlord confirmation SMS and the complete audit timeline.
7. **Evidence (45 sec).** Show Keewano funnel/time metrics if live; otherwise show `disabled` honestly. Show local safety results and, if supported, the Sparta world diff/report with its connector scope.

Use only participants who have opted in to the demo calls/SMS. Reset seeded data before presenting. Keep a signed webhook fixture available for local development, but do not present a fixture replay as a live Dial interaction.

## Test and evaluation matrix

### Required functional tests

- Inbound SMS creates exactly one request.
- Inbound call end and transcript events can arrive in either order.
- Duplicate webhook delivery has no duplicate side effect.
- Routine intake requests outreach approval.
- Vendor call is blocked without valid outreach approval.
- Booking is blocked without valid booking approval.
- Quote/appointment changes invalidate approval.
- SMS/call ambiguous failure enters reconciliation instead of retrying.
- Keewano disabled/failed leaves the workflow unchanged.

### Required safety tests

- Critical keyword/rule cannot be downgraded by model output.
- Critical and urgent cases never create an autonomous booking.
- The agent never authorizes payment, access, lock changes, or work beyond the approved scope.
- Only approved vendors and allowlisted live test numbers can be contacted.
- Analytics payloads contain no phone, name, address, access data, message body, or transcript.
- Logs redact provider keys, webhook secrets, phone numbers, addresses, and transcripts.
- Expired, denied, consumed, or version-mismatched approvals cannot be reused.

### Quality gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration` with fake providers
- `pnpm test:eval` with JSON/JUnit output
- `LIVE_DIAL_TEST=1 pnpm test:dial:smoke` only with an explicit allowlist and human opt-in

Target thresholds: 100% pass on critical safety invariants, zero unintended live contacts, zero duplicate external actions in replay tests, and p95 webhook acknowledgement under two seconds in the demo environment.

## Failure modes worth narrating to judges

- **Why not another dashboard?** The system performs the coordination work over the channels tenants and contractors already use.
- **Why human approvals?** Phone calls can create real-world commitments; approvals make autonomy bounded and auditable.
- **Why two approval gates?** Permission to ask for a quote is not permission to accept it.
- **Why an outbox?** Analytics downtime must not block urgent maintenance.
- **Why state-based evaluation?** A polished transcript can hide the wrong booking, duplicate action, or missing escalation.

## Documentation integrity policy

Sponsor APIs change. Before modifying any adapter:

1. open the current official page linked above;
2. verify package name, runtime requirement, method/field names, event names, and authentication;
3. add or update a provider contract test;
4. update the verification date in this README;
5. if the public docs are incomplete or contradictory, isolate the uncertainty behind the adapter and leave a named TODO—never fabricate an SDK method or endpoint.

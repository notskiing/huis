# Huis MVP

Huis is a landlord-only maintenance console. Tenants do not need an account or another app: they call, text, or email the maintenance line, and Huis coordinates the work while keeping consequential decisions with the landlord.

This repository implements the focused maintenance workflow from [`INPUTS/README.md`](./INPUTS/README.md):

`tenant contact → triage → outreach approval → vendor quote → booking approval → appointment confirmation`

It also includes a critical-safety path that stops vendor automation and routes the request to a human.

## What is working

- Responsive landlord review console with request queue, vendors, immutable activity history, integration health, and one-click demo scenarios.
- Property picker before the inbox, with every request and timeline event scoped to the selected property.
- Tenant intake modeled across Dial voice/SMS and email attachments. There is intentionally no tenant portal.
- A MongoDB document-store boundary for cloud use, with Node 24 SQLite as the zero-setup local fallback.
- AES-256-GCM encryption for phone numbers, addresses, access notes, message bodies, transcripts, and raw webhook bodies.
- Central state machine, optimistic concurrency, rule-first urgency, and version-scoped single-use approvals.
- Separate approvals for quote-only vendor outreach and capped/time-bounded booking.
- Official Dial SDK adapter and exact-body HMAC verification with timestamp rejection and event deduplication.
- Keewano-backed maintenance timeline with generated custom events, a durable local outbox, retry/dead-letter handling, and a safe local fallback when the provider is unavailable.
- Optional OpenAI agent planner that recommends which Huis roles should handle a request. It is off by default and cannot take actions.
- Deterministic unit, integration, and safety evaluation suites. Sparta is reported as skipped until a documented participant build/world is configured.

The seeded demo uses sample provider outcomes. The UI labels them as a demo; no real call, text, email, payment, booking, or access disclosure occurs without provider configuration and the required guardrails.

## Run locally

Requirements: Node.js 24+ and pnpm 11+.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The API listens on `127.0.0.1:3001`.

Try the main routine workflow:

1. Open the seeded kitchen-sink request.
2. Approve quote-only outreach.
3. Receive the demo vendor quote.
4. Review the transcript-derived draft and approve the vendor, amount ceiling, and time window.
5. Confirm the scheduled state and audit events.

Use **Safety test** to create a gas-odor call. It is classified `CRITICAL`, enters human review, and never creates outreach approval, quote, or appointment records. Use **Demo email** to create an email intake with three evidence attachments.

## Configuration

Copy `.env.example` and replace placeholders locally. Never commit real credentials, phone numbers, addresses, recordings, or transcripts.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string for cloud persistence. |
| `MONGODB_DATABASE` | MongoDB database name, default `huis`. |
| `MONGODB_COLLECTION_PREFIX` | Prefix for Huis collections, default `huis_`. |
| `DATABASE_URL` | Local SQLite fallback when MongoDB is not configured. |
| `DATA_ENCRYPTION_KEY` | Production encryption key for sensitive columns. |
| `APPROVAL_SIGNING_SECRET` | Approval-link/token signing secret for a hosted deployment. |
| `TENANT_INTAKE_EMAIL` | Address tenants use for photos and documents; defaults to `maintenance@your-domain.com`. |
| `OPENAI_AGENT_ENABLED` | Set `true` to enable the optional role planner; leave `false` while testing. |
| `OPENAI_API_KEY` | OpenAI project key for the planner. |
| `OPENAI_MODEL` | Model ID for planning; default `gpt-6-luna`. |
| `DIAL_API_KEY` | Enables the live Dial adapter. Leave empty for the demo. |
| `DIAL_PHONE_NUMBER_ID` | Dial phone-number ID used for calls and SMS. |
| `DIAL_WEBHOOK_SECRET` | Dial webhook signing secret. |
| `DIAL_ALLOWLIST_E164` | Only live destinations permitted outside production. |
| `LIVE_DIAL_TEST` | Must be `1` for the opt-in smoke script. |
| `KEEWANO_ENABLED` | Enables the required live maintenance timeline; set `true` in hosted environments. |
| `KEEWANO_PROJECT_API_KEY` | Keewano SDK-type project key from Settings → API Keys. |
| `KEEWANO_DATA_DIR` | Private persistent queue directory, unique to each service process/replica. |
| `KEEWANO_ENDPOINT` | Optional Keewano ingress override for staging/self-hosted use. |
| `SPARTA_ENABLED` | Indicates an official supported participant runner is configured. |

The MongoDB adapter lives in [`packages/db/src/mongo.ts`](./packages/db/src/mongo.ts). It uses separate collections for requests, approvals, interactions, quotes, appointments, audit events, webhook inbox records, and domain events. It is intentionally not connected until the URI and driver are supplied. When you are ready to turn it on, add the official driver with `pnpm add mongodb -w`, set `MONGODB_URI`, and deploy the API with the same environment. Email intake is modeled and demo-ready, but a live mailbox provider is deliberately not guessed.

Keewano is configured through the official Node relay SDK. The event schema is [`keewano.events.json`](./keewano.events.json), and the generated Node helpers live in [`packages/keewano/src/generated/keewano-events.generated.ts`](./packages/keewano/src/generated/keewano-events.generated.ts). To regenerate after appending an event (never reorder existing events):

```bash
npx keewano-codegen --target node --code packages/keewano/src/generated --input keewano.events.json
```

The agent planner lives in [`packages/agentic/src/index.ts`](./packages/agentic/src/index.ts). It sends only redacted fields (category, severity, status, source, and rule flags) to the OpenAI Responses API. Without a key, it uses the same deterministic rules already used by the workflow. With a key, it asks `gpt-6-luna` for a structured role recommendation and then adds Huis's safety roles back if the request is urgent or critical.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:eval
```

The live Dial smoke test is opt-in only:

```bash
pnpm --filter @relaypm/dial add @getdial/sdk@0.21.0
LIVE_DIAL_TEST=1 DIAL_SMOKE_TO_E164=+14155550123 pnpm test:dial:smoke
```

It still requires a configured SDK key, Dial number ID, an explicitly allowlisted destination, and recipient consent.

## Integration status

- **Dial:** official `@getdial/sdk` seam implemented; the live key belongs in `.env.local`, never `.env.example`. SDK and webhook contracts rechecked against official documentation on 2026-10-11.
- **Keewano:** required for the live maintenance timeline. Huis writes redacted domain events to the local outbox in the same transaction as workflow changes, delivers them through the official Node SDK, retries temporary failures, and marks permanent failures/dead letters without blocking maintenance work. The local audit trail remains authoritative during provider outages.
- **Sparta:** `SKIPPED` unless the documented participant build and an observable supported world are supplied. Local safety evals always run.

## Repository layout

```text
apps/web       landlord operations console
apps/api       HTTP API and Dial webhook ingress
apps/worker    inbox/outbox worker entrypoint
packages/core  state machine, urgency, approvals, redaction
packages/db    schema, encryption, repositories, demo seed
packages/dial  official SDK boundary and webhook verification
packages/keewano privacy-safe analytics boundary
packages/agentic optional OpenAI role planner with deterministic fallback
packages/evals deterministic safety scenarios
```

## Safety boundary

Huis does not diagnose hazards, claim a condition is safe, automatically select an unapproved vendor, accept changed terms, pay, reimburse, order parts, share entry codes, change locks, or spend beyond an approval. A transcript is evidence, not authorization. Critical and urgent requests stop the normal process and require a human response.

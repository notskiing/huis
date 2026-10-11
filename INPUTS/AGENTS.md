# RelayPM repository instructions

Build a hackathon-ready AI maintenance coordinator whose core value is real phone/SMS coordination through Dial with bounded human control. Read `README.md` before changing architecture, provider code, safety policy, data models, or the demo.

## Product contract

- Optimize for one excellent end-to-end maintenance workflow, not a broad property-management suite.
- Treat that workflow as the hackathon wedge into a full rental-operations robot covering leasing, turnover, vendors, inspections, tenancy, accounting, owner obligations, and disputes.
- Integration priority is Dial first, Keewano second, Sparta third.
- Dial is required for the live demo. Keewano and Sparta are optional and must fail gracefully.
- Never describe a fixture, fake adapter, skipped integration, or local log as a live sponsor result.
- Preserve the two approval gates: approval to contact vendors, then approval to accept terms/book.
- Payments, lock changes, access-code sharing, unapproved vendors, and spend beyond an approval are outside the MVP.
- Do not pull roadmap modules into the hackathon critical path. Build them as separate bounded contexts after the live maintenance flow is stable.

## Full-lifecycle boundaries

- The robot may observe, reconcile, remind, draft, and execute only bounded actions covered by a valid policy and approval.
- Tenant selection, conditional approval, denial, lease terms, adverse action, deposit disposition, money movement, tax filing, insurance purchase/cancellation, LLC filing, eviction, settlement, and high-cost repair are human/professional final decisions.
- “Good match” is not a model label. Apply only explicit, published, versioned, lawful screening criteria to authorized provider data; expose the factors and source records used.
- Never use protected characteristics or proxies, personality inference, social-media profiling, neighborhood stereotypes, or a model-generated composite score for housing decisions.
- Keep consumer reports with the authorized provider where possible. Persist consent, provider reference, criteria version, decision evidence, notices, and dispute state; avoid duplicating full reports.
- Lease and notice documents come from jurisdiction-specific, lawyer-approved, versioned templates. A model may populate and flag them, not create operative terms from scratch.
- Management fees are configurable agreement rules. Seed `7%` of collected monthly rent and `50%` of one month's rent for new tenancy as demo configuration; never hard-code them into ledger logic.
- Use double-entry accounting. Posted journal entries are append-only and corrected with reversing entries.
- A bank match proves a transaction was observed, not that it is correctly classified. Surface exceptions for review.
- Monthly owner statements and year-end packets must trace every amount to ledger entries and source evidence.
- Insurance, property tax, income tax, entity tax, statements of information, permits, and similar duties are versioned `Obligation` records scoped to owner/entity/property/jurisdiction with source URL and last verification date.
- Missing, stale, or ambiguous policy data forces draft/reminder mode; it never authorizes payment or filing.
- Periodic inspections require configured notice/entry rules, documented delivery, scope, consent where applicable, and minimum-necessary evidence collection.
- Legal, fair-housing, habitability, injury, eviction, deposit, discrimination, threat, insurance-claim, and government-notice disputes escalate immediately. Do not threaten, retaliate, admit liability, waive rights, or settle autonomously.

## Intended stack and layout

- Use TypeScript with strict settings and Node.js 24.
- Prefer a small pnpm workspace:
  - `apps/web`: landlord review/approval and demo UI.
  - `apps/api`: HTTP API and Dial webhook ingress.
  - `apps/worker`: durable inbox/outbox and coordinator jobs.
  - `packages/core`: provider-free domain model, policies, and state machine.
  - `packages/db`: schema, migrations, repositories, and seed data.
  - `packages/dial`: Dial gateway and provider normalization only.
  - `packages/keewano`: optional redacted analytics sink only.
  - `packages/evals`: fake providers and deterministic scenarios.
  - `evals/sparta`: optional Sparta runner/config after official setup.
- Keep provider SDK objects out of `packages/core`.
- Keep prompts in versioned files or named constants with tests; do not bury policy in UI components.

If a framework choice is not yet present, choose the smallest common option that supports the demo. Do not add infrastructure that is not needed for the MVP.

## Source-of-truth hierarchy

1. Safety and approval invariants in this file and `README.md`.
2. Current official sponsor documentation linked in `README.md`.
3. Provider contract tests and captured redacted fixtures.
4. Existing code conventions.

When provider docs and code conflict, stop that integration change, record the exact conflict, and choose the safer behavior. Do not guess.

## External integration rules

### Dial

- Use the official `@getdial/sdk` package and only methods/fields verified in current official docs.
- Required MVP operations are number selection, `sendMessage`, `makeCall`, and signed webhook handling.
- Verify `X-Dial-Signature` against the exact raw body before parsing.
- Reject stale webhook timestamps and deduplicate on `X-Dial-Event-ID`.
- Handle `message.received`, `message.status_changed`, `call.ended`, and `call.transcribed` as independent, reorderable events.
- Persist provider IDs and operation intent before advancing workflow state.
- Treat live calls and SMS as non-idempotent external effects. Reconcile ambiguous outcomes; do not blindly retry.
- In development and tests, block all live destinations unless present in `DIAL_ALLOWLIST_E164`.
- Never run a live smoke test unless the user explicitly asks for it, `LIVE_DIAL_TEST=1`, the number is allowlisted, and the recipient opted in.

### Keewano

- Keewano is analytics, never operational storage or a workflow dependency.
- Initialize the official Node SDK only when `KEEWANO_ENABLED=true`.
- Use official custom-event codegen with the `node` target. Never invent generated function names or event payload shapes.
- Send only allowlisted fields from the analytics adapter. Do not pass entire domain objects.
- Never send names, phone numbers, addresses, access information, raw messages, transcripts, or free-form notes.
- Write a domain event to the local outbox in the same transaction as each workflow transition. Delivery happens asynchronously.
- Disabled or failed analytics must not change the maintenance result.

### Sparta

- Sparta is test-only and optional.
- Follow the current official beta/hackathon setup guide and pin the exact documented artifact. Do not invent package names, CLI installation commands, or custom connector support.
- Use a Sparta world only when the installed version publicly/documents support for the selected connector or starter.
- The runner reads `WORLDS_TASK_JSON` and per-run `WORLDS_*` variables; never hard-code or persist these values.
- Run with `EVAL_MODE=1`; live Dial and Keewano are forbidden inside evaluation runs.
- Grade persisted state and prohibited side effects. Never report that Sparta verified a RelayPM invariant its world could not observe.
- If unavailable, run local deterministic evals and report `Sparta: SKIPPED`, including the reason.

## Domain and safety invariants

Implement these as code-level guards and tests, not prompt-only instructions.

- Rule-based critical/urgent detection runs before model extraction.
- Model output may raise severity but cannot lower rule-triggered severity.
- `CRITICAL` and `URGENT` requests enter human review and stop normal vendor automation.
- The system never claims a hazard is safe or provides professional diagnosis.
- An outreach approval is scoped to request version, allowed vendor(s), purpose, and expiration.
- A booking approval is scoped to request version, vendor, amount ceiling, time window, permitted disclosure, and expiration.
- Approvals are immutable after decision, single-use, and invalid after any material request/quote change.
- No external action occurs from transcript text alone.
- Vendor-provided terms remain draft until a human approves them.
- No automatic payments, reimbursements, ordering, access-code disclosure, lock changes, or spend beyond the cap.
- Every state transition, approval decision, and external action is auditable.

## State-machine discipline

- Define transitions centrally in `packages/core`; do not assign request status ad hoc.
- Every command checks current state, request version, authorization, and applicable approval.
- Use optimistic concurrency for request updates.
- Consume an approval atomically with the state change it authorizes.
- Use stable internal operation IDs for external effects.
- Store raw provider payloads separately from normalized records.
- Ensure reordered and duplicate webhook events converge on the same final state.

## Privacy and secrets

- Never commit `.env*`, keys, tokens, phone numbers, real addresses, recordings, or unredacted transcripts.
- `.env.example` contains names and placeholders only.
- Encrypt phone numbers, addresses, access notes, message bodies, and transcripts at rest.
- Centralize redaction; tests must fail if sensitive fields cross the log or analytics boundary.
- Use synthetic people, properties, and phone numbers in fixtures.
- Make retention/deletion configurable for raw provider payloads and transcripts.
- Do not print provider responses wholesale in CI.

## Work order

Follow the build plan in `README.md` in order:

1. project, database, state machine, urgency rules, approvals;
2. Dial webhook intake and one allowlisted connectivity smoke test;
3. landlord approvals and contractor quote/booking flow;
4. urgent routing and audit timeline;
5. Keewano outbox and redacted custom events;
6. local evals, then Sparta only within documented connector scope;
7. demo polish.

For the hackathon, do not spend time on rent, accounting, screening, marketplace discovery, or multi-tenant administration. After the demo is stable, implement the README's P6 roadmap as isolated vertical slices; do not weaken maintenance tests or safety gates to add breadth.

## Verification requirements

For every change, run the smallest relevant test first, then the full gate before handoff:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:eval
```

When the repo has not yet been scaffolded, create these scripts as part of P0. Tests must use fake providers by default.

Minimum scenarios:

- duplicate/reordered Dial webhooks;
- call transcript arriving after or before call completion handling;
- critical rule cannot be downgraded;
- no vendor call without outreach approval;
- no appointment without booking approval;
- expired, denied, consumed, or version-mismatched approval;
- quote changes after approval;
- ambiguous provider timeout enters reconciliation, not retry;
- Keewano disabled, timeout, auth failure, and poison event;
- analytics/log redaction;
- Sparta unavailable and unsupported connector reporting.

Never mark a safety test skipped in the default suite. Sponsor-specific tests may skip with an explicit reason.

## Official documentation discipline

Before adding or modifying a sponsor call:

1. open the current official documentation linked from `README.md`;
2. verify runtime, package, auth, method, field, event, and retry semantics;
3. prefer the official SDK example over memory or a third-party post;
4. add/update a contract test and a redacted fixture;
5. update the `README.md` verification date if the contract changed.

If the docs do not establish a call, leave a named adapter TODO and keep a working fallback. Never fabricate SDK/API calls.

## Completion standard

A task is complete only when behavior is implemented, migrations/fixtures are included, relevant tests pass, failure behavior is visible, and documentation matches the actual integration status. Report live, simulated, disabled, degraded, and skipped states precisely.

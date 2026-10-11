import { afterEach, describe, expect, it } from "vitest";
import { customEventSet } from "./generated/keewano-events.generated.js";
import { KeewanoOutbox, stableKeewanoUserId, type AnalyticsDomainEvent, type AnalyticsOutboxStore } from "./index.js";

const originalEnabled = process.env.KEEWANO_ENABLED;

afterEach(() => {
  if (originalEnabled === undefined) delete process.env.KEEWANO_ENABLED;
  else process.env.KEEWANO_ENABLED = originalEnabled;
});

describe("Keewano timeline boundary", () => {
  it("uses a stable UUID identity per maintenance request and generated custom events", () => {
    const first = stableKeewanoUserId("req_demo_leak");
    expect(first).toBe(stableKeewanoUserId("req_demo_leak"));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(customEventSet.eventCount).toBe(12);
    expect(customEventSet.events?.[0]?.id).toBe(2500);
  });

  it("delivers the local outbox without blocking on the provider", async () => {
    process.env.KEEWANO_ENABLED = "true";
    const events: AnalyticsDomainEvent[] = [
      { id: "1", aggregateId: "req_demo_leak", eventName: "maintenance_requested", payload: { channel: "SMS", category: "Plumbing" }, createdAt: new Date().toISOString(), attempts: 0 },
      { id: "2", aggregateId: "req_demo_leak", eventName: "urgency_classified", payload: { severity: "ROUTINE" }, createdAt: new Date().toISOString(), attempts: 0 },
      { id: "3", aggregateId: "req_demo_leak", eventName: "approval_requested", payload: { purpose: "VENDOR_OUTREACH" }, createdAt: new Date().toISOString(), attempts: 0 },
    ];
    const store = fakeStore(events);
    const delivered: string[] = [];
    const fakeTimeline = {
      report: async (event: { id: string }) => { delivered.push(event.id); },
      shutdown: async () => {},
    };
    const outbox = new KeewanoOutbox(store, fakeTimeline as never);
    await outbox.drainOnce();
    expect(delivered).toHaveLength(3);
    expect(store.pendingAnalyticsEvents()).toHaveLength(0);
  });

  it("keeps a failed event pending for retry and records the failure", async () => {
    process.env.KEEWANO_ENABLED = "true";
    const events: AnalyticsDomainEvent[] = [
      { id: "1", aggregateId: "req_demo_leak", eventName: "maintenance_requested", payload: { channel: "SMS", category: "Plumbing" }, createdAt: new Date().toISOString(), attempts: 0 },
    ];
    const store = fakeStore(events);
    const fakeTimeline = {
      report: async () => { throw new Error("temporary network failure"); },
      shutdown: async () => {},
    };
    const outbox = new KeewanoOutbox(store, fakeTimeline as never);
    await outbox.drainOnce();
    expect(events[0]?.attempts).toBe(1);
    expect(events[0]?.payload.error).toContain("temporary network failure");
  });
});

function fakeStore(events: AnalyticsDomainEvent[]): AnalyticsOutboxStore {
  return {
    pendingAnalyticsEvents: () => events.filter((event) => event.payload.status !== "DELIVERED"),
    markAnalyticsDelivered: (id) => { const event = events.find((item) => item.id === id); if (event) event.payload.status = "DELIVERED"; },
    markAnalyticsFailed: (id, error) => { const event = events.find((item) => item.id === id); if (event) { event.attempts += 1; event.payload.error = error; } },
  };
}

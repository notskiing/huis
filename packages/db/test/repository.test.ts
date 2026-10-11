import { describe, expect, it } from "vitest";
import { decrypt, encrypt, RelayRepository } from "../src/index.js";

describe("encrypted repository",()=>{
  it("round-trips encrypted fields without plaintext at rest",()=>{
    const plain="+14155550123"; const cipher=encrypt(plain);
    expect(cipher).not.toContain(plain); expect(decrypt(cipher)).toBe(plain);
  });
  it("seeds one focused maintenance workflow",()=>{
    const repo=new RelayRepository(); repo.resetDemo(new Date("2026-10-11T16:00:00Z"));
    const dashboard=repo.dashboard() as any;
    expect(dashboard.requests).toHaveLength(1); expect(dashboard.vendors).toHaveLength(2);
    expect(dashboard.requests[0].approvals[0].status).toBe("PENDING");
    repo.close();
  });
  it("deduplicates provider webhook events",()=>{
    const repo=new RelayRepository();
    expect(repo.insertWebhook("evt_1","message.received","{}")).toBe(true);
    expect(repo.insertWebhook("evt_1","message.received","{}")).toBe(false);
    repo.close();
  });
  it("records a property status snapshot for the Keewano outbox",()=>{
    const repo=new RelayRepository(); repo.resetDemo(new Date("2026-10-11T16:00:00Z"));
    repo.recordPropertyStatusSnapshot("property_demo", "2026-10-11T16:05:00Z");
    const dashboard=repo.dashboard() as any;
    expect(dashboard.propertyStatus).toMatchObject({ statusKey:"approval_due", statusLabel:"Landlord approval needed", openRequests:1, approvalsDue:1, updatedAt:"2026-10-11T16:05:00Z" });
    const event=repo.db.prepare("SELECT aggregate_type, event_name FROM domain_events WHERE aggregate_type='Property'").get() as any;
    expect(event).toEqual({aggregate_type:"Property", event_name:"property_status_snapshot"});
    repo.close();
  });
});

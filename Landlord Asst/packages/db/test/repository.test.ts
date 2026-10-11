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
});

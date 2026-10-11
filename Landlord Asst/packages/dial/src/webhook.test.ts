import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyDialWebhook } from "./webhook.js";

describe("Dial webhook verification",()=>{
  it("accepts exact fresh raw bytes",()=>{
    const body='{"type":"message.received"}'; const t=1_760_000_000; const secret="whsec_test";
    const digest=createHmac("sha256",secret).update(`${t}.${body}`).digest("hex");
    expect(verifyDialWebhook(secret,`t=${t},v1=${digest}`,body,t+10)).toBe(true);
    expect(verifyDialWebhook(secret,`t=${t},v1=${digest}`,body+" ",t+10)).toBe(false);
  });
  it("rejects stale deliveries",()=>{
    const body="{}"; const t=1_760_000_000; const secret="whsec_test";
    const digest=createHmac("sha256",secret).update(`${t}.${body}`).digest("hex");
    expect(verifyDialWebhook(secret,`t=${t},v1=${digest}`,body,t+301)).toBe(false);
  });
});

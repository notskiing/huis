import { describe, expect, it } from "vitest";
import { assertAnalyticsSafe, classifyUrgency, redact } from "@relaypm/core";
import { spartaStatus } from "../src/index.js";

describe("deterministic safety evaluations",()=>{
  it.each(["gas smell","fire in kitchen","sparking live wire"])("routes %s to critical review",(text)=>expect(classifyUrgency(text).severity).toBe("CRITICAL"));
  it("blocks PII at the analytics boundary",()=>expect(()=>assertAnalyticsSafe({severity:"ROUTINE",phone:"+14155550123"})).toThrow(/forbidden/));
  it("redacts logs",()=>expect(JSON.stringify(redact({phone:"+14155550123",message:"call +14155550124"}))).not.toContain("1415555"));
  it("reports Sparta honestly",()=>expect(spartaStatus).toMatch(/SKIPPED|CONFIGURED/));
});

import { describe, expect, it } from "vitest";
import { approve, classifyUrgency, consumeApproval, createApproval, highestSeverity, transitionRequest, type MaintenanceRequest } from "../src/index.js";

function request(overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
  return { id:"req",propertyId:"p",unitId:"u",reporterPersonId:"t",source:"SMS",category:"Plumbing",severity:"ROUTINE",summary:"Drip",status:"AWAITING_OUTREACH_APPROVAL",ruleFlags:[],humanOverride:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1,...overrides };
}

describe("rule-first urgency",()=>{
  it.each([
    ["I smell gas by the stove","CRITICAL"],["Smoke is filling the bedroom","CRITICAL"],["There is a sparking live wire","CRITICAL"],["A burst pipe is flooding the hall","URGENT"],["The faucet drips","ROUTINE"],
  ])("classifies %s as %s",(text,severity)=>expect(classifyUrgency(text).severity).toBe(severity));
  it("cannot be lowered by model output",()=>expect(highestSeverity("CRITICAL","ROUTINE")).toBe("CRITICAL"));
});

describe("state machine",()=>{
  it("rejects invalid transitions",()=>expect(()=>transitionRequest(request(),"SCHEDULED",1)).toThrow(/Cannot transition/));
  it("enforces optimistic concurrency",()=>expect(()=>transitionRequest(request(),"SOURCING",0)).toThrow(/changed/));
  it("blocks urgent vendor automation",()=>expect(()=>transitionRequest(request({severity:"URGENT"}),"SOURCING",1)).toThrow(/Urgent/));
});

describe("approval policy",()=>{
  it("is single-use and version-scoped",()=>{
    const item=request(); const pending=createApproval({id:"a",request:item,requestedFromPersonId:"l",kind:"VENDOR_OUTREACH",scope:{vendorIds:["v"]},expiresAt:new Date(Date.now()+60_000)});
    const consumed=consumeApproval(approve(pending),item,"VENDOR_OUTREACH");
    expect(consumed.status).toBe("CONSUMED");
    expect(()=>consumeApproval(consumed,item,"VENDOR_OUTREACH")).toThrow(/not available/);
    expect(()=>consumeApproval(approve(pending),{...item,version:2},"VENDOR_OUTREACH")).toThrow(/older request version/);
  });
  it("rejects expired approvals",()=>{
    const pending={...createApproval({id:"a",request:request(),requestedFromPersonId:"l",kind:"BOOKING",scope:{},expiresAt:new Date(Date.now()+60_000)}),expiresAt:new Date(Date.now()-1).toISOString()};
    expect(()=>approve(pending)).toThrow(/expired/);
  });
});

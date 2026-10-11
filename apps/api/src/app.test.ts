import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { RelayRepository } from "@relaypm/db";
import { createApp } from "./app.js";

const originalWebhookSecret=process.env.DIAL_WEBHOOK_SECRET;
afterEach(()=>{if(originalWebhookSecret===undefined)delete process.env.DIAL_WEBHOOK_SECRET;else process.env.DIAL_WEBHOOK_SECRET=originalWebhookSecret});

describe("Huis API workflow",()=>{
  it("requires both approval gates",async()=>{
    const repo=new RelayRepository(); repo.resetDemo(); const {app}=createApp(repo);
    const initial=repo.dashboard() as any; const item=initial.requests[0]; const outreach=item.approvals[0];
    const first=await app.inject({method:"POST",url:`/api/requests/${item.id}/approve-outreach`,payload:{approvalId:outreach.id}});
    expect(first.statusCode).toBe(200); expect((repo.getRequest(item.id))?.status).toBe("SOURCING");
    const quote=await app.inject({method:"POST",url:`/api/requests/${item.id}/simulate-quote`,payload:{}});
    expect(quote.statusCode).toBe(200); expect((repo.getRequest(item.id))?.status).toBe("AWAITING_BOOKING_APPROVAL");
    const after=repo.dashboard() as any; const booking=after.requests[0].approvals.find((a:any)=>a.kind==="BOOKING");
    const final=await app.inject({method:"POST",url:`/api/requests/${item.id}/approve-booking`,payload:{approvalId:booking.id}});
    expect(final.statusCode).toBe(200); expect((repo.getRequest(item.id))?.status).toBe("SCHEDULED");
    await app.close(); repo.close();
  });
  it("stops critical intake before vendor automation",async()=>{
    const repo=new RelayRepository(); repo.resetDemo(); const {app}=createApp(repo);
    const response=await app.inject({method:"POST",url:"/api/demo/intake",payload:{scenario:"critical"}});
    expect(response.statusCode).toBe(201);
    const critical=(repo.dashboard() as any).requests.find((r:any)=>r.severity==="CRITICAL");
    expect(critical.status).toBe("HUMAN_REVIEW"); expect(critical.quotes).toHaveLength(0); expect(critical.approvals).toHaveLength(0);
    await app.close(); repo.close();
  });
  it("creates one maintenance request from a verified inbound Dial text",async()=>{
    process.env.DIAL_WEBHOOK_SECRET="whsec_test";
    const repo=new RelayRepository(); repo.resetDemo(); const {app}=createApp(repo);
    const timestamp=Math.floor(Date.now()/1000); const raw=JSON.stringify({id:"evt_dial_sms_1",type:"message.received",createdAt:new Date().toISOString(),data:{messageId:"msg_dial_1",from:"+17074956852",to:"+17070000000",channel:"sms",body:"My pipe burst and water is spraying under the sink.",media:[],source:"external"}});
    const signature=`t=${timestamp},v1=${createHmac("sha256",process.env.DIAL_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest("hex")}`;
    const response=await app.inject({method:"POST",url:"/webhooks/dial",headers:{"content-type":"application/json","x-dial-signature":signature,"x-dial-event-id":"evt_dial_sms_1","x-dial-event-type":"message.received"},payload:raw});
    expect(response.statusCode, response.body).toBe(202);
    const ticket=(repo.dashboard() as any).requests.find((request:any)=>request.interactions.some((interaction:any)=>interaction.provider==="DIAL"));
    expect(ticket).toMatchObject({source:"SMS",category:"Plumbing",severity:"URGENT",status:"HUMAN_REVIEW"});
    const duplicate=await app.inject({method:"POST",url:"/webhooks/dial",headers:{"content-type":"application/json","x-dial-signature":signature,"x-dial-event-id":"evt_dial_sms_1","x-dial-event-type":"message.received"},payload:raw});
    expect(duplicate.json()).toMatchObject({duplicate:true});
    await app.close(); repo.close();
  });
});

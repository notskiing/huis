import { describe, expect, it } from "vitest";
import { RelayRepository } from "@relaypm/db";
import { createApp } from "./app.js";
describe("RelayPM API workflow", () => {
    it("requires both approval gates", async () => {
        const repo = new RelayRepository();
        repo.resetDemo();
        const { app } = createApp(repo);
        const initial = repo.dashboard();
        const item = initial.requests[0];
        const outreach = item.approvals[0];
        const first = await app.inject({ method: "POST", url: `/api/requests/${item.id}/approve-outreach`, payload: { approvalId: outreach.id } });
        expect(first.statusCode).toBe(200);
        expect((repo.getRequest(item.id))?.status).toBe("SOURCING");
        const quote = await app.inject({ method: "POST", url: `/api/requests/${item.id}/simulate-quote`, payload: {} });
        expect(quote.statusCode).toBe(200);
        expect((repo.getRequest(item.id))?.status).toBe("AWAITING_BOOKING_APPROVAL");
        const after = repo.dashboard();
        const booking = after.requests[0].approvals.find((a) => a.kind === "BOOKING");
        const final = await app.inject({ method: "POST", url: `/api/requests/${item.id}/approve-booking`, payload: { approvalId: booking.id } });
        expect(final.statusCode).toBe(200);
        expect((repo.getRequest(item.id))?.status).toBe("SCHEDULED");
        await app.close();
        repo.close();
    });
    it("stops critical intake before vendor automation", async () => {
        const repo = new RelayRepository();
        repo.resetDemo();
        const { app } = createApp(repo);
        const response = await app.inject({ method: "POST", url: "/api/demo/intake", payload: { scenario: "critical" } });
        expect(response.statusCode).toBe(201);
        const critical = repo.dashboard().requests.find((r) => r.severity === "CRITICAL");
        expect(critical.status).toBe("HUMAN_REVIEW");
        expect(critical.quotes).toHaveLength(0);
        expect(critical.approvals).toHaveLength(0);
        await app.close();
        repo.close();
    });
});
//# sourceMappingURL=app.test.js.map
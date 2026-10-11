import { describe, expect, it } from "vitest";
import { AgentPlanner } from "./index.js";

describe("Huis agent planner", () => {
  it("uses safe deterministic routing without an API key", async () => {
    const plan = await new AgentPlanner("", "gpt-6-luna").plan({
      category: "Gas / life safety", severity: "CRITICAL", status: "HUMAN_REVIEW", source: "VOICE", ruleFlags: ["GAS_ODOR"],
    });
    expect(plan.status).toBe("disabled");
    expect(plan.source).toBe("deterministic");
    expect(plan.agents).toContain("human_escalation");
  });
});

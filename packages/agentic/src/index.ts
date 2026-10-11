export type AgentContext = {
  category: string;
  severity: "ROUTINE" | "URGENT" | "CRITICAL";
  status: string;
  source: string;
  ruleFlags: string[];
};

export type AgentPlan = {
  source: "deterministic" | "openai";
  model: string | null;
  status: "disabled" | "ready" | "fallback";
  agents: Array<"safety" | "intake" | "vendor_outreach" | "landlord_approval" | "timeline" | "human_escalation">;
  explanation: string;
  guardrails: string[];
};

const guardrails = [
  "Critical and urgent issues stay with a human.",
  "The planner cannot place calls, send messages, book work, or approve spending.",
  "Kewano remains the event timeline; local audit is the fallback.",
];

function deterministic(context: AgentContext): AgentPlan {
  const agents: AgentPlan["agents"] = ["intake", "timeline"];
  if (context.severity === "CRITICAL" || context.severity === "URGENT" || context.ruleFlags.length) {
    agents.unshift("safety", "human_escalation");
  } else {
    agents.push("vendor_outreach", "landlord_approval");
  }
  return {
    source: "deterministic", model: null, status: "disabled", agents,
    explanation: context.severity === "ROUTINE"
      ? "Routine maintenance can be prepared for vendor outreach after the landlord approves it."
      : "This request needs a human safety review before any outreach or booking.",
    guardrails,
  };
}

function validAgents(value: unknown): AgentPlan["agents"] | null {
  if (!Array.isArray(value)) return null;
  const allowed = new Set<AgentPlan["agents"][number]>(["safety", "intake", "vendor_outreach", "landlord_approval", "timeline", "human_escalation"]);
  const agents = value.filter((item): item is AgentPlan["agents"][number] => typeof item === "string" && allowed.has(item as AgentPlan["agents"][number]));
  return agents.length ? agents : null;
}

export class AgentPlanner {
  readonly enabled: boolean;
  readonly model: string;
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY ?? "", model = process.env.OPENAI_MODEL ?? "gpt-6-luna") {
    this.enabled = process.env.OPENAI_AGENT_ENABLED === "true" && Boolean(this.apiKey);
    this.model = model;
  }

  async plan(context: AgentContext): Promise<AgentPlan> {
    const fallback = deterministic(context);
    if (!this.enabled) return fallback;
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          input: [
            { role: "system", content: "You route maintenance work for Huis. Recommend roles only. Never lower urgency, skip a human safety review, contact people, book work, or authorize spending." },
            { role: "user", content: JSON.stringify({ request: context, roles: ["safety", "intake", "vendor_outreach", "landlord_approval", "timeline", "human_escalation"] }) },
          ],
          text: { format: { type: "json_schema", name: "huis_agent_plan", strict: true, schema: {
            type: "object", additionalProperties: false,
            properties: { agents: { type: "array", items: { type: "string", enum: ["safety", "intake", "vendor_outreach", "landlord_approval", "timeline", "human_escalation"] } }, explanation: { type: "string" } },
            required: ["agents", "explanation"],
          } } },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`OpenAI responded ${response.status}`);
      const body = await response.json() as { output_text?: string };
      const parsed = JSON.parse(body.output_text ?? "{}");
      const agents = validAgents(parsed.agents);
      if (!agents || typeof parsed.explanation !== "string") throw new Error("Invalid planner output");
      const safeAgents = (context.severity === "CRITICAL" || context.severity === "URGENT" || context.ruleFlags.length)
        ? Array.from(new Set<AgentPlan["agents"][number]>(["safety", "human_escalation", "timeline", ...agents]))
        : agents;
      return { source: "openai", model: this.model, status: "ready", agents: safeAgents, explanation: parsed.explanation.slice(0, 500), guardrails };
    } catch {
      return { ...fallback, status: "fallback", model: this.model };
    }
  }
}

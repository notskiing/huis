function responseOutputText(body) {
    if (typeof body.output_text === "string")
        return body.output_text;
    if (!Array.isArray(body.output))
        return "";
    for (const item of body.output) {
        if (!item || typeof item !== "object" || !Array.isArray(item.content))
            continue;
        for (const content of item.content) {
            if (content && typeof content === "object" && typeof content.text === "string") {
                return content.text;
            }
        }
    }
    return "";
}
function deterministicIntake(text, properties, matchedProperty) {
    const category = /pipe|plumb|leak|drain|water|sink|toilet/i.test(text) ? "Plumbing" : /electric|power|outlet|light|breaker|heat(?:ing|er)?|thermostat|furnace|boiler|hvac/i.test(text) ? "Electrical" : "Maintenance";
    const urgency = /gas smell|fire|flames|smoke|sparking|live wire|burst pipe|pipe burst|flooding|uncontrolled water|water pouring/i.test(text) ? (/(gas smell|fire|flames|smoke|sparking|live wire)/i.test(text) ? "CRITICAL" : "URGENT") : "ROUTINE";
    const mentionedProperty = properties.find((candidate) => new RegExp(`\\b${candidate.name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(text));
    const property = mentionedProperty ?? matchedProperty ?? null;
    const summary = text.trim().replace(/\s+/g, " ").slice(0, 500);
    return { propertyId: property?.id ?? null, propertyName: property?.name ?? null, summary, category, urgency, confirmation: `We received “${summary}”${property ? ` for ${property.name}` : ""}. Your Huis maintenance request is now active.`, source: "deterministic", model: null };
}
export class IntakeInference {
    apiKey;
    enabled;
    model;
    constructor(apiKey = process.env.OPENAI_API_KEY ?? "", model = process.env.OPENAI_MODEL ?? "gpt-6-luna") {
        this.apiKey = apiKey;
        this.enabled = Boolean(this.apiKey) && process.env.OPENAI_INTAKE_ENABLED !== "false";
        this.model = model;
    }
    async classify(text, properties, matchedProperty) {
        const fallback = deterministicIntake(text, properties, matchedProperty);
        if (!this.enabled)
            return fallback;
        try {
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
                body: JSON.stringify({ model: this.model, input: [
                        { role: "system", content: "Read a tenant maintenance message for Huis. Select only a property from the supplied list. Do not invent a property. Preserve the tenant's meaning. Urgent or critical issues must never be downgraded." },
                        { role: "user", content: JSON.stringify({ message: text, properties, phoneMatchedProperty: matchedProperty }) },
                    ], text: { format: { type: "json_schema", name: "huis_intake", strict: true, schema: {
                                type: "object", additionalProperties: false,
                                properties: { propertyId: { anyOf: [{ type: "string" }, { type: "null" }] }, propertyName: { anyOf: [{ type: "string" }, { type: "null" }] }, summary: { type: "string" }, category: { type: "string", enum: ["Plumbing", "Electrical", "Maintenance"] }, urgency: { type: "string", enum: ["ROUTINE", "URGENT", "CRITICAL"] }, confirmation: { type: "string" } },
                                required: ["propertyId", "propertyName", "summary", "category", "urgency", "confirmation"],
                            } } } }),
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok)
                throw new Error(`OpenAI responded ${response.status}`);
            const body = await response.json();
            const parsed = JSON.parse(responseOutputText(body) || "{}");
            const validProperty = properties.find((property) => property.id === parsed.propertyId);
            if (!validProperty || typeof parsed.summary !== "string" || typeof parsed.confirmation !== "string" || !["Plumbing", "Electrical", "Maintenance"].includes(String(parsed.category)) || !["ROUTINE", "URGENT", "CRITICAL"].includes(String(parsed.urgency)))
                throw new Error("Invalid intake output");
            const mentionedProperty = properties.find((property) => new RegExp(`\\b${property.name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(text));
            const selectedProperty = mentionedProperty ?? matchedProperty ?? validProperty;
            const severity = ["CRITICAL", "URGENT"].includes(fallback.urgency) ? fallback.urgency : parsed.urgency;
            return { propertyId: selectedProperty.id, propertyName: selectedProperty.name, summary: parsed.summary.slice(0, 500), category: String(parsed.category), urgency: severity, confirmation: parsed.confirmation.slice(0, 600), source: "openai", model: this.model };
        }
        catch {
            return fallback;
        }
    }
}
const guardrails = [
    "Critical and urgent issues get a safety step before vendor action.",
    "The planner cannot place calls, send messages, book work, or approve spending.",
    "Kewano remains the event timeline; local audit is the fallback.",
];
function deterministic(context) {
    const agents = ["intake", "timeline"];
    if (context.severity === "CRITICAL" || context.severity === "URGENT" || context.ruleFlags.length) {
        agents.unshift("safety", "human_escalation");
        agents.push("vendor_outreach", "landlord_approval");
    }
    else {
        agents.push("vendor_outreach", "landlord_approval");
    }
    return {
        source: "deterministic", model: null, status: "disabled", agents,
        explanation: context.severity === "ROUTINE"
            ? "Routine maintenance can be prepared for vendor outreach after the landlord approves it."
            : "This request has a safety step first, with a clear action for the landlord before vendor work.",
        guardrails,
    };
}
function validAgents(value) {
    if (!Array.isArray(value))
        return null;
    const allowed = new Set(["safety", "intake", "vendor_outreach", "landlord_approval", "timeline", "human_escalation"]);
    const agents = value.filter((item) => typeof item === "string" && allowed.has(item));
    return agents.length ? agents : null;
}
export class AgentPlanner {
    apiKey;
    enabled;
    model;
    constructor(apiKey = process.env.OPENAI_API_KEY ?? "", model = process.env.OPENAI_MODEL ?? "gpt-6-luna") {
        this.apiKey = apiKey;
        this.enabled = process.env.OPENAI_AGENT_ENABLED === "true" && Boolean(this.apiKey);
        this.model = model;
    }
    async plan(context) {
        const fallback = deterministic(context);
        if (!this.enabled)
            return fallback;
        try {
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
                body: JSON.stringify({
                    model: this.model,
                    input: [
                        { role: "system", content: "You route maintenance work for Huis. Recommend roles only. Never lower urgency or skip the safety step. Do not contact people, book work, or authorize spending." },
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
            if (!response.ok)
                throw new Error(`OpenAI responded ${response.status}`);
            const body = await response.json();
            const parsed = JSON.parse(responseOutputText(body) || "{}");
            const agents = validAgents(parsed.agents);
            if (!agents || typeof parsed.explanation !== "string")
                throw new Error("Invalid planner output");
            const safeAgents = (context.severity === "CRITICAL" || context.severity === "URGENT" || context.ruleFlags.length)
                ? Array.from(new Set(["safety", "human_escalation", "timeline", ...agents]))
                : agents;
            return { source: "openai", model: this.model, status: "ready", agents: safeAgents, explanation: parsed.explanation.slice(0, 500), guardrails };
        }
        catch {
            return { ...fallback, status: "fallback", model: this.model };
        }
    }
}
//# sourceMappingURL=index.js.map
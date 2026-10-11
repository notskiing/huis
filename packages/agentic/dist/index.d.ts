export type AgentContext = {
    category: string;
    severity: "ROUTINE" | "URGENT" | "CRITICAL";
    status: string;
    source: string;
    ruleFlags: string[];
};
export type IntakeProperty = {
    id: string;
    name: string;
};
export type IntakeResult = {
    propertyId: string | null;
    propertyName: string | null;
    summary: string;
    category: string;
    urgency: "ROUTINE" | "URGENT" | "CRITICAL";
    confirmation: string;
    source: "deterministic" | "openai";
    model: string | null;
};
export declare class IntakeInference {
    private readonly apiKey;
    readonly enabled: boolean;
    readonly model: string;
    constructor(apiKey?: string, model?: string);
    classify(text: string, properties: IntakeProperty[], matchedProperty: IntakeProperty | null): Promise<IntakeResult>;
}
export type AgentPlan = {
    source: "deterministic" | "openai";
    model: string | null;
    status: "disabled" | "ready" | "fallback";
    agents: Array<"safety" | "intake" | "vendor_outreach" | "landlord_approval" | "timeline" | "human_escalation">;
    explanation: string;
    guardrails: string[];
};
export declare class AgentPlanner {
    private readonly apiKey;
    readonly enabled: boolean;
    readonly model: string;
    constructor(apiKey?: string, model?: string);
    plan(context: AgentContext): Promise<AgentPlan>;
}

const criticalRules = [
    [/\b(gas smell|smell(?:s)? (?:like )?gas|carbon monoxide)\b/i, "GAS_OR_CO"],
    [/\b(fire|flames|smoke(?: is)? filling|smoke alarm)\b/i, "FIRE_OR_SMOKE"],
    [/\b(sparking|live wire|electrocut)/i, "ELECTRICAL_HAZARD"],
    [/\b(break[- ]?in|intruder|collapsed? ceiling|collapse risk)\b/i, "IMMEDIATE_DANGER"],
];
const urgentRules = [
    [/\b(flooding|uncontrolled water|burst pipe|water (?:is )?pouring)\b/i, "ACTIVE_WATER"],
    [/\b(sewage|sewer backup|raw sewage)\b/i, "SEWAGE"],
    [/\b(no heat|heater (?:is )?out)\b/i, "NO_HEAT"],
    [/\b(door (?:will not|won't|cannot) (?:lock|secure))\b/i, "UNSECURED_ENTRY"],
];
const rank = { ROUTINE: 0, URGENT: 1, CRITICAL: 2 };
export function classifyUrgency(text) {
    const critical = criticalRules.filter(([rule]) => rule.test(text)).map(([, flag]) => flag);
    if (critical.length)
        return { severity: "CRITICAL", flags: critical };
    const urgent = urgentRules.filter(([rule]) => rule.test(text)).map(([, flag]) => flag);
    if (urgent.length)
        return { severity: "URGENT", flags: urgent };
    return { severity: "ROUTINE", flags: [] };
}
export function highestSeverity(...values) {
    return values.filter((value) => Boolean(value)).reduce((highest, current) => (rank[current] > rank[highest] ? current : highest), "ROUTINE");
}
//# sourceMappingURL=urgency.js.map
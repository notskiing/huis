const sensitiveKeys = /(?:phone|address|access|transcript|body|secret|token|api.?key)/i;
const phonePattern = /\+?\d[\d\s().-]{7,}\d/g;

export function redact(value: unknown): unknown {
  if (typeof value === "string") return value.replace(phonePattern, "[REDACTED_PHONE]");
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, sensitiveKeys.test(key) ? "[REDACTED]" : redact(child)]),
    );
  }
  return value;
}

export function assertAnalyticsSafe(payload: Record<string, unknown>): void {
  const forbidden = Object.keys(payload).filter((key) => sensitiveKeys.test(key));
  if (forbidden.length) throw new Error(`Analytics payload includes forbidden fields: ${forbidden.join(", ")}`);
}

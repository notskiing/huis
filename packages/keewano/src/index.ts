import { assertAnalyticsSafe } from "@relaypm/core";

export type AnalyticsDelivery = "SKIPPED_DISABLED" | "PENDING";

export function queueAnalytics(payload: Record<string, unknown>): AnalyticsDelivery {
  assertAnalyticsSafe(payload);
  return process.env.KEEWANO_ENABLED === "true" ? "PENDING" : "SKIPPED_DISABLED";
}

// Keewano custom-event calls are intentionally not guessed here. Once official
// codegen output is supplied, this boundary can deliver the durable outbox.

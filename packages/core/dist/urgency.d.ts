import type { Severity } from "./types.js";
export declare function classifyUrgency(text: string): {
    severity: Severity;
    flags: string[];
};
export declare function highestSeverity(...values: Array<Severity | null | undefined>): Severity;

import type { MaintenanceRequest, RequestStatus } from "./types.js";
export declare class DomainRuleError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare function transitionRequest(request: MaintenanceRequest, next: RequestStatus, expectedVersion: number, now?: Date): MaintenanceRequest;

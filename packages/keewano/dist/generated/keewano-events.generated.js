import { Keewano } from '@keewano/node-sdk';
export function reportMaintenanceRequested(userId, value) { Keewano.reportCustomEvent({ userId, name: 'MaintenanceRequested', value }); }
export function reportUrgencyClassified(userId, value) { Keewano.reportCustomEvent({ userId, name: 'UrgencyClassified', value }); }
export function reportUrgentIssueRouted(userId, value) { Keewano.reportCustomEvent({ userId, name: 'UrgentIssueRouted', value }); }
export function reportApprovalRequested(userId, value) { Keewano.reportCustomEvent({ userId, name: 'ApprovalRequested', value }); }
export function reportApprovalDecided(userId, value) { Keewano.reportCustomEvent({ userId, name: 'ApprovalDecided', value }); }
export function reportVendorOutreachStarted(userId, value) { Keewano.reportCustomEvent({ userId, name: 'VendorOutreachStarted', value }); }
export function reportVendorCallCompleted(userId, value) { Keewano.reportCustomEvent({ userId, name: 'VendorCallCompleted', value }); }
export function reportQuoteCaptured(userId, value) { Keewano.reportCustomEvent({ userId, name: 'QuoteCaptured', value }); }
export function reportAppointmentConfirmed(userId, value) { Keewano.reportCustomEvent({ userId, name: 'AppointmentConfirmed', value }); }
export function reportRequestResolved(userId, value) { Keewano.reportCustomEvent({ userId, name: 'RequestResolved', value }); }
export function reportIntegrationFallbackActivated(userId, value) { Keewano.reportCustomEvent({ userId, name: 'IntegrationFallbackActivated', value }); }
export function batchReportMaintenanceRequested(reporter, value) { reporter.reportCustomEvent({ name: 'MaintenanceRequested', value }); }
export function batchReportUrgencyClassified(reporter, value) { reporter.reportCustomEvent({ name: 'UrgencyClassified', value }); }
export function batchReportUrgentIssueRouted(reporter, value) { reporter.reportCustomEvent({ name: 'UrgentIssueRouted', value }); }
export function batchReportApprovalRequested(reporter, value) { reporter.reportCustomEvent({ name: 'ApprovalRequested', value }); }
export function batchReportApprovalDecided(reporter, value) { reporter.reportCustomEvent({ name: 'ApprovalDecided', value }); }
export function batchReportVendorOutreachStarted(reporter, value) { reporter.reportCustomEvent({ name: 'VendorOutreachStarted', value }); }
export function batchReportVendorCallCompleted(reporter, value) { reporter.reportCustomEvent({ name: 'VendorCallCompleted', value }); }
export function batchReportQuoteCaptured(reporter, value) { reporter.reportCustomEvent({ name: 'QuoteCaptured', value }); }
export function batchReportAppointmentConfirmed(reporter, value) { reporter.reportCustomEvent({ name: 'AppointmentConfirmed', value }); }
export function batchReportRequestResolved(reporter, value) { reporter.reportCustomEvent({ name: 'RequestResolved', value }); }
export function batchReportIntegrationFallbackActivated(reporter, value) { reporter.reportCustomEvent({ name: 'IntegrationFallbackActivated', value }); }
export const customEventSet = {
    version: 0xB98E5EDE,
    eventCount: 11,
    gzipData: new Uint8Array([0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x4D, 0x8F, 0xCB, 0x6E, 0x02, 0x31, 0x0C, 0x45, 0xE9, 0xD2, 0x0B, 0x84, 0x10, 0x74, 0xC7, 0xCF, 0xA0, 0x54, 0x95, 0x58, 0xA0, 0xAA, 0x83, 0x60, 0x6F, 0x32, 0x06, 0x22, 0x32, 0xF1, 0x34, 0x71, 0x46, 0xE2, 0xFF, 0xA0, 0x2D, 0xAF, 0x7E, 0x53, 0x93, 0x01, 0x24, 0xB6, 0xE7, 0x5E, 0x1D, 0x5F, 0xEF, 0x61, 0x38, 0x45, 0xE3, 0x84, 0x1C, 0x3A, 0x4D, 0x05, 0x7D, 0x45, 0x0A, 0x42, 0xE5, 0x4B, 0xE7, 0x00, 0xFD, 0xB9, 0x5F, 0x93, 0xD3, 0x3B, 0x65, 0x31, 0x04, 0xB3, 0x32, 0x99, 0x7E, 0xDF, 0xA9, 0x4C, 0x42, 0x88, 0x54, 0x70, 0x6C, 0xBB, 0x3F, 0xD0, 0x1F, 0xD7, 0xB5, 0xE7, 0x06, 0xED, 0x93, 0xE1, 0x17, 0x7A, 0x0F, 0xFA, 0x46, 0xDA, 0x94, 0x99, 0x1D, 0xE1, 0x75, 0x41, 0xAE, 0x64, 0xFF, 0x11, 0xC5, 0x13, 0xEA, 0xCD, 0x4C, 0xD0, 0xB7, 0xED, 0x13, 0x0C, 0x6E, 0x89, 0x42, 0x6B, 0x15, 0x57, 0xB5, 0xA5, 0x96, 0x9F, 0xA1, 0xFB, 0x19, 0x59, 0x48, 0x61, 0x2D, 0xD1, 0x67, 0x72, 0x81, 0x61, 0xF2, 0x72, 0x1A, 0x5D, 0xA5, 0x21, 0x8A, 0xDD, 0xCA, 0xF8, 0x2A, 0x07, 0x57, 0xE8, 0xDD, 0xCF, 0x17, 0x14, 0xD8, 0x36, 0x99, 0xFD, 0xC1, 0x68, 0x92, 0xBE, 0x5B, 0x7B, 0x14, 0xC3, 0xEE, 0x3D, 0xB9, 0x97, 0xA8, 0xB7, 0x63, 0x2D, 0xA6, 0xC1, 0xD6, 0xFF, 0x0F, 0x78, 0x78, 0x4B, 0x6E, 0x01, 0x01, 0x00, 0x00]),
    events: [
        { id: 2500, name: 'MaintenanceRequested', type: 1 },
        { id: 2501, name: 'UrgencyClassified', type: 1 },
        { id: 2502, name: 'UrgentIssueRouted', type: 1 },
        { id: 2503, name: 'ApprovalRequested', type: 1 },
        { id: 2504, name: 'ApprovalDecided', type: 1 },
        { id: 2505, name: 'VendorOutreachStarted', type: 1 },
        { id: 2506, name: 'VendorCallCompleted', type: 1 },
        { id: 2507, name: 'QuoteCaptured', type: 1 },
        { id: 2508, name: 'AppointmentConfirmed', type: 1 },
        { id: 2509, name: 'RequestResolved', type: 1 },
        { id: 2510, name: 'IntegrationFallbackActivated', type: 1 },
    ],
};
//# sourceMappingURL=keewano-events.generated.js.map
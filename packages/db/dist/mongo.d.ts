/**
 * Cloud persistence boundary for Huis.
 *
 * The local SQLite repository remains the zero-setup demo store. When a
 * MongoDB URI is provided, this document store is the intended production
 * boundary: each domain record lives in its own collection, with request and
 * approval IDs kept stable for webhook retries and audit joins.
 */
export type HuisCollection = "properties" | "units" | "people" | "vendors" | "requests" | "interactions" | "approvals" | "quotes" | "appointments" | "auditEvents" | "webhookInbox" | "domainEvents" | "externalOperations";
type MongoCollection = {
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
    insertOne(document: Record<string, unknown>): Promise<unknown>;
    findOne(filter: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    find(filter: Record<string, unknown>): {
        sort(sort: Record<string, 1 | -1>): {
            limit(limit: number): {
                toArray(): Promise<Array<Record<string, unknown>>>;
            };
        };
    };
    countDocuments(filter: Record<string, unknown>): Promise<number>;
};
export declare class MongoDocumentStore {
    private client;
    private database;
    readonly uri: string;
    readonly databaseName: string;
    readonly collectionPrefix: string;
    constructor(options: {
        uri: string;
        databaseName: string;
        collectionPrefix?: string;
    });
    get connected(): boolean;
    connect(): Promise<void>;
    close(): Promise<void>;
    collection(name: HuisCollection): MongoCollection;
    upsert(name: HuisCollection, id: string, document: Record<string, unknown>): Promise<void>;
    insert(name: HuisCollection, document: Record<string, unknown>): Promise<void>;
    findOne(name: HuisCollection, filter: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    recent(name: HuisCollection, filter?: Record<string, unknown>, limit?: number): Promise<Array<Record<string, unknown>>>;
    count(name: HuisCollection, filter?: Record<string, unknown>): Promise<number>;
}
export declare function mongoConfigFromEnv(): {
    uri: string;
    databaseName: string;
    collectionPrefix: string;
} | null;
export {};

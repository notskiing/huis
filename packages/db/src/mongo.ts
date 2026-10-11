/**
 * Cloud persistence boundary for Huis.
 *
 * The local SQLite repository remains the zero-setup demo store. When a
 * MongoDB URI is provided, this document store is the intended production
 * boundary: each domain record lives in its own collection, with request and
 * approval IDs kept stable for webhook retries and audit joins.
 */
export type HuisCollection =
  | "properties" | "units" | "people" | "vendors" | "requests" | "interactions"
  | "approvals" | "quotes" | "appointments" | "auditEvents" | "webhookInbox"
  | "domainEvents" | "externalOperations" | "internalDocuments";

export type InternalPropertyDocument = {
  id: string;
  propertyId: string;
  kind: "rent" | "tax" | "utility" | "insurance" | "note";
  title: string;
  amountCents?: number;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  storageKey?: string;
  notes?: string;
};

type MongoCollection = {
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  insertOne(document: Record<string, unknown>): Promise<unknown>;
  findOne(filter: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  find(filter: Record<string, unknown>): { sort(sort: Record<string, 1 | -1>): { limit(limit: number): { toArray(): Promise<Array<Record<string, unknown>>> } } };
  countDocuments(filter: Record<string, unknown>): Promise<number>;
};

type MongoDatabase = { collection(name: string): MongoCollection; command(command: Record<string, unknown>): Promise<unknown> };
type MongoClientLike = { connect(): Promise<void>; db(name: string): MongoDatabase; close(): Promise<void> };

export class MongoDocumentStore {
  private client: MongoClientLike | null = null;
  private database: MongoDatabase | null = null;
  readonly uri: string;
  readonly databaseName: string;
  readonly collectionPrefix: string;

  constructor(options: { uri: string; databaseName: string; collectionPrefix?: string }) {
    this.uri = options.uri;
    this.databaseName = options.databaseName;
    this.collectionPrefix = options.collectionPrefix ?? "huis_";
  }

  get connected(): boolean { return Boolean(this.database); }

  async connect(): Promise<void> {
    if (this.database) return;
    const packageName = "mongodb";
    const { MongoClient } = await import(packageName) as typeof import("./mongodb-driver.js");
    this.client = new MongoClient(this.uri) as unknown as MongoClientLike;
    await this.client.connect();
    this.database = this.client.db(this.databaseName);
    await this.database.command({ ping: 1 });
  }

  async close(): Promise<void> { if (this.client) await this.client.close(); this.client = null; this.database = null; }

  collection(name: HuisCollection): MongoCollection {
    if (!this.database) throw new Error("MongoDB is not connected");
    return this.database.collection(`${this.collectionPrefix}${name}`);
  }

  async upsert(name: HuisCollection, id: string, document: Record<string, unknown>): Promise<void> {
    await this.collection(name).updateOne({ _id: id }, { $set: { ...document, _id: id, updatedAt: new Date().toISOString() } }, { upsert: true });
  }

  async insert(name: HuisCollection, document: Record<string, unknown>): Promise<void> { await this.collection(name).insertOne(document); }
  async findOne(name: HuisCollection, filter: Record<string, unknown>): Promise<Record<string, unknown> | null> { return this.collection(name).findOne(filter); }
  async recent(name: HuisCollection, filter: Record<string, unknown> = {}, limit = 100): Promise<Array<Record<string, unknown>>> { return this.collection(name).find(filter).sort({ createdAt: -1 }).limit(limit).toArray(); }
  async count(name: HuisCollection, filter: Record<string, unknown> = {}): Promise<number> { return this.collection(name).countDocuments(filter); }

  async upsertInternalDocument(document: InternalPropertyDocument): Promise<void> {
    await this.upsert("internalDocuments", document.id, { ...document, class: "internal" });
  }

  async recentInternalDocuments(propertyId: string, limit = 100): Promise<Array<Record<string, unknown>>> {
    return this.recent("internalDocuments", { propertyId }, limit);
  }
}

export function mongoConfigFromEnv(): { uri: string; databaseName: string; collectionPrefix: string } | null {
  if (!process.env.MONGODB_URI) return null;
  return {
    uri: process.env.MONGODB_URI,
    databaseName: process.env.MONGODB_DATABASE ?? "huis",
    collectionPrefix: process.env.MONGODB_COLLECTION_PREFIX ?? "huis_",
  };
}

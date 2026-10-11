export class MongoDocumentStore {
    client = null;
    database = null;
    uri;
    databaseName;
    collectionPrefix;
    constructor(options) {
        this.uri = options.uri;
        this.databaseName = options.databaseName;
        this.collectionPrefix = options.collectionPrefix ?? "huis_";
    }
    get connected() { return Boolean(this.database); }
    async connect() {
        if (this.database)
            return;
        const packageName = "mongodb";
        const { MongoClient } = await import(packageName);
        this.client = new MongoClient(this.uri);
        await this.client.connect();
        this.database = this.client.db(this.databaseName);
        await this.database.command({ ping: 1 });
    }
    async close() { if (this.client)
        await this.client.close(); this.client = null; this.database = null; }
    collection(name) {
        if (!this.database)
            throw new Error("MongoDB is not connected");
        return this.database.collection(`${this.collectionPrefix}${name}`);
    }
    async upsert(name, id, document) {
        await this.collection(name).updateOne({ _id: id }, { $set: { ...document, _id: id, updatedAt: new Date().toISOString() } }, { upsert: true });
    }
    async insert(name, document) { await this.collection(name).insertOne(document); }
    async findOne(name, filter) { return this.collection(name).findOne(filter); }
    async recent(name, filter = {}, limit = 100) { return this.collection(name).find(filter).sort({ createdAt: -1 }).limit(limit).toArray(); }
    async count(name, filter = {}) { return this.collection(name).countDocuments(filter); }
    async upsertInternalDocument(document) {
        await this.upsert("internalDocuments", document.id, { ...document, class: "internal" });
    }
    async recentInternalDocuments(propertyId, limit = 100) {
        return this.recent("internalDocuments", { propertyId }, limit);
    }
}
export function mongoConfigFromEnv() {
    if (!process.env.MONGODB_URI)
        return null;
    return {
        uri: process.env.MONGODB_URI,
        databaseName: process.env.MONGODB_DATABASE ?? "huis",
        collectionPrefix: process.env.MONGODB_COLLECTION_PREFIX ?? "huis_",
    };
}
//# sourceMappingURL=mongo.js.map
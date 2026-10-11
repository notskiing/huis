export class MongoClient {
  constructor(uri: string);
  connect(): Promise<void>;
  db(name: string): unknown;
  close(): Promise<void>;
}

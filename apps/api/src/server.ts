import { config } from "dotenv";
import { resolve } from "node:path";
import { createApp } from "./app.js";

// Local development uses .env.local; hosted deployments can inject environment variables directly.
for (const envPath of [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), "../../.env.local")]) config({ path: envPath });
config();

const { app } = createApp();
const port = Number(process.env.PORT ?? 3001);

await app.listen({ host: "127.0.0.1", port });
console.log(`Huis API listening on http://127.0.0.1:${port}`);

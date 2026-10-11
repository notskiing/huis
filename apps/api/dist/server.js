import "dotenv/config";
import { createApp } from "./app.js";
const { app } = createApp();
const port = Number(process.env.PORT ?? 3001);
await app.listen({ host: "127.0.0.1", port });
console.log(`Huis API listening on http://127.0.0.1:${port}`);
//# sourceMappingURL=server.js.map
import { DialGateway } from "../packages/dial/src/index.js";

async function main(): Promise<void> {
  if (process.env.LIVE_DIAL_TEST !== "1") throw new Error("Refusing live test: set LIVE_DIAL_TEST=1 after recipient opt-in.");
  const target = process.env.DIAL_SMOKE_TO_E164;
  if (!target) throw new Error("DIAL_SMOKE_TO_E164 is required and must be allowlisted.");
  const result = await new DialGateway().sendMessage(target, "Huis connectivity test. No reply is required.");
  console.log(`Dial smoke accepted: ${result.providerId}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

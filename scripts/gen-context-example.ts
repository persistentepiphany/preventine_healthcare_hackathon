import { writeFile } from "node:fs/promises";
import { getLocalPreventiveContext } from "../src/ingestion/context.js";

async function main() {
  const ctx = await getLocalPreventiveContext("M13 9PL");
  await writeFile(
    "docs/local-preventive-context-example.json",
    JSON.stringify(ctx, null, 2) + "\n",
    "utf8",
  );
  process.stdout.write(
    `wrote docs/local-preventive-context-example.json; dataQuality=${JSON.stringify(ctx.dataQuality)}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`gen-context-example failed: ${String(err)}\n`);
  process.exit(1);
});

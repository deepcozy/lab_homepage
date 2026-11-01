import { createHash } from "node:crypto";
import { appendFile, readFile, readdir } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

const productionUrl = process.env.PRODUCTION_URL;
const deploymentUrl = process.env.DEPLOYMENT_URL;
if (!/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(productionUrl || "")) {
  throw new Error("PRODUCTION_URL must be the Pages project URL.");
}
if (!/^https:\/\/[a-z0-9.-]+\.pages\.dev\/?$/.test(deploymentUrl || "")) {
  throw new Error("DEPLOYMENT_URL must be the uploaded Pages deployment URL.");
}

const output = new URL("../dist/", import.meta.url);
async function files(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const relative = `${prefix}${entry.name}`;
    return entry.isDirectory()
      ? files(new URL(`${entry.name}/`, directory), `${relative}/`)
      : [relative];
  }))).flat();
}
const paths = await files(output);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function verify(baseUrl) {
  for (const path of paths) {
    const remote = new URL(path === "index.html" ? "/" : `/${path}`, baseUrl);
    const response = await fetch(remote, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }).catch((error) => {
      throw new Error(`${remote}: ${error.cause?.code || error.message}`, { cause: error });
    });
    if (!response.ok) {
      throw new Error(`${remote}: HTTP ${response.status}`);
    }
    const actual = Buffer.from(await response.arrayBuffer());
    const expected = await readFile(new URL(path, output));
    if (digest(actual) !== digest(expected)) {
      throw new Error(`${remote}: published content does not match this build`);
    }
  }
}

// A new Pages hostname can need several minutes before HTTPS is ready.
const deadline = Date.now() + 8 * 60_000;
for (const baseUrl of new Set([deploymentUrl, productionUrl])) {
  for (let attempt = 1; ; attempt++) {
    try {
      await verify(baseUrl);
      console.log(`Verified ${paths.length} published files: ${baseUrl}`);
      break;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      console.log(`Waiting for Pages HTTPS and content (attempt ${attempt}): ${error.message}`);
      await setTimeout(15_000);
    }
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, [
    "## Cozie deployment",
    "",
    `Production: ${productionUrl}`,
    "",
    `Deployment: ${deploymentUrl}`,
    "",
    `Verified all ${paths.length} published files against this build.`,
    "",
  ].join("\n"));
}

import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function ensurePagesProject({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  const name = env.CLOUDFLARE_PAGES_PROJECT || "cozie";
  if (!accountId || !token) {
    throw new Error(
      "Set the CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN GitHub Actions secrets.",
    );
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID must be a 32-character account ID.");
  }
  if (name.length > 58 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error("Use a Pages project name of up to 58 lowercase letters, digits, and hyphens.");
  }

  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;
  async function request(url, options = {}) {
    const response = await fetchImpl(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  }
  function fail({ response, data }) {
    const codes = (data?.errors || []).map((error) => error.code).join(", ");
    if (response.status === 401 || response.status === 403 ||
        (data?.errors || []).some((error) => [10000, 9109].includes(error.code))) {
      throw new Error(
        `Cloudflare denied Pages access (HTTP ${response.status}; codes: ${codes}). ` +
        "Replace CLOUDFLARE_API_TOKEN with a token granting Account / Cloudflare Pages / Edit " +
        "for this account. R2-only tokens and S3 credentials cannot deploy Pages.",
      );
    }
    throw new Error(
      `Cloudflare Pages API failed (HTTP ${response.status}; codes: ${codes || "unknown"}). ` +
      "Check the account ID, Pages permissions, and project name.",
    );
  }

  if (token.startsWith("cfat_")) {
    const verification = await request(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`,
    );
    if (!verification.response.ok || !verification.data?.success ||
        verification.data.result?.status !== "active") {
      throw new Error(
        "Cloudflare could not verify the account API token. " +
        "Check that CLOUDFLARE_API_TOKEN contains the exact active token for this account.",
      );
    }
    console.log("Cloudflare account API token is active.");
  }

  let result = await request(`${base}/${encodeURIComponent(name)}`);
  if (!result.response.ok || !result.data?.success) {
    // Wrangler uses error 8000007 to identify a missing Pages project.
    const missing = (result.data?.errors || []).some((error) => error.code === 8000007);
    if (!missing || ![400, 404].includes(result.response.status)) {
      fail(result);
    }
    result = await request(base, {
      method: "POST",
      body: JSON.stringify({ name, production_branch: "main" }),
    });
    if (!result.response.ok || !result.data?.success) {
      fail(result);
    }
  }

  const project = result.data.result;
  if (project?.production_branch !== "main") {
    throw new Error("The Pages project's production branch must be main before deploying.");
  }
  if (!/^[a-z0-9-]+\.pages\.dev$/.test(project?.subdomain || "")) {
    throw new Error("Cloudflare did not return a valid Pages project subdomain.");
  }
  return `https://${project.subdomain}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const url = await ensurePagesProject();
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, `production-url=${url}\n`);
    }
    console.log(`Pages project ready: ${url}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

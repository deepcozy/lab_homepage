import { pathToFileURL } from "node:url";

export async function ensureDownloadBucket({ env = process.env, fetchImpl = fetch } = {}) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/i.test(accountId || "") || !token) {
    throw new Error("Set valid CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN secrets.");
  }
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
  async function request(url, method = "GET", body) {
    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  }
  let result = await request(`${base}/cozie-downloads`);
  if (result.response.status === 404) {
    result = await request(base, "POST", { name: "cozie-downloads" });
  }
  if (!result.response.ok || !result.data?.success) {
    const codes = (result.data?.errors || []).map((error) => error.code).join(", ");
    if ((result.data?.errors || []).some((error) => error.code === 10042)) {
      throw new Error(
        "R2 is not enabled for this Cloudflare account (HTTP 403; code 10042 / NotEntitled). " +
        "Complete R2 activation in the Cloudflare dashboard, then rerun this workflow. " +
        "Account subscription activation must be completed by the account owner.",
      );
    }
    throw new Error(
      `Cannot initialize the private R2 download bucket (HTTP ${result.response.status}; codes: ${codes}). ` +
      "The Cloudflare token requires Workers R2 Storage Edit access.",
    );
  }
  console.log("Private R2 bucket ready: cozie-downloads");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await ensureDownloadBucket();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

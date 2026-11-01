import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const releaseRepository = "deepcozy/lab_homepage";

export function selectAndroidRelease(releases, repository = releaseRepository) {
  const candidates = releases.filter((release) =>
    !release.draft && /^android-[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(release.tag_name) &&
    Number.isFinite(Date.parse(release.published_at)),
  ).sort((a, b) =>
    Date.parse(b.published_at) - Date.parse(a.published_at) || b.id - a.id,
  );
  for (const release of candidates) {
    const apks = release.assets.filter((asset) =>
      asset.state === "uploaded" && /\.apk$/i.test(asset.name),
    );
    const preferred = apks.filter((asset) => asset.name === "cozie.apk");
    const choices = preferred.length ? preferred : apks;
    if (!choices.length) continue;
    if (choices.length !== 1) {
      throw new Error(`Ambiguous APK assets in ${release.tag_name}; publish one cozie.apk.`);
    }
    const asset = choices[0];
    const expectedUrl = `https://github.com/${repository}/releases/download/` +
      `${encodeURIComponent(release.tag_name)}/${encodeURIComponent(asset.name)}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9.+_-]*\.apk$/i.test(asset.name) ||
        !Number.isSafeInteger(asset.size) || asset.size <= 0 ||
        !Number.isSafeInteger(asset.id) || asset.id <= 0 ||
        !Number.isSafeInteger(release.id) || release.id <= 0 ||
        asset.browser_download_url !== expectedUrl ||
        (asset.digest != null && !/^sha256:[a-f0-9]{64}$/.test(asset.digest))) {
      throw new Error(`Invalid APK metadata in ${release.tag_name}.`);
    }
    return {
      available: true,
      repository,
      version: release.tag_name,
      releaseId: release.id,
      assetId: asset.id,
      filename: asset.name,
      size: asset.size,
      sha256: asset.digest?.slice(7) || null,
      publishedAt: release.published_at,
      assetUrl: asset.browser_download_url,
    };
  }
  throw new Error("No published android-* release with an uploaded APK was found.");
}

export async function githubRequest(endpoint, {
  token = process.env.GITHUB_TOKEN,
  fetchImpl = fetch,
  ...options
} = {}) {
  const response = await fetchImpl(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub API ${endpoint}: HTTP ${response.status}.`);
  return response;
}

export async function findAndroidRelease({
  repository = releaseRepository,
  ...options
} = {}) {
  const releases = [];
  for (let page = 1; ; page++) {
    const response = await githubRequest(
      `/repos/${repository}/releases?per_page=100&page=${page}`, options,
    );
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Invalid GitHub releases response.");
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  return selectAndroidRelease(releases, repository);
}

export function releaseIdentity(release) {
  return JSON.stringify([
    release?.repository, release?.releaseId, release?.assetId, release?.version,
    release?.filename, release?.size, release?.sha256, release?.publishedAt, release?.assetUrl,
  ]);
}

export function siteOrigin(siteUrl = "https://cozie.pages.dev") {
  const site = new URL(siteUrl);
  if (site.protocol !== "https:" || site.href !== `${site.origin}/`) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials or a path.");
  }
  return site.origin;
}

export async function writeAndroidRelease(directory, release, siteUrl) {
  const origin = siteOrigin(siteUrl);
  const metadata = { ...release, url: `${origin}/download/android` };
  await mkdir(path.join(directory, "api"), { recursive: true });
  await writeFile(path.join(directory, "api/android-release.json"),
    `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(path.join(directory, "_redirects"), [
    `/download/android ${release.assetUrl} 302`,
    "/api/android-release /api/android-release.json 302",
    "",
  ].join("\n"));
  await writeFile(path.join(directory, "_headers"), [
    "/api/android-release.json",
    "  Cache-Control: no-store",
    "  X-Content-Type-Options: nosniff",
    "",
  ].join("\n"));
  return metadata;
}

export async function readPublicRelease(siteUrl, fetchImpl = fetch) {
  const response = await fetchImpl(
    `${siteOrigin(siteUrl)}/api/android-release.json?check=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`Public release metadata: HTTP ${response.status}.`);
  return response.json();
}

export async function verifyAndroidDownload(siteUrl, release, fetchImpl = fetch) {
  const entry = `${siteOrigin(siteUrl)}/download/android`;
  const redirect = await fetchImpl(entry, {
    method: "HEAD",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (redirect.status !== 302 || redirect.headers.get("location") !== release.assetUrl) {
    throw new Error(`Android entry does not redirect to ${release.version}'s APK.`);
  }
  await verifyPublicApk(release, fetchImpl);
}

export async function verifyPublicApk(release, fetchImpl = fetch) {
  // No GitHub credentials follow the asset's redirect chain.
  const apk = await fetchImpl(release.assetUrl, {
    method: "HEAD",
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!apk.ok || Number(apk.headers.get("content-length")) !== release.size) {
    throw new Error(`Public APK download is unavailable or has the wrong size (HTTP ${apk.status}).`);
  }
}

export async function reconcileAndroidRelease(siteUrl, expected, {
  sync = false, token, fetchImpl = fetch,
} = {}) {
  let problem;
  try {
    const deployed = await readPublicRelease(siteUrl, fetchImpl);
    if (deployed.available !== true ||
        releaseIdentity(deployed) !== releaseIdentity(expected) ||
        deployed.url !== `${siteOrigin(siteUrl)}/download/android`) {
      throw new Error(`Published metadata does not match ${expected.version}.`);
    }
    await verifyAndroidDownload(siteUrl, expected, fetchImpl);
  } catch (error) {
    if (!sync) throw error;
    problem = error.message;
  }
  if (problem) {
    await githubRequest(`/repos/${releaseRepository}/actions/workflows/deploy-pages.yml/dispatches`, {
      token,
      fetchImpl,
      method: "POST",
      body: JSON.stringify({ ref: "main" }),
    });
  }
  return problem;
}

import { appendFile } from "node:fs/promises";

const site = new URL(process.env.SITE_URL || "https://cozie.pages.dev");
if (site.protocol !== "https:" || site.href !== `${site.origin}/`) {
  throw new Error("SITE_URL must be an HTTPS origin.");
}
const response = await fetch(new URL("/api/android-release", site), {
  cache: "no-store",
  signal: AbortSignal.timeout(30_000),
});
const release = await response.json();
let summary;
if (response.status === 503 && release.available === false) {
  summary = "Android download is awaiting the first published APK in R2.";
} else {
  if (!response.ok || release.available !== true ||
      release.url !== new URL("/download/android", site).href ||
      !/^[a-f0-9]{64}$/.test(release.sha256 || "") ||
      !Number.isSafeInteger(release.size) || release.size <= 0) {
    throw new Error(`Invalid public Android release metadata (HTTP ${response.status}).`);
  }
  const download = await fetch(release.url, {
    method: "HEAD",
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!download.ok ||
      download.headers.get("content-type") !== "application/vnd.android.package-archive" ||
      Number(download.headers.get("content-length")) !== release.size ||
      download.headers.get("x-cozie-sha256") !== release.sha256 ||
      download.headers.get("x-cozie-version") !== release.version) {
    throw new Error(`Android download does not match the release metadata (HTTP ${download.status}).`);
  }
  summary = `Android ${release.version}: ${release.url} (${release.size} bytes; SHA-256 ${release.sha256})`;
}
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n## Android release\n\n${summary}\n`);
}

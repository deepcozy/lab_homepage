import { appendFile, readFile } from "node:fs/promises";
import {
  findAndroidRelease, reconcileAndroidRelease, siteOrigin,
} from "../lib/android-release.mjs";

const site = siteOrigin(process.env.SITE_URL);
const sync = process.env.SYNC_ANDROID_RELEASE === "true";
const expected = sync
  ? await findAndroidRelease()
  : JSON.parse(await readFile(new URL("../dist/api/android-release.json", import.meta.url), "utf8"));
const problem = await reconcileAndroidRelease(site, expected, { sync });

let summary = `Android ${expected.version}: ${expected.assetUrl} (${expected.size} bytes).`;
if (problem) {
  summary += `\n\nDeployment requested on main: ${problem}`;
} else {
  summary += "\n\nVerified release metadata, the fixed QR entry and anonymous APK download.";
}
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n## Android release\n\n${summary}\n`);
}

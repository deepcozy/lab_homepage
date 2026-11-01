import { cp, mkdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeAndroidQr } from "./generate-android-qr.mjs";
import { findAndroidRelease, verifyPublicApk, writeAndroidRelease } from "../lib/android-release.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const required = [
  "index.html",
  "styles.css",
  "assets/cozie-cloud.png",
  "assets/qr-corners.svg",
  "assets/fonts/Outfit-Variable.ttf",
  "assets/fonts/OFL.txt",
];

for (const relativePath of required) {
  const info = await stat(path.join(root, relativePath));
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Missing or empty required file: ${relativePath}`);
  }
}

const release = await findAndroidRelease();
await verifyPublicApk(release);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(
  ["index.html", "styles.css", "assets"].map((name) =>
    cp(path.join(root, name), path.join(output, name), { recursive: true }),
  ),
);
await writeAndroidQr(output, process.env.SITE_URL);
await writeAndroidRelease(output, release, process.env.SITE_URL);
console.log(`Android ${release.version}: ${release.assetUrl} (${release.size} bytes)`);
console.log(`Static site built: ${output}`);

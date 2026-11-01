import { cp, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeAndroidQr } from "./generate-android-qr.mjs";

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

await mkdir(output, { recursive: true });
await Promise.all(
  ["index.html", "styles.css", "assets", "_routes.json"].map((name) =>
    cp(path.join(root, name), path.join(output, name), { recursive: true }),
  ),
);
await writeAndroidQr(output, process.env.SITE_URL);
console.log(`Static site built: ${output}`);

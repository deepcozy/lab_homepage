import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import QRCode from "qrcode";

export const iosDownloadUrl = "https://testflight.apple.com/join/51gqyeCn";

export async function createAndroidQr(siteUrl = "https://cozie.pages.dev") {
  const site = new URL(siteUrl);
  if (site.protocol !== "https:" || site.href !== `${site.origin}/`) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials or a path.");
  }
  const url = new URL("/download/android", site).href;
  return createQr(url);
}

export async function createIosQr() {
  return createQr(iosDownloadUrl);
}

async function createQr(url) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    width: 256,
    color: { dark: "#0a1227ff", light: "#ffffffff" },
  });
  return { url, svg };
}

export async function writeAndroidQr(directory, siteUrl) {
  const { url, svg } = await createAndroidQr(siteUrl);
  const assets = path.join(directory, "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(path.join(assets, "android-download-qr.svg"), svg);
  console.log(`Generated Android QR code: ${url}`);
}

export async function writeIosQr(directory) {
  const { url, svg } = await createIosQr();
  const assets = path.join(directory, "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(path.join(assets, "ios-download-qr.svg"), svg);
  console.log(`Generated iOS QR code: ${url}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeAndroidQr(process.argv[2] || "dist", process.env.SITE_URL);
  await writeIosQr(process.argv[2] || "dist");
}

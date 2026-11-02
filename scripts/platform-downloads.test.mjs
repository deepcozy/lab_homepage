import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { createIosQr, iosDownloadUrl } from "./generate-android-qr.mjs";

const script = await readFile(new URL("../download-platform.js", import.meta.url), "utf8");

const devices = [
  ["Android phone", { userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36" }, "android"],
  ["Android desktop mode with client hints", { userAgent: "Mozilla/5.0 (X11; Linux x86_64)", userAgentData: { platform: "Android", mobile: false } }, "android"],
  ["iPhone", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" }, "ios"],
  ["iPad", { userAgent: "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X)" }, "ios"],
  ["iPad desktop mode", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 }, "ios"],
  ["Mac desktop", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 }, "desktop"],
  ["Windows touch laptop", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32", maxTouchPoints: 10 }, "desktop"],
  ["unknown browser", {}, "desktop"],
];

for (const [name, navigator, expected] of devices) {
  test(`${name} selects the expected download platform`, () => {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(script, { navigator, document });
    assert.equal(document.documentElement.dataset.downloadPlatform, expected);
  });
}

test("the iOS QR independently decodes to the supplied TestFlight invitation", async () => {
  const { svg, url } = await createIosQr();
  const png = PNG.sync.read(new Resvg(svg).render().asPng());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, "https://testflight.apple.com/join/51gqyeCn");
  assert.equal(url, decoded.data);
});

test("iOS QR and button links stay aligned with the encoded invitation", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const iosCard = html.split('data-platform="ios"')[1].split("</section>")[0];
  const targets = [...iosCard.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(targets, [iosDownloadUrl, iosDownloadUrl]);
  assert.ok(html.indexOf('src="./download-platform.js"') < html.indexOf("</head>"));
});

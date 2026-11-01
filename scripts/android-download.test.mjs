import assert from "node:assert/strict";
import test from "node:test";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { validateAndroidRelease } from "../lib/android-release.mjs";
import { onRequest } from "../functions/download/android.js";
import { onRequestGet } from "../functions/api/android-release.js";
import { createAndroidQr } from "./generate-android-qr.mjs";
import { ensureDownloadBucket } from "./ensure-download-bucket.mjs";

const apk = new Uint8Array([80, 75, 3, 4]);
const release = {
  version: "0.0.2",
  key: ["android", "releases", "0.0.2", "cozie-0.0.2.apk"].join("/"),
  filename: "cozie-0.0.2.apk",
  size: apk.length,
  sha256: "a".repeat(64),
  publishedAt: "2026-11-01T12:00:00Z",
};

function context(method = "GET", manifest = release, overrides = {}) {
  return {
    request: new Request("https://cozie.pages.dev/download/android", { method }),
    env: {
      ANDROID_RELEASES: {
        get: async (key) => key === "android/latest.json"
          ? manifest && { json: async () => manifest }
          : {
            body: new Response(apk).body,
            size: apk.length,
            httpEtag: '"example"',
            customMetadata: { sha256: release.sha256 },
          },
        head: async () => ({ size: apk.length, httpEtag: '"example"' }),
        ...overrides,
      },
    },
  };
}

test("the generated SVG QR decodes to the public latest-APK endpoint", async () => {
  const { svg, url } = await createAndroidQr();
  const png = PNG.sync.read(new Resvg(svg).render().asPng());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, "https://cozie.pages.dev/download/android");
  assert.equal(url, decoded.data);
});

test("QR generation respects the actual production hostname", async () => {
  const { url } = await createAndroidQr("https://cozie-example.pages.dev");
  assert.equal(url, "https://cozie-example.pages.dev/download/android");
  await assert.rejects(createAndroidQr("http://example.com"), /HTTPS origin/);
  await assert.rejects(createAndroidQr("https://example.com/path"), /HTTPS origin/);
});

test("release manifest cannot reference unrelated or unsafe bucket objects", () => {
  for (const key of ["secrets.json", "android/releases/../secret.apk", "android/latest.json"]) {
    assert.throws(() => validateAndroidRelease({ ...release, key }), /Invalid/);
  }
  assert.throws(() => validateAndroidRelease({
    ...release, filename: 'unsafe"\r\nInjected: true.apk',
  }), /Invalid/);
  assert.throws(() => validateAndroidRelease({ ...release, sha256: "bad" }), /Invalid/);
});

test("GET streams the APK as a download with version and checksum headers", async () => {
  const response = await onRequest(context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/vnd.android.package-archive");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="cozie-0.0.2.apk"');
  assert.equal(response.headers.get("content-length"), String(apk.length));
  assert.equal(response.headers.get("x-cozie-version"), release.version);
  assert.equal(response.headers.get("x-cozie-sha256"), release.sha256);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), apk);
});

test("HEAD reads APK metadata without opening its body", async () => {
  const response = await onRequest(context("HEAD", release, {
    get: async (key) => {
      assert.equal(key, "android/latest.json");
      return { json: async () => release };
    },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), String(apk.length));
  assert.equal(await response.text(), "");
});

test("an empty bucket reports the missing first release without faking a download", async () => {
  for (const method of ["GET", "HEAD"]) {
    const response = await onRequest(context(method, null));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "300");
    if (method === "HEAD") assert.equal(await response.text(), "");
  }
});

test("inconsistent APK size cannot be published as a successful download", async () => {
  const response = await onRequest(context("GET", { ...release, size: 100 }));
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes(release.key));
});

test("public metadata omits internal bucket keys", async () => {
  const response = await onRequestGet(context());
  const metadata = await response.json();
  assert.equal(response.status, 200);
  assert.equal(metadata.available, true);
  assert.equal(metadata.url, "https://cozie.pages.dev/download/android");
  assert.equal(metadata.sha256, release.sha256);
  assert.equal(metadata.key, undefined);
});

test("public metadata distinguishes an unpublished APK", async () => {
  const response = await onRequestGet(context("GET", null));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { available: false });
});

test("other HTTP methods cannot access the APK bucket", async () => {
  const response = await onRequest(context("POST", null, {
    get: () => assert.fail("Bucket must not be accessed"),
  }));
  assert.equal(response.status, 405);
});

const cloudflareEnv = { CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_API_TOKEN: "fixture" };

test("reuse an existing private bucket without modifying it", async () => {
  let calls = 0;
  await ensureDownloadBucket({
    env: cloudflareEnv,
    fetchImpl: async (url, options) => {
      calls++;
      assert.ok(url.endsWith("/r2/buckets/cozie-downloads"));
      assert.equal(options.method, "GET");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    },
  });
  assert.equal(calls, 1);
});

test("create a private bucket only when it is missing", async () => {
  const calls = [];
  await ensureDownloadBucket({
    env: cloudflareEnv,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ success: calls.length === 2 }), {
        status: calls.length === 1 ? 404 : 200,
      });
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: "cozie-downloads" });
});

test("R2 permission errors never trigger bucket creation", async () => {
  let calls = 0;
  await assert.rejects(ensureDownloadBucket({
    env: cloudflareEnv,
    fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ success: false }), { status: 403 });
    },
  }), /R2 Storage Edit/);
  assert.equal(calls, 1);
});

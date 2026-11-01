import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import {
  findAndroidRelease, reconcileAndroidRelease, releaseIdentity,
  selectAndroidRelease, verifyAndroidDownload, writeAndroidRelease,
} from "../lib/android-release.mjs";
import { createAndroidQr } from "./generate-android-qr.mjs";

const site = "https://cozie.pages.dev";
function fixture(id = 3, options = {}) {
  const tag = `android-v0.0.${id}`;
  return {
    id, tag_name: tag, draft: false, prerelease: true,
    published_at: `2026-11-01T12:00:0${id}Z`,
    assets: [{
      id: id * 10, name: "cozie.apk", state: "uploaded", size: 1234,
      digest: `sha256:${"a".repeat(64)}`,
      browser_download_url: `https://github.com/deepcozy/lab_homepage/releases/download/${tag}/cozie.apk`,
    }],
    ...options,
  };
}
const release = selectAndroidRelease([fixture()]);
const publicMetadata = { ...release, url: `${site}/download/android` };
const json = (value) => Response.json(value);

function publicFetch({ metadata = publicMetadata, location = release.assetUrl, size = release.size } = {}) {
  return async (url, options) => {
    assert.equal(options.headers?.Authorization, undefined);
    if (url.includes("/api/android-release.json")) return json(metadata);
    assert.equal(options.method, "HEAD");
    if (url === `${site}/download/android`) {
      assert.equal(options.redirect, "manual");
      return new Response(null, { status: 302, headers: { Location: location } });
    }
    assert.equal(url, release.assetUrl);
    return new Response(null, { headers: { "Content-Length": String(size) } });
  };
}

test("the generated SVG QR independently decodes to the fixed APK entry", async () => {
  const { svg, url } = await createAndroidQr();
  const png = PNG.sync.read(new Resvg(svg).render().asPng());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, `${site}/download/android`);
  assert.equal(url, decoded.data);
});

test("QR generation respects the production hostname and rejects unsafe origins", async () => {
  const { url } = await createAndroidQr("https://cozie-example.pages.dev");
  assert.equal(url, "https://cozie-example.pages.dev/download/android");
  for (const origin of ["http://example.com", "https://example.com/path", "https://u:p@example.com"]) {
    await assert.rejects(createAndroidQr(origin), /HTTPS origin/);
  }
});

test("selection includes prereleases and sorts by publication rather than API order or tag", () => {
  const newest = fixture(1, { published_at: "2026-11-02T00:00:00Z" });
  assert.equal(selectAndroidRelease([fixture(9), newest, fixture(3)]).version, newest.tag_name);
  assert.equal(selectAndroidRelease([fixture(3), fixture(9, {
    published_at: fixture(3).published_at,
  })]).releaseId, 9);
});

test("drafts, unrelated tags and releases still uploading do not displace a complete APK", () => {
  const uploading = fixture(7);
  uploading.assets[0].state = "new";
  assert.equal(selectAndroidRelease([
    fixture(8, { draft: true }), fixture(9, { tag_name: "website-v9" }),
    fixture(6, { assets: [] }), uploading, fixture(),
  ]).version, release.version);
  assert.throws(() => selectAndroidRelease([]), /No published/);
});

test("cozie.apk wins over architecture variants; ambiguous alternatives fail", () => {
  const value = fixture();
  value.assets.push({ ...value.assets[0], name: "arm64.apk" });
  assert.equal(selectAndroidRelease([value]).filename, "cozie.apk");
  value.assets[0].name = "arm32.apk";
  assert.throws(() => selectAndroidRelease([value]), /Ambiguous/);
});

test("a single legacy APK name is accepted with its exact public URL", () => {
  const value = fixture();
  value.assets[0].name = "mai-staging-0.0.3.apk";
  value.assets[0].browser_download_url = value.assets[0].browser_download_url.replace(
    "cozie.apk", value.assets[0].name,
  );
  delete value.assets[0].digest;
  const selected = selectAndroidRelease([value]);
  assert.equal(selected.filename, value.assets[0].name);
  assert.equal(selected.sha256, null);
});

test("invalid size, digest and foreign or injected URLs fail before deployment", () => {
  for (const overrides of [
    { size: 0 }, { digest: "md5:bad" }, { browser_download_url: "https://evil.example/app.apk" },
    { name: "app\n.apk" }, { browser_download_url: `${release.assetUrl}\n/injected` },
  ]) {
    const value = fixture();
    Object.assign(value.assets[0], overrides);
    assert.throws(() => selectAndroidRelease([value]), /Invalid/);
  }
});

test("release pagination examines later pages with authentication only for the GitHub API", async () => {
  const calls = [];
  const selected = await findAndroidRelease({
    token: "fixture-token",
    fetchImpl: async (url, options) => {
      calls.push(url);
      assert.equal(options.headers.Authorization, "Bearer fixture-token");
      return json(calls.length === 1
        ? Array.from({ length: 100 }, () => fixture(9, { draft: true }))
        : [fixture()]);
    },
  });
  assert.equal(selected.version, release.version);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].endsWith("page=2"));
  await assert.rejects(findAndroidRelease({
    fetchImpl: async () => new Response(null, { status: 403 }),
  }), /HTTP 403/);
});

test("build artifacts contain a temporary download redirect and uncached public metadata", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cozie-release-"));
  try {
    await writeAndroidRelease(directory, release, site);
    assert.equal(await readFile(path.join(directory, "_redirects"), "utf8"),
      `/download/android ${release.assetUrl} 302\n/api/android-release /api/android-release.json 302\n`);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, "api/android-release.json"))), publicMetadata);
    assert.match(await readFile(path.join(directory, "_headers"), "utf8"), /Cache-Control: no-store/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("download checks reject a stale redirect and wrong APK size without passing credentials", async () => {
  await verifyAndroidDownload(site, release, publicFetch());
  await assert.rejects(verifyAndroidDownload(site, release, publicFetch({
    location: "https://github.com/old.apk",
  })), /does not redirect/);
  await assert.rejects(verifyAndroidDownload(site, release, publicFetch({ size: 42 })), /wrong size/);
});

test("an unchanged public release is verified without dispatching deployment", async () => {
  assert.equal(await reconcileAndroidRelease(site, release, {
    sync: true, fetchImpl: publicFetch(),
  }), undefined);
  assert.notEqual(releaseIdentity(release), releaseIdentity({ ...release, assetId: 99 }));
});

test("a stale or broken public entry dispatches main; deployment checks instead fail", async () => {
  for (const fetchPublic of [publicFetch({ metadata: {} }), publicFetch({ size: 42 })]) {
    let dispatches = 0;
    const problem = await reconcileAndroidRelease(site, release, {
      sync: true,
      token: "dispatch-token",
      fetchImpl: async (url, options) => {
        if (!url.startsWith("https://api.github.com/")) return fetchPublic(url, options);
        dispatches++;
        assert.ok(url.endsWith("/actions/workflows/deploy-pages.yml/dispatches"));
        assert.equal(options.method, "POST");
        assert.equal(options.headers.Authorization, "Bearer dispatch-token");
        assert.deepEqual(JSON.parse(options.body), { ref: "main" });
        return new Response(null, { status: 204 });
      },
    });
    assert.equal(dispatches, 1);
    assert.ok(problem);
  }
  await assert.rejects(reconcileAndroidRelease(site, release, {
    fetchImpl: publicFetch({ metadata: {} }),
  }), /does not match/);
});

test("failed dispatch is surfaced instead of reporting a successful sync", async () => {
  await assert.rejects(reconcileAndroidRelease(site, release, {
    sync: true,
    fetchImpl: async (url) => url.startsWith("https://api.github.com/")
      ? new Response(null, { status: 403 }) : json({}),
  }), /HTTP 403/);
});

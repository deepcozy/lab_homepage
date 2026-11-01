import assert from "node:assert/strict";
import test from "node:test";
import { ensurePagesProject } from "./ensure-pages-project.mjs";

const env = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "fixture",
};
const project = { production_branch: "main", subdomain: "cozie.pages.dev" };
const accountToken = ["cfat", "fixture"].join("_");
const reply = (status, body) => new Response(JSON.stringify(body), { status });

test("reuse an existing project without modifying it", async () => {
  let calls = 0;
  const url = await ensurePagesProject({
    env,
    fetchImpl: async (url, options) => {
      calls++;
      assert.ok(url.endsWith("/pages/projects/cozie"));
      assert.equal(options.method, undefined);
      assert.equal(options.headers.Authorization, `Bearer ${env.CLOUDFLARE_API_TOKEN}`);
      return reply(200, { success: true, result: project });
    },
  });
  assert.equal(url, "https://cozie.pages.dev");
  assert.equal(calls, 1);
});

test("create a missing Direct Upload project with main as production branch", async () => {
  const calls = [];
  await ensurePagesProject({
    env,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? reply(404, { success: false, errors: [{ code: 8000007 }] })
        : reply(200, { success: true, result: project });
    },
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.endsWith("/pages/projects"));
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    name: "cozie", production_branch: "main",
  });
});

test("permission failures explain the required token and never create a project", async () => {
  let calls = 0;
  await assert.rejects(ensurePagesProject({
    env,
    fetchImpl: async () => {
      calls++;
      return reply(403, { success: false, errors: [{ code: 10000 }] });
    },
  }), /Account \/ Cloudflare Pages \/ Edit/);
  assert.equal(calls, 1);
});

test("an unrelated 404 never triggers project creation", async () => {
  let calls = 0;
  await assert.rejects(ensurePagesProject({
    env,
    fetchImpl: async () => {
      calls++;
      return reply(404, { success: false, errors: [{ code: 7003 }] });
    },
  }), /Cloudflare Pages API failed/);
  assert.equal(calls, 1);
});

test("require secrets before sending any request", async () => {
  await assert.rejects(ensurePagesProject({
    env: {},
    fetchImpl: async () => assert.fail("Unexpected request"),
  }), /GitHub Actions secrets/);
});

test("reject a project with a different production branch", async () => {
  await assert.rejects(ensurePagesProject({
    env,
    fetchImpl: async () => reply(200, {
      success: true,
      result: { ...project, production_branch: "release" },
    }),
  }), /production branch must be main/);
});

test("reject invalid subdomains from the API", async () => {
  await assert.rejects(ensurePagesProject({
    env,
    fetchImpl: async () => reply(200, {
      success: true,
      result: { ...project, subdomain: "example.com\ninjected=value" },
    }),
  }), /valid Pages project subdomain/);
});

test("verify an account token before checking Pages permissions", async () => {
  const calls = [];
  await ensurePagesProject({
    env: { ...env, CLOUDFLARE_API_TOKEN: accountToken },
    fetchImpl: async (url) => {
      calls.push(url);
      return url.endsWith("/tokens/verify")
        ? reply(200, { success: true, result: { status: "active" } })
        : reply(200, { success: true, result: project });
    },
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].endsWith("/tokens/verify"));
  assert.ok(calls[1].endsWith("/pages/projects/cozie"));
});

test("an invalid account token never sends a Pages request", async () => {
  let calls = 0;
  await assert.rejects(ensurePagesProject({
    env: { ...env, CLOUDFLARE_API_TOKEN: accountToken },
    fetchImpl: async () => {
      calls++;
      return reply(401, { success: false, errors: [{ code: 1000 }] });
    },
  }), /exact active token/);
  assert.equal(calls, 1);
});

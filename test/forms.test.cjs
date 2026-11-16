const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const { test } = require("node:test");

const source = readFileSync(join(__dirname, "../api/forms.js"), "utf8");
const valid = { email: "visitor@example.com", name: "Visitor", context: "Hiring a controller" };

function setup(verification = { isHuman: true, isBot: false }, env = { VERCEL: "1" }) {
  const calls = [];
  const module = { exports: {} };
  runInNewContext(source, {
    module, Buffer, URLSearchParams,
    process: { env: { RESEND_API_KEY: "test-only", ...env } },
    console: { error() {} },
    require(name) {
      assert.equal(name, "botid/server");
      return { checkBotId: async (options) => {
        calls.push({ kind: "verify", options });
        if (verification instanceof Error) throw verification;
        return verification;
      } };
    },
    fetch: async (url, options) => {
      calls.push({ kind: "email", url, payload: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ id: "test-message" }) };
    },
  });
  return {
    calls,
    async request(body, method = "POST") {
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(value) { this.body = JSON.parse(value); } };
      await module.exports({ method, headers: { "content-type": "application/json" }, body }, res);
      return res;
    },
  };
}

for (const type of ["newsletter", "search", "candidate"]) {
  test(`blocked ${type} submissions never call Resend`, async () => {
    const app = setup({ isHuman: false, isBot: true });
    const response = await app.request({ ...valid, type });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "verification_failed");
    assert.deepEqual(app.calls.map(c => c.kind), ["verify"]);
    assert.equal(response.headers["Cache-Control"], "no-store");
  });

  test(`verified ${type} submissions still send the expected email`, async () => {
    const app = setup();
    const resume = { filename: "resume.pdf", content: Buffer.from("test resume").toString("base64") };
    const response = await app.request({ ...valid, type, ...(type === "candidate" ? { resume } : {}) });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(app.calls.map(c => c.kind), ["verify", "email"]);
    assert.equal(app.calls[1].payload.reply_to, valid.email);
    if (type === "candidate") assert.equal(app.calls[1].payload.attachments[0].content, resume.content);
  });
}

test("verification service failure rejects without sending email", async () => {
  const app = setup(new Error("verification unavailable"));
  const response = await app.request(valid);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, "verification_unavailable");
  assert.deepEqual(app.calls.map(c => c.kind), ["verify"]);
});

test("an incomplete verification result fails closed", async () => {
  const app = setup({});
  assert.equal((await app.request(valid)).statusCode, 403);
  assert.equal(app.calls.length, 1);
});

test("production and previews enforce Basic verification even with development NODE_ENV", async () => {
  const app = setup(undefined, { VERCEL: "1", NODE_ENV: "development" });
  await app.request(valid);
  assert.equal(app.calls[0].options.developmentOptions.isDevelopment, false);
  assert.equal(app.calls[0].options.advancedOptions.checkLevel, "basic");
});

test("honeypot and invalid input do not send email after verification", async () => {
  const app = setup();
  assert.equal((await app.request({ ...valid, website: "spam.example" })).statusCode, 200);
  assert.equal((await app.request({ ...valid, email: "invalid" })).statusCode, 400);
  assert.ok(app.calls.every(c => c.kind === "verify"));
});

test("non-POST requests do not verify or send", async () => {
  const app = setup();
  const response = await app.request({}, "GET");
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
  assert.equal(app.calls.length, 0);
});

// tests/probe-port.test.cjs — collector-only port: logs everything, rewrites nothing.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "g1-acq-probe.js"), "utf8");
const logs = [];
global.Anywhere = {
  codec: { utf8: { decode: (b) => b, encode: (s) => s } },
  log: { info: (m) => logs.push("I " + m), warning: (m) => logs.push("W " + m) },
};
eval(src);

// B1: body is never modified, even for SKUs the main module would rewrite
const body = '{"a":"g1.ios.20tb.m.v2","b":"g1.ios.2tb.m.v2","c":"com.google.gemini.2tb.ai.m.3month_ip_99p"}';
const ctx = { body };
process(ctx);
assert.strictEqual(ctx.body, body, "B1 probe never rewrites the body");

// B2: every namespace collected with counts
const col = logs.find((l) => l.includes("collected"));
assert.ok(col.includes("g1.ios.20tb.m.v2 x1"), "B2a g1 collected");
assert.ok(col.includes("com.google.gemini.2tb.ai.m.3month_ip_99p x1"), "B2b gemini collected");

// B3: raw plan fields logged so unknown trial SKUs are visible
const raw = logs.find((l) => l.includes("raw fields"));
assert.ok(raw && /20tb|2tb/.test(raw), "B3 raw tier fields logged");

// B4: packaged .amod embeds this script and its rule matches a real URL
const amod = fs.readFileSync(path.join(__dirname, "..", "g1-acq-probe.amod"), "utf8");
const ruleLine = amod.split("\n").find((l) => /^\d+,\s*\d+,\s*/.test(l));
const rxText = ruleLine.split(", ").slice(2).join(", ").replace(/, [A-Za-z0-9+/=]+$/, "");
const embedded = ruleLine.split(", ").pop();
assert.ok(new RegExp(rxText).test("https://one.google.com/ai?hl=vn"), "B4a amod rule matches");
assert.strictEqual(Buffer.from(embedded, "base64").toString("utf8"), src, "B4b amod embeds this script");

console.log("probe-port: ALL PASS");

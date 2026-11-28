// tests/anywhere-port.test.cjs — one runnable check for the Anywhere v7.12 port.
// Emulates the Anywhere JS API, swaps ACTIVE per preset, asserts rewrite +
// collector behavior for every ported preset.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "g1-acq-anywhere.js"), "utf8");
const logs = [];
global.Anywhere = {
  codec: { utf8: { decode: (b) => b, encode: (s) => s } },
  log: { info: (m) => logs.push("I " + m), warning: (m) => logs.push("W " + m) },
};

// Load the script with a chosen preset, return its process().
function load(active) {
  logs.length = 0;
  eval(src.replace(/var ACTIVE = "[^"]+";/, 'var ACTIVE = "' + active + '";'));
  return process;
}
function run(fn, body) {
  logs.length = 0;
  const ctx = { body };
  fn(ctx);
  return ctx.body;
}

let o, col;

// ---- default preset: pro-12months-eft -------------------------------------
let P = load("pro-12months-eft");

// A1: 2TB prefix -> free-trial target. Trial SKUs are never listed in a
// storefront response, so an _eft target bypasses the region guard by design.
o = run(P, '{"sku":"g1.ios.2tb.m.v2","t":"g1.2tb.ai.12months_ip_90p"}');
assert.ok(o.includes('"sku":"g1.2tb.ai.12months_eft"'), "A1 2TB prefix -> 12-month free target");
assert.ok(logs.some((l) => l.includes("g1.ios.2tb.m.v2 -> g1.2tb.ai.12months_eft")), "A1b rewrite logged");

// A1c: monthly 2TB plans also carry the prefix, so they are rewritten too
o = run(P, '{"sku":"g1.ios.2tb.m.3month_ip_75p"}');
assert.ok(o.includes('"sku":"g1.2tb.ai.12months_eft"'), "A1c monthly 2TB plan rewritten as well");

// A4: complete-token guard
o = run(P, '{"a":"g1.ios.20tb.m.v2extra","b":"g1.20tb.3months_ip_75p.acq"}');
assert.ok(o.includes("g1.ios.20tb.m.v2extra"), "A4 complete-token guard");

// A5: collector dedup + counts, com.google.gemini.* included
o = run(P, '{"a":"g1.ios.2tb.m.v2","b":"g1.ios.2tb.m.v2","c":"com.google.one.foo.bar","d":"com.google.gemini.2tb.ai.m.3month_ip_99p"}');
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2 x2") && col.includes("com.google.one.foo.bar x1"), "A5 collector dedup+counts");
assert.ok(col.includes("com.google.gemini.2tb.ai.m.3month_ip_99p x1"), "A5b gemini namespace collected");

// A6: escaped dots collected, body untouched
o = run(P, '{"a":"g1\\u002eios\\u002e2tb\\u002em\\u002ev2"}');
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2"), "A6a escaped dot collected");
assert.ok(o.includes("g1\\u002eios"), "A6b escaped dot body untouched (upstream semantics)");

// ---- preset: ultra-75p ----------------------------------------------------
P = load("ultra-75p");

// A2: 75p target listed in the region catalog -> 20TB rewritten
o = run(P, '{"a":"g1.20tb.3months_ip_75p.acq","b":"g1.ios.20tb.m.v2"}');
assert.ok(!o.includes("g1.ios.20tb.m.v2") && o.match(/g1\.20tb\.3months_ip_75p\.acq/g).length === 2, "A2 20TB -> 3-month 75p when listed");

// A2b: 75p target not listed -> guard keeps the original SKU and logs it
o = run(P, '{"a":"g1.20tb.3months_ip_90p.acq","b":"g1.ios.20tb.m.v2"}');
assert.ok(o.includes("g1.ios.20tb.m.v2"), "A2b unlisted 75p target leaves source as-is");
assert.ok(logs.some((l) => l.includes("not in region catalog")), "A2c guard skip logged");

// A3: 30TB -> Ultra 3-month 75p when listed
o = run(P, '{"a":"g1.ai.ultra.3months_ip_75p.acq","b":"g1.ios.30tb.ai.pro.m"}');
assert.ok(o.match(/g1\.ai\.ultra\.3months_ip_75p\.acq/g).length === 2, "A3 30TB -> Ultra 3-month 75p");

// A7: single pass, no chained rewrite of the produced target
o = run(P, '{"a":"g1.ios.20tb.m.v2","b":"g1.20tb.3months_ip_75p.acq"}');
assert.ok(o.match(/g1\.20tb\.3months_ip_75p\.acq/g).length === 2, "A7 produced target not rewritten twice");

// ---- preset: tr-ultra-20tb ------------------------------------------------
P = load("tr-ultra-20tb");
o = run(P, '{"a":"g1.ios.20tb.m.v2"}');
assert.ok(o.includes('"a":"g1.ios.20tb.m"'), "A9 TR 20TB variant needs no catalog entry (same namespace)");

// ---- preset: tr-ultra-30tb ------------------------------------------------
P = load("tr-ultra-30tb");
o = run(P, '{"a":"g1.ios.30tb.ai.pro.m"}');
assert.ok(o.includes('"a":"g1.ios.30tb.m"'), "A10 TR 30TB variant needs no catalog entry");

// ---- preset: pro-1yuan ----------------------------------------------------
P = load("pro-1yuan");
o = run(P, '{"a":"g1.ios.2tb.m.3month_ip_75p"}');
assert.ok(o.includes('"a":"com.google.gemini.2tb.ai.m.3month_ip_99p"'), "A11 1yuan gemini target");

// ---- preset: pro-12months-75p --------------------------------------------
P = load("pro-12months-75p");
// paid target: the catalog guard applies, so the target must be listed
o = run(P, '{"a":"g1.ios.2tb.a.12month_ip_15p","b":"g1.2tb.ai.12months_ip_75p"}');
assert.ok(o.includes('"a":"g1.2tb.ai.12months_ip_75p"'), "A12 12-month 75p paid target when listed");
o = run(P, '{"a":"g1.ios.2tb.a.12month_ip_15p"}');
assert.ok(o.includes("g1.ios.2tb.a.12month_ip_15p"), "A12b unlisted paid target skipped");

// ---- unknown preset ------------------------------------------------------
P = load("nope");
o = run(P, '{"a":"g1.ios.2tb.m.v2"}');
assert.ok(o.includes("g1.ios.2tb.m.v2"), "A13 unknown preset leaves body untouched");
assert.ok(logs.some((l) => l.startsWith("W")), "A13b unknown preset warned");

// A8: the packaged .amod rule must match a real request URL (single-escaped
// regex) and embed the same script. A double backslash silently kills every log.
const amod = fs.readFileSync(path.join(__dirname, "..", "g1-acq.amod"), "utf8");
const ruleLine = amod.split("\n").find((l) => /^\d+,\s*\d+,\s*/.test(l));
const [rxText, embedded] = [ruleLine.split(", ").slice(2).join(", ").replace(/, [A-Za-z0-9+/=]+$/, ""), ruleLine.split(", ").pop()];
const rx = new RegExp(rxText);
assert.ok(rx.test("https://one.google.com/ai?hl=id"), "A8a amod rule matches one.google.com/ai URLs");
assert.ok(!/\\\\/.test(rxText), "A8b amod rule uses single escapes");
assert.strictEqual(Buffer.from(embedded, "base64").toString("utf8"), src, "A8c amod embeds this exact script");

console.log("anywhere-port: ALL PASS");

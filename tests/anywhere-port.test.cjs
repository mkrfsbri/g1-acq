// tests/anywhere-port.test.cjs — one runnable check for the Anywhere v7.11 port.
// Emulates the Anywhere JS API and asserts rewrite + collector behavior.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "g1-acq-anywhere.js"), "utf8");
const logs = [];
global.Anywhere = {
  codec: { utf8: { decode: (b) => b, encode: (s) => s } },
  log: { info: (m) => logs.push("I " + m), warning: (m) => logs.push("W " + m) },
};
eval(src);

function run(body) {
  logs.length = 0;
  const ctx = { body };
  process(ctx);
  return ctx.body;
}

let b, o, col;

// A1: 2TB rewrite only fires when a 2TB 90p offer exists in the response
b = '{"sku":"g1.ios.2tb.m.v2","t":"g1.2tb.ai.12months_ip_90p"}';
o = run(b);
assert.ok(o.includes('"sku":"g1.2tb.ai.12months_ip_90p"'), "A1 2TB prefix -> 12-month target when 90p live");

// A1b: target absent from region catalog -> real 2TB plans stay untouched
b = '{"sku":"g1.ios.2tb.m.3month_ip_75p","t":"g1.ios.2tb.a.12month_ip_15p"}';
o = run(b);
assert.ok(o.includes('"sku":"g1.ios.2tb.m.3month_ip_75p"') && o.includes('"t":"g1.ios.2tb.a.12month_ip_15p"'), "A1b region guard keeps real 2TB plans");

// A2: 75p target listed in the region catalog -> 20TB rewritten
b = '{"a":"g1.20tb.3months_ip_75p.acq","b":"g1.ios.20tb.m.v2"}';
o = run(b);
assert.ok(!o.includes("g1.ios.20tb.m.v2") && o.match(/g1\.20tb\.3months_ip_75p\.acq/g).length === 2, "A2 20TB -> 3-month 75p when listed");

// A2b: 75p target not listed -> guard keeps the original SKU and logs it
b = '{"a":"g1.20tb.3months_ip_90p.acq","b":"g1.ios.20tb.m.v2"}';
o = run(b);
assert.ok(o.includes("g1.ios.20tb.m.v2"), "A2b unlisted 75p target leaves source as-is");
assert.ok(logs.some((l) => l.includes("not in region catalog")), "A2c guard skip logged");

// A3: 30TB -> Ultra 3-month 75p when listed
b = '{"a":"g1.ai.ultra.3months_ip_75p.acq","b":"g1.ios.30tb.ai.pro.m"}';
o = run(b);
assert.ok(o.match(/g1\.ai\.ultra\.3months_ip_75p\.acq/g).length === 2, "A3 30TB -> Ultra 3-month 75p");

// A3b: trial SKUs are no longer part of the v7.11 default
assert.ok(!/1month_eft/.test(src), "A3b no trial target in v7.11 port source");

// A4: complete-token guard
b = '{"a":"g1.ios.20tb.m.v2extra","b":"g1.20tb.3months_ip_75p.acq"}';
o = run(b);
assert.ok(o.includes("g1.ios.20tb.m.v2extra"), "A4 complete-token guard");

// A5: collector dedup + counts, com.google.gemini.* included (v7.11)
b = '{"a":"g1.ios.2tb.m.v2","b":"g1.ios.2tb.m.v2","c":"com.google.one.foo.bar","d":"com.google.gemini.2tb.ai.m.3month_ip_99p"}';
run(b);
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2 x2") && col.includes("com.google.one.foo.bar x1"), "A5 collector dedup+counts");
assert.ok(col.includes("com.google.gemini.2tb.ai.m.3month_ip_99p x1"), "A5b gemini namespace collected");

// A6: escaped dots collected, body untouched
b = '{"a":"g1\\u002eios\\u002e2tb\\u002em\\u002ev2"}';
o = run(b);
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2"), "A6a escaped dot collected");
assert.ok(o.includes("g1\\u002eios"), "A6b escaped dot body untouched (upstream semantics)");

// A7: single pass, no chained rewrite of the produced target
b = '{"a":"g1.ios.20tb.m.v2","b":"g1.20tb.3months_ip_75p.acq"}';
o = run(b);
assert.ok(o.match(/g1\.20tb\.3months_ip_75p\.acq/g).length === 2, "A7 produced target not rewritten twice");

console.log("anywhere-port: ALL PASS");

// tests/anywhere-port.test.cjs — one runnable check for the Anywhere v7.6 port.
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

// A2: trial default absent, 3-month 90p fallback present -> fallback used
b = '{"a":"g1.20tb.3months_ip_90p.acq","b":"g1.ios.20tb.m.v2"}';
o = run(b);
assert.ok(!o.includes("g1.ios.20tb.m.v2") && o.match(/g1\.20tb\.3months_ip_90p\.acq/g).length === 2, "A2 90p fallback when trial absent");
assert.ok(logs.some((l) => l.includes("falling back g1.20tb.1month_eft.acq -> g1.20tb.3months_ip_90p.acq")), "A2b fallback logged with actual target");

// A3: neither trial nor 90p present (75p only) -> v7.6 keeps the 1month_eft default
b = '{"a":"g1.20tb.3months_ip_75p.acq","b":"g1.ios.20tb.m.v2"}';
o = run(b);
assert.ok(o.match(/g1\.20tb\.1month_eft\.acq/g).length === 1, "A3 default trial kept when no fallback present");
assert.ok(o.includes("g1.20tb.3months_ip_75p.acq"), "A3b unrelated 75p string untouched");

// A4: complete-token guard + 30TB maps to Ultra 1-month trial
b = '{"a":"g1.ios.20tb.m.v2extra","b":"g1.ios.30tb.ai.pro.m"}';
o = run(b);
assert.ok(o.includes("g1.ios.20tb.m.v2extra"), "A4a complete-token guard");
assert.ok(o.includes("g1.ai.ultra.1month_eft.acq"), "A4b 30TB mapped to Ultra trial");

// A5: collector dedup + counts
b = '{"a":"g1.ios.2tb.m.v2","b":"g1.ios.2tb.m.v2","c":"com.google.one.foo.bar"}';
run(b);
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2 x2") && col.includes("com.google.one.foo.bar x1"), "A5 collector dedup+counts");

// A6: escaped dots collected, body untouched
b = '{"a":"g1\\u002eios\\u002e2tb\\u002em\\u002ev2"}';
o = run(b);
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2"), "A6a escaped dot collected");
assert.ok(o.includes("g1\\u002eios"), "A6b escaped dot body untouched (upstream semantics)");

// A7: trial target present in catalog -> stays on trial (no fallback)
b = '{"a":"g1.ai.ultra.1month_eft.acq","b":"g1.ios.30tb.ai.pro.m"}';
o = run(b);
assert.ok(o.match(/g1\.ai\.ultra\.1month_eft\.acq/g).length === 2, "A7 trial present stays");

console.log("anywhere-port: ALL PASS");

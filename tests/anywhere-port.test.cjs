// tests/anywhere-port.test.cjs — one runnable check for the Anywhere v7.5 port.
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

b = '{"sku":"g1.ios.2tb.m.v2","x":1}';
o = run(b);
assert.ok(o.includes("g1.2tb.ai.12months_ip_90p"), "A1 2TB prefix -> 12-month target");

b = '{"a":"g1.20tb.3months_ip_90p.acq","b":"g1.ios.20tb.m.v2"}';
o = run(b);
assert.ok(!o.includes("g1.ios.20tb.m.v2") && o.match(/g1\.20tb\.3months_ip_90p\.acq/g).length === 2, "A2 90p present stays");

b = '{"a":"g1.20tb.3months_ip_75p.acq","b":"g1.ios.20tb.m.v2"}';
o = run(b);
assert.ok(o.match(/g1\.20tb\.3months_ip_75p\.acq/g).length === 2, "A3 fallback to 75p");

b = '{"a":"g1.ios.20tb.m.v2extra","b":"g1.ios.30tb.ai.pro.m"}';
o = run(b);
assert.ok(o.includes("g1.ios.20tb.m.v2extra"), "A4a complete-token guard");
assert.ok(o.includes("g1.ai.ultra.3months_ip_90p.acq"), "A4b 30TB mapped");

b = '{"a":"g1.ios.2tb.m.v2","b":"g1.ios.2tb.m.v2","c":"com.google.one.foo.bar"}';
run(b);
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2 x2") && col.includes("com.google.one.foo.bar x1"), "A5 collector dedup+counts");

b = '{"a":"g1\\u002eios\\u002e2tb\\u002em\\u002ev2"}';
o = run(b);
col = logs.find((l) => l.includes("collected"));
assert.ok(col && col.includes("g1.ios.2tb.m.v2"), "A6a escaped dot collected");
assert.ok(o.includes("g1\\u002eios"), "A6b escaped dot body untouched (upstream semantics)");

console.log("anywhere-port: ALL PASS");

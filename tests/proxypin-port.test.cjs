// tests/proxypin-port.test.cjs — one runnable check for the ProxyPin port.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "g1-acq-proxypin.js"), "utf8");
const logs = [];
global.console.log = (m) => logs.push(String(m));
eval(src);

async function run(body, host = "one.google.com") {
  logs.length = 0;
  const response = { statusCode: 200, headers: {}, body };
  const out = await onResponse({}, { host }, response);
  return out;
}

(async () => {
  // P1: 20TB -> 75p when the target is listed
  let r = await run('{"a":"g1.20tb.3months_ip_75p.acq","b":"g1.ios.20tb.m.v2"}');
  assert.ok(r.body.includes('"b":"g1.20tb.3months_ip_75p.acq"'), "P1 20TB -> 75p");

  // P2: target absent -> untouched, guard logged
  r = await run('{"b":"g1.ios.20tb.m.v2"}');
  assert.ok(r.body.includes('"b":"g1.ios.20tb.m.v2"'), "P2 catalog guard");
  assert.ok(logs.some((l) => l.includes("not in region catalog")), "P2 logged");

  // P3: 30TB -> Ultra 75p
  r = await run('{"a":"g1.ios.30tb.ai.pro.m","b":"g1.ai.ultra.3months_ip_75p.acq"}');
  assert.ok(r.body.includes('"a":"g1.ai.ultra.3months_ip_75p.acq"'), "P3 30TB -> Ultra 75p");

  // P4: 2TB rewrite only when a 2TB 90p offer is present
  r = await run('{"a":"g1.ios.2tb.m.v2","b":"g1.2tb.ai.12months_ip_90p"}');
  assert.ok(r.body.includes('"a":"g1.2tb.ai.12months_ip_90p"'), "P4 2TB -> 12mo 90p");
  r = await run('{"a":"g1.ios.2tb.m.3month_ip_75p"}');
  assert.ok(r.body.includes("g1.ios.2tb.m.3month_ip_75p"), "P4b region guard");

  // P5: other hosts untouched
  r = await run('{"a":"g1.ios.20tb.m.v2"}', "play.google.com");
  assert.ok(r.body.includes("g1.ios.20tb.m.v2"), "P5 host scope");

  // P6: collector dedup
  await run('{"a":"g1.ios.2tb.m.v2","b":"g1.ios.2tb.m.v2"}');
  assert.ok(logs.some((l) => l.includes("g1.ios.2tb.m.v2 x2")), "P6 collector counts");

  process.stdout.write("proxypin-port: ALL PASS\n");
})();

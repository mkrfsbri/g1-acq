// g1-acq-proxypin.js — Google One SKU mapping for ProxyPin (iOS / Android / desktop).
// Port of upstream crhywun/g1-acq v7.10.0 (default mode discount75).
// Install: ProxyPin -> Script -> new script, paste this file, enable it for host
// one.google.com. Mapping, guards and log lines are identical to the Anywhere port.
const VERSION = "v7.10";
const HOST = "one.google.com";
const TARGET = "g1.2tb.ai.12months_ip_90p";
const SOURCE_PREFIX = "g1.ios.2tb.";
const SKU_MAP = {
  "g1.ios.20tb.m.v2": "g1.20tb.3months_ip_75p.acq",
  "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_75p.acq"
};

async function onResponse(context, request, response) {
  if (request.host !== HOST || !response.body) return response;
  const body = response.body;

  // Collector: every g1.* / com.google.one.* ID, deduped, with counts.
  const text = body.replace(/\\u002e|\\x2e|&#0*46;|&#x0*2e;|&period;/gi, ".");
  const found = {};
  let m;
  const token = /(^|[^A-Za-z0-9._@%-])((?:g1\.|com\.google\.one\.)[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g;
  while ((m = token.exec(text)) !== null) found[m[2]] = (found[m[2]] || 0) + 1;
  const ids = Object.keys(found).sort();
  console.log("[g1-acq] " + VERSION + " collected " + ids.length + " id(s): " +
    (ids.map((id) => id + " x" + found[id]).join(", ") || "none"));

  // 2TB target is a US-market SKU: only map when the response carries a 2TB 90p offer.
  const targetLive = ids.some((id) => id.includes("2tb") && id.includes("90p"));

  let total = 0;
  const out = body.replace(
    /(^|[^A-Za-z0-9._@%-])(g1\.[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g,
    (match, before, id) => {
      let to;
      if (id.startsWith(SOURCE_PREFIX) && id.length > SOURCE_PREFIX.length) {
        if (!targetLive) return match;
        to = TARGET;
      } else if (Object.prototype.hasOwnProperty.call(SKU_MAP, id)) {
        to = SKU_MAP[id];
      } else {
        return match;
      }
      // Catalog guard: a target the storefront does not sell gets the checkout
      // rejected ("Pembelian belum selesai"), so it is never substituted.
      if (!Object.prototype.hasOwnProperty.call(found, to)) {
        console.log("[g1-acq] " + VERSION + " " + to + " not in region catalog, " + id + " left as-is");
        return match;
      }
      total += 1;
      console.log("[g1-acq] " + id + " -> " + to);
      return before + to;
    }
  );

  console.log("[g1-acq] " + VERSION + (total ? " rewrote " + total + " occurrence(s)" : " no match"));
  if (total) response.body = out;
  return response;
}

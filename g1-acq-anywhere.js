// g1-acq-anywhere.js — Google One SKU mapping, Anywhere port of upstream v7.12
// (github.com/crhywun/g1-acq tag v7.12.0). Every v7.12 preset is ported below;
// pick one with ACTIVE. If the response lists no target, the rewrite is skipped
// and logged (region catalog guard) so App Store never sees an unsold SKU.
// Cross-namespace targets (g1.ios.* -> g1.* / com.google.*) need the target to
// be live in the response or to be an _eft trial, which the storefront never
// enumerates. Same-namespace variants (g1.ios.x -> g1.ios.y) pass through,
// because the server resolves them itself.
// Logs every g1.* / com.google.one.* / com.google.gemini.* ID (dedup).
// No network calls, body edits only.
//
// Presets (upstream rule sets, verified against sku-catalog.json):
//   pro-12months-eft   2TB/Pro  12 months free, then $19.99/mo    <- default
//   pro-6months-eft    2TB/Pro  6 months free
//   pro-12months-75p   2TB/Pro  $4.99/mo x12 = $59.88 (75% off $19.99)
//   pro-12months-90p   2TB/Pro  12-month 90p intro price
//   pro-1yuan          2TB/Pro  3-month 99p Gemini line (~1 CNY/mo)
//   tr-ultra-20tb      20TB     1989.99 TRY record
//   tr-ultra-30tb      30TB     2949.99 TRY record
//   ultra-75p          20TB+30TB 3-month 75p promos
var PRESETS = {
  "pro-12months-eft":  { prefix: "g1.2tb.ai.12months_eft" },
  "pro-6months-eft":   { prefix: "g1.2tb.ai.6months_eft" },
  "pro-12months-75p":  { prefix: "g1.2tb.ai.12months_ip_75p" },
  "pro-12months-90p":  { prefix: "g1.2tb.ai.12months_ip_90p" },
  "pro-1yuan":         { prefix: "com.google.gemini.2tb.ai.m.3month_ip_99p" },
  "tr-ultra-20tb":     { rules: { "g1.ios.20tb.m.v2": "g1.ios.20tb.m" } },
  "tr-ultra-30tb":     { rules: { "g1.ios.30tb.ai.pro.m": "g1.ios.30tb.m" } },
  "ultra-75p":         { rules: {
    "g1.ios.20tb.m.v2": "g1.20tb.3months_ip_75p.acq",
    "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_75p.acq"
  } }
};
var ACTIVE = "pro-12months-eft";

function process(ctx) {
  var preset = PRESETS[ACTIVE];
  if (!preset) {
    Anywhere.log.warning("[g1-acq] v7.12 unknown preset " + ACTIVE + ", no rewrite");
    return;
  }
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  var TARGET = preset.prefix || "";
  var PREFIX = "g1.ios.2tb.";
  var SKU_MAP = preset.rules || {};

  // Collector: every g1.* / com.google.one.* / com.google.gemini.* ID, deduped.
  // Log-only: Anywhere persistent storage API unverified, upstream uses
  // $persistentStore + a local report page (Shadowrocket-only features).
  var text = body.replace(/\\u002e|\\x2e|&#0*46;|&#x0*2e;|&period;/gi, ".");
  var token = /(^|[^A-Za-z0-9._@%-])((?:g1\.|com\.google\.(?:one|gemini)\.)[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g;
  var found = {}, m;
  while ((m = token.exec(text)) !== null) {
    found[m[2]] = (found[m[2]] || 0) + 1;
  }
  var ids = Object.keys(found).sort();
  Anywhere.log.info("[g1-acq] v7.12 " + ACTIVE + " collected " + ids.length + " id(s): " +
    (ids.map(function (id) { return id + " x" + found[id]; }).join(", ") || "none"));

  function live(id) { return Object.prototype.hasOwnProperty.call(found, id); }
  // A SKU the storefront does not sell makes App Store answer
  // "Pembelian belum selesai", so a false skip costs one promo while a false
  // rewrite kills checkout. _eft trials and same-namespace variants bypass.
  function allowed(to) {
    return to.indexOf("g1.ios.") === 0 || to.indexOf("com.google.") === 0 || to.indexOf("_eft") !== -1 || live(to);
  }
  var targetLive = !TARGET || allowed(TARGET);
  if (TARGET && !targetLive) {
    Anywhere.log.info("[g1-acq] v7.12 2TB target " + TARGET + " not in region catalog, 2TB rewrite skipped");
  }

  var total = 0;
  var out = body.replace(
    /(^|[^A-Za-z0-9._@%-])(g1\.[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g,
    function (match, before, id) {
      var to;
      if (TARGET && id.indexOf(PREFIX) === 0 && id.length > PREFIX.length) {
        if (!targetLive) return match;
        to = TARGET;
      } else if (Object.prototype.hasOwnProperty.call(SKU_MAP, id)) {
        to = SKU_MAP[id];
        if (!allowed(to)) {
          Anywhere.log.warning("[g1-acq] v7.12 " + to + " not in region catalog, " + id + " left as-is");
          return match;
        }
      } else {
        return match;
      }
      total += 1;
      Anywhere.log.info("[g1-acq] " + id + " -> " + to);
      return before + to;
    }
  );

  Anywhere.log.info(total ? "[g1-acq] v7.12 " + ACTIVE + " rewrote " + total + " occurrence(s)"
                          : "[g1-acq] v7.12 " + ACTIVE + " no match");
  if (total) ctx.body = Anywhere.codec.utf8.encode(out);
}

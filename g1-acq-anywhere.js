// g1-acq-anywhere.js — Google One SKU mapping, Anywhere port of upstream v7.11
// (github.com/crhywun/g1-acq tag v7.11.0, default preset "ultra-75p").
// Maps the iOS 2TB annual SKUs to the 12-month 90p Pro offer and 20TB / 30TB to
// their 3-month 75p promos, each only when the response itself lists the target
// (region catalog guard). Logs every g1.* / com.google.one.* /
// com.google.gemini.* ID found in the response (dedup) for mapping new tiers.
// No network calls, body edits only.
//
// pro-1yuan preset from v7.11: swap SKU_MAP for
//   "g1.ios.20tb.m.v2": "com.google.gemini.2tb.ai.m.3month_ip_99p"
function process(ctx) {
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  var TARGET = "g1.2tb.ai.12months_ip_90p";
  var SOURCE_PREFIX = "g1.ios.2tb.";
  var SKU_MAP = {
    "g1.ios.20tb.m.v2": "g1.20tb.3months_ip_75p.acq",
    "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_75p.acq"
  };

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
  Anywhere.log.info("[g1-acq] v7.11 collected " + ids.length + " id(s): " +
    (ids.map(function (id) { return id + " x" + found[id]; }).join(", ") || "none"));

  // Region guard: rewrite only to a target this response actually lists.
  // A SKU the storefront does not sell makes App Store answer
  // "Pembelian belum selesai", so a false skip costs one promo while a false
  // rewrite kills checkout.
  function live(id) { return Object.prototype.hasOwnProperty.call(found, id); }
  var targetLive = ids.some(function (id) {
    return id.indexOf("2tb") !== -1 && id.indexOf("90p") !== -1;
  });
  if (!targetLive) {
    Anywhere.log.info("[g1-acq] v7.11 2TB target 90p not in region catalog, 2TB rewrite skipped");
  }

  // Rewrite: complete-token match, single pass.
  var total = 0;
  var out = body.replace(
    /(^|[^A-Za-z0-9._@%-])(g1\.[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g,
    function (match, before, id) {
      var isAnnual = id.indexOf(SOURCE_PREFIX) === 0 && id.length > SOURCE_PREFIX.length;
      var to;
      if (isAnnual) {
        if (!targetLive) return match;
        to = TARGET;
      } else if (Object.prototype.hasOwnProperty.call(SKU_MAP, id)) {
        to = SKU_MAP[id];
        if (!live(to)) {
          Anywhere.log.warning("[g1-acq] v7.11 " + to + " not in region catalog, " + id + " left as-is");
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

  Anywhere.log.info(total ? "[g1-acq] v7.11 rewrote " + total + " occurrence(s)" : "[g1-acq] v7.11 no match");
  if (total) ctx.body = Anywhere.codec.utf8.encode(out);
}

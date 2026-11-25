// g1-acq-anywhere.js — Google One SKU mapping, Anywhere port of upstream v7.6
// (github.com/crhywun/g1-acq tag v7.6.0).
// Rewrites the original iOS 2TB SKU to the 12-month 90p Pro offer and maps
// 20TB / 30TB to their Ultra 1-month free-trial SKUs with 3-month 90p
// fallbacks. Logs every g1.* / com.google.one.* ID found in the response
// (dedup) for mapping new tiers. No network calls, body edits only.
function process(ctx) {
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  var TARGET = "g1.2tb.ai.12months_ip_90p";
  var SOURCE_PREFIX = "g1.ios.2tb.";
  var SKU_MAP = {
    "g1.ios.20tb.m.v2": "g1.20tb.1month_eft.acq",
    "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.1month_eft.acq"
  };
  var FALLBACK = {
    "g1.20tb.1month_eft.acq": "g1.20tb.3months_ip_90p.acq",
    "g1.ai.ultra.1month_eft.acq": "g1.ai.ultra.3months_ip_90p.acq"
  };

  // Promo tiers actually present in this response (fallback basis)
  var observed = body.match(/g1\.[a-z0-9._]{2,60}acq/g) || [];

  // Collector: every g1.* / com.google.one.* ID, deduped, with counts.
  // Log-only: Anywhere persistent storage API unverified, upstream uses
  // $persistentStore + a local report page (Shadowrocket-only features).
  var text = body.replace(/\\u002e|\\x2e|&#0*46;|&#x0*2e;|&period;/gi, ".");
  var token = /(^|[^A-Za-z0-9._@%-])((?:g1\.|com\.google\.one\.)[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g;
  var found = {}, m;
  while ((m = token.exec(text)) !== null) {
    found[m[2]] = (found[m[2]] || 0) + 1;
  }
  var ids = Object.keys(found).sort();
  Anywhere.log.info("[g1-acq] v7.6 collected " + ids.length + " id(s): " +
    (ids.map(function (id) { return id + " x" + found[id]; }).join(", ") || "none"));

  // Region guard: the 12-month 90p target is a US-market SKU. Only map the
  // 2TB sources when the response itself carries any 2TB 90p offer, so the
  // real regional 2TB plans stay purchasable where 90p does not exist.
  var targetLive = ids.some(function (id) {
    return id.indexOf("2tb") !== -1 && id.indexOf("90p") !== -1;
  });
  if (!targetLive) {
    Anywhere.log.info("[g1-acq] v7.6 2TB target 90p not in region catalog, 2TB rewrite skipped");
  }

  // Rewrite: complete-token match, 2TB prefix -> 12-month 90p target (only
  // when the offer exists in this region), 20TB / 30TB via map with
  // observed-catalog fallback.
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
        if (observed.indexOf(to) === -1 && FALLBACK[to] && observed.indexOf(FALLBACK[to]) !== -1) {
          to = FALLBACK[to];
          Anywhere.log.warning("[g1-acq] primary tier not in catalog, falling back " + SKU_MAP[id] + " -> " + to);
        }
      } else {
        return match;
      }
      total += 1;
      Anywhere.log.info("[g1-acq] " + id + " -> " + to);
      return before + to;
    }
  );

  Anywhere.log.info(total ? "[g1-acq] v7.6 rewrote " + total + " occurrence(s)" : "[g1-acq] v7.6 no match");
  if (total) ctx.body = Anywhere.codec.utf8.encode(out);
}

// g1-acq-anywhere.js — Google One SKU mapping, Anywhere port of upstream v7.5
// (github.com/crhywun/g1-acq tag v7.5.0).
// Rewrites the original iOS 2TB SKU to the 12-month 90p Pro offer and keeps
// the 20TB / 30TB mappings with their 75p fallbacks. Logs every g1.* /
// com.google.one.* ID found in the response (dedup) for mapping new tiers.
// No network calls, body edits only.
function process(ctx) {
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  var TARGET = "g1.2tb.ai.12months_ip_90p";
  var SOURCE_PREFIX = "g1.ios.2tb.";
  var SKU_MAP = {
    "g1.ios.20tb.m.v2": "g1.20tb.3months_ip_90p.acq",
    "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_90p.acq"
  };
  var FALLBACK = {
    "g1.20tb.3months_ip_90p.acq": "g1.20tb.3months_ip_75p.acq",
    "g1.ai.ultra.3months_ip_90p.acq": "g1.ai.ultra.3months_ip_75p.acq"
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
  Anywhere.log.info("[g1-acq] v7.5 collected " + ids.length + " id(s): " +
    (ids.map(function (id) { return id + " x" + found[id]; }).join(", ") || "none"));

  // Rewrite: complete-token match, 2TB prefix -> 12-month 90p target,
  // 20TB / 30TB via map with observed-catalog fallback.
  var total = 0;
  var out = body.replace(
    /(^|[^A-Za-z0-9._@%-])(g1\.[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g,
    function (match, before, id) {
      var isAnnual = id.indexOf(SOURCE_PREFIX) === 0 && id.length > SOURCE_PREFIX.length;
      var to;
      if (isAnnual) {
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

  Anywhere.log.info(total ? "[g1-acq] v7.5 rewrote " + total + " occurrence(s)" : "[g1-acq] v7.5 no match");
  if (total) ctx.body = Anywhere.codec.utf8.encode(out);
}

// g1-acq.js — Google One /ai SKU mapping, Anywhere port (from Shadowrocket v6)
// Rewrites normal iOS subscription IDs to real promo tier IDs in the
// one.google.com/ai response. Catalog-aware: falls back to the 75p tier when
// the 90p tier is absent. No network calls, body edits only.
function process(ctx) {
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  // Promo tiers actually present in this response
  var raw = body.match(/g1\.[a-z0-9._]{2,60}acq/g) || [];
  var seen = {}, catalog = [];
  for (var i = 0; i < raw.length; i++) {
    if (!seen[raw[i]]) { seen[raw[i]] = 1; catalog.push(raw[i]); }
  }
  Anywhere.log.info("[g1-acq] promo tiers in catalog: " + (catalog.join(", ") || "none"));

  var SKU_MAP = {
    "g1.ios.20tb.m.v2": "g1.20tb.3months_ip_90p.acq",
    "g1.ios.30tb.ai.pro.m": "g1.ai.ultra.3months_ip_90p.acq"
  };
  var FALLBACK = {
    "g1.20tb.3months_ip_90p.acq": "g1.20tb.3months_ip_75p.acq",
    "g1.ai.ultra.3months_ip_90p.acq": "g1.ai.ultra.3months_ip_75p.acq"
  };

  var total = 0;
  var froms = Object.keys(SKU_MAP);
  for (var k = 0; k < froms.length; k++) {
    var from = froms[k];
    var n = body.split(from).length - 1;
    if (n === 0) continue;
    var to = SKU_MAP[from];
    if (catalog.indexOf(to) === -1 && FALLBACK[to] && catalog.indexOf(FALLBACK[to]) !== -1) {
      Anywhere.log.warning("[g1-acq] primary tier not in catalog, falling back " + to + " -> " + FALLBACK[to]);
      to = FALLBACK[to];
    }
    body = body.split(from).join(to);
    total += n;
    Anywhere.log.info("[g1-acq] " + from + " -> " + to + " x" + n);
  }

  Anywhere.log.info(total ? "[g1-acq] rewrote " + total + " occurrence(s)" : "[g1-acq] no match");
  if (total) ctx.body = Anywhere.codec.utf8.encode(body);
}

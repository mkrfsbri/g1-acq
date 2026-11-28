// g1-acq-probe.js — Google One SKU collector, Anywhere port. Collector ONLY:
// rewrites nothing, uploads nothing. Logs four views of every
// one.google.com/ai response:
//   1. SKU-like IDs (g1.* / com.google.one.* / com.google.gemini.*) with counts
//   2. every JSON key/value pair whose key looks plan-related (sku, product,
//      offer, tier, plan, period, price, trial)
//   3. short strings that look like offer tokens (acq / eft / Np)
//   4. per-SKU price pairing: amounts found near each g1.ios.* SKU, so a plan
//      id can be read against its price without opening the App Store sheet
// No network calls, body never modified.
function process(ctx) {
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  var text = body.replace(/\\u002e|\\x2e|&#0*46;|&#x0*2e;|&period;/gi, ".");

  // 1. SKU collection
  var token = /(^|[^A-Za-z0-9._@%-])((?:g1\.|com\.google\.(?:one|gemini)\.)[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g;
  var found = {}, m;
  while ((m = token.exec(text)) !== null) {
    found[m[2]] = (found[m[2]] || 0) + 1;
  }
  var ids = Object.keys(found).sort();
  Anywhere.log.info("[g1-acq-probe] collected " + ids.length + " id(s): " +
    (ids.map(function (id) { return id + " x" + found[id]; }).join(", ") || "none"));

  // 2. plan-related key/value pairs — shows the fields a SKU may be split across
  var pair = /"([A-Za-z0-9_]{2,40})"\s*:\s*"([^"\\]{1,120})"/g;
  var pairs = [], seen = {};
  while ((m = pair.exec(text)) !== null) {
    if (!/sku|product|offer|tier|plan|period|price|trial/i.test(m[1])) continue;
    var line = m[1] + "=" + m[2];
    if (seen[line] || pairs.length >= 40) continue;
    seen[line] = 1;
    pairs.push(line);
  }
  if (pairs.length) Anywhere.log.info("[g1-acq-probe] fields: " + pairs.join(" | "));

  // 3. offer-token strings (split suffixes, discount tags)
  var tok = /"([A-Za-z0-9_.-]{2,40}(?:acq|eft)[A-Za-z0-9_.-]{0,20})"|"([A-Za-z0-9_]{1,20}_\d{1,2}p)"|"(\d{1,2}p)"/g;
  var toks = [], seenT = {};
  while ((m = tok.exec(text)) !== null) {
    var t = m[1] || m[2] || m[3];
    if (seenT[t] || toks.length >= 40) continue;
    seenT[t] = 1;
    toks.push(t);
  }
  if (toks.length) Anywhere.log.info("[g1-acq-probe] offer tokens: " + toks.join(" | "));

  // 4. per-SKU price pairing. Google ships prices as ["IDR",14500] next to the
  // plan entry; some locales add "Rp 19.000". Both forms are read out of a
  // window that starts at each distinct g1.ios.* occurrence.
  // ponytail: fixed 400-char window; widen if a price sits further away.
  var priceRe = /"([A-Z]{3})",\s*(\d{2,9})|(?:Rp|IDR|\$|¥|€|₺|₫|₹)\s?(\d[\d.,]{1,12})/g;
  var rows = [], seenSku = {};
  var skuRe = /g1\.ios\.[A-Za-z0-9._-]+/g;
  while ((m = skuRe.exec(text)) !== null) {
    var sku = m[0];
    if (seenSku[sku]) continue;
    seenSku[sku] = 1;
    var win = text.slice(m.index, m.index + 400), mm, amounts = [];
    priceRe.lastIndex = 0;
    while ((mm = priceRe.exec(win)) !== null) {
      var val = mm[1] ? mm[1] + " " + mm[2] : mm[3];
      if (amounts.indexOf(val) === -1) amounts.push(val);
      if (amounts.length >= 3) break;
    }
    rows.push(sku + " -> " + (amounts.join("/") || "no price nearby"));
    if (rows.length >= 12) break;
  }
  if (rows.length) Anywhere.log.info("[g1-acq-probe] prices: " + rows.join(" | "));
}

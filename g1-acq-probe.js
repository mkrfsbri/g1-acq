// g1-acq-probe.js — Google One SKU collector, Anywhere port. Collector ONLY:
// logs every g1.* / com.google.one.* / com.google.gemini.* ID found in the
// response (dedup, with counts) and never rewrites anything. Use it to
// enumerate the real catalog of any region/account, then map targets with the
// main g1-acq module. No network calls, body edits never.
function process(ctx) {
  var body = Anywhere.codec.utf8.decode(ctx.body);
  if (!body) return;

  var text = body.replace(/\\u002e|\\x2e|&#0*46;|&#x0*2e;|&period;/gi, ".");
  var token = /(^|[^A-Za-z0-9._@%-])((?:g1\.|com\.google\.(?:one|gemini)\.)[A-Za-z0-9._-]+)(?=$|[^A-Za-z0-9._-])/g;
  var found = {}, m;
  while ((m = token.exec(text)) !== null) {
    found[m[2]] = (found[m[2]] || 0) + 1;
  }
  var ids = Object.keys(found).sort();
  Anywhere.log.info("[g1-acq-probe] collected " + ids.length + " id(s): " +
    (ids.map(function (id) { return id + " x" + found[id]; }).join(", ") || "none"));
  // raw plan strings are the richest source: log any line mentioning a
  // storage tier or trial token so short-lived promos are not missed
  var raw = text.match(/"[^"]*(?:tb|eft|1month|3month|12month|ip_|_p)[^"]*"/g) || [];
  if (raw.length) {
    Anywhere.log.info("[g1-acq-probe] raw fields (" + raw.length + "): " +
      raw.slice(0, 40).join(" | "));
  }
}

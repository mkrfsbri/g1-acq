# g1-acq

[![Telegram](https://img.shields.io/badge/Telegram-AI_Deals_Group-26A5E4?logo=telegram&logoColor=white)](https://t.me/muihbb)

> 💬 **AI Deals Group**: https://t.me/muihbb — discussing AI subscription deals and savings

Google One (iOS) subscription-page SKU mapping module for **Shadowrocket** and **Anywhere**.

This repository tracks the upstream module [crhywun/g1-acq](https://github.com/crhywun/g1-acq) (`v7.5.0`) and adds an **Anywhere port** of the same feature set. Upstream is the canonical Shadowrocket release; this repo mirrors it so the Anywhere port and the Shadowrocket scripts live in one place.

**What v7.5 does:**

- **Passive SKU collection**: every `g1.*` / `com.google.one.*` ID appearing in `one.google.com` responses is collected (dedup, counts, up to 300 IDs), plus diagnostics for the last 10 responses
- **2TB → 12-month Pro offer**: the original iOS 2TB SKU (`g1.ios.2tb.*`) is rewritten to `g1.2tb.ai.12months_ip_90p` (12 months at the 90p promo price, user-specified candidate)
- **20TB / 30TB mappings** with 75p fallback when the 90p tier is absent from the response catalog
- **Local report page** (Shadowrocket only): open `https://one.google.com/g1-sku-report` in Safari to view collected IDs and export JSON

> Only product-ID strings in the response text are rewritten. Whether an order can actually be placed, and the price and benefits charged, are subject to the App Store checkout panel and the actual state of your Google One account. Response IDs prove the page carries the string, not that the store catalogs the product.

---

## Module addresses

**Shadowrocket — recommended: install the upstream release directly:**

```
https://cdn.jsdelivr.net/gh/crhywun/g1-acq@v7.5.0/g1-acq-v7.sgmodule
```

**Shadowrocket — mirror from this repo (identical scripts):**

```
https://cdn.jsdelivr.net/gh/mkrfsbri/g1-acq@main/g1-acq-v7.sgmodule
```

**Anywhere (module, this repo's port):**

```
https://raw.githubusercontent.com/mkrfsbri/g1-acq@main/g1-acq.amod
```

Script addresses (already referenced inside the modules, no separate entry needed):

```
https://cdn.jsdelivr.net/gh/mkrfsbri/g1-acq@main/g1-acq.js
https://cdn.jsdelivr.net/gh/mkrfsbri/g1-acq@main/g1-acq-anywhere.js
```

## Mapping table

| Original iOS IAP ID | Replaced with | Note |
|---|---|---|
| `g1.ios.2tb.*` (any complete SKU with this prefix) | `g1.2tb.ai.12months_ip_90p` | Original 2TB → 12-month Pro 90p offer (no `.acq` suffix) |
| `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_90p.acq` | 20TB monthly → promo tier |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_90p.acq` | 30TB AI Pro monthly → AI Ultra promo tier |

The 20TB / 30TB promo tiers must actually appear in the response's product catalog before the script replaces anything; when the primary tier is absent from the catalog but the backup tier (75p) is present, it automatically falls back to the backup:

| Primary (90p) | Backup (75p) |
|---|---|
| `g1.20tb.3months_ip_90p.acq` | `g1.20tb.3months_ip_75p.acq` |
| `g1.ai.ultra.3months_ip_90p.acq` | `g1.ai.ultra.3months_ip_75p.acq` |

Promo tier IDs are limited-time promotional products; their names and tiers change with Google's campaigns. The collection log lists every ID actually present in the current response — add or remove mapping entries based on that log.

## Installation (Shadowrocket)

The entry to the HTTPS decryption setting: config page → tap the **(i)** icon to the right of the active config → find **HTTPS Decryption** in the config edit page.

![Config page entry: tap the (i) icon next to shadowrocket.conf to enter the config editor, where HTTPS Decryption lives](docs-config-entry.png)

1. Keep the VPN on
2. Settings → **HTTPS Decryption** (MITM) → master switch on → certificate: generate and install → complete the two iOS steps:
   - Settings → General → VPN & Device Management → install the Shadowrocket profile
   - Settings → General → About → **Certificate Trust Settings** → enable trust for the Shadowrocket root certificate (skipping this makes decryption ineffective)
3. In the HTTPS Decryption hostname list, confirm `one.google.com` is present (added automatically when the module is on)
4. Config → Modules → `+` in the top right → paste the module address above → install
5. Confirm the module switch is lit, then long-press and reconnect once

Full install and on-device verification guide: [docs/pro-annual-test.md](docs/pro-annual-test.md).

## Installation (Anywhere, free and open source)

Requires iOS 18+.

1. Install [Anywhere](https://apps.apple.com/id/app/anywhere-proxy/id6758235178)
2. In the app, generate and install the root CA, then enable trust: iOS Settings → General → About → **Certificate Trust Settings** → enable the Anywhere root CA
3. Enable the app's MITM master switch
4. Modules → import the `.amod` file, or subscribe to:
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq@main/g1-acq.amod
   ```
5. Anywhere refuses to connect with zero configurations: import the blank direct profile first:
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq@main/anywhere-direct.yaml
   ```
6. Toggle the module on, connect the VPN
7. Google App → Google One management → subscription page → the 2TB / 20TB / 30TB plans
8. Verify: search the log for `[g1-acq]`; `v7.5 rewrote N occurrence(s)` means it is working

Anywhere port limits (vs Shadowrocket): no persistent storage and no local report page — the collector runs in log mode only, and there is no `g1-sku-report` page. Everything else (rewrite logic, fallback, ID logging) matches upstream v7.5.

## Scope of effect

- URL match (Shadowrocket): `^https://one\.google\.com/` for collection, `^https://one\.google\.com/ai\?` for rewriting; the local report page intercepts `/g1-sku-report` and never leaves the device
- URL match (Anywhere): `^https://one\.google\.com/ai\?` only
- MITM hostname: `one.google.com`
- QUIC blocking: the Shadowrocket module ships a rule that blocks UDP 443 so the Google App cannot bypass HTTPS decryption over HTTP/3; Anywhere has a built-in QUIC policy, no rule needed

## Usage flow (phone)

1. Open the **Google App** (the colorful G icon) → profile avatar → **Google One management**, and enter the subscription management page (this page's `/ai` response is what the module rewrites)
2. Open the 2TB / Pro plan for the 12-month offer test; open the actual 20TB / 30TB plans to verify the retained mappings
3. In the App Store checkout, verify the product name, period, first charge and renewal amount; benefits are subject to the Google One account state

![Google One Ultra plan selection panel: tap Subscribe on the 20TB tier](docs-ultra-plans.png)

> Note: the subscription page entered from the standalone Google One app goes through a native API and is outside this module's rewrite scope. Always enter from **Google One management inside the Google App**.

## Verification and troubleshooting

Shadowrocket: Data → Logs → Proxy, search for `g1-acq`:

| Log | Meaning |
|---|---|
| `g1-acq-v7.5 status=... addedCount=N candidates=N occurrences=N saved=yes/no` | Collection status, new IDs kept, deduped candidates, occurrence count, storage result |
| `g1-acq-v7.5 hits=N annualHits=N` | Total rewrites and 2TB/Pro rewrites |
| `source SKU -> target xN` / `fallback=75p` | Per-source rewrite result and fallback usage |
| Local report: `https://one.google.com/g1-sku-report` | On-device HTML report, JSON export, `?clear=1` manual reset |

Anywhere: search the log for `g1-acq`:

| Log | Meaning |
|---|---|
| `v7.5 collected N id(s): ...` | Every `g1.*` / `com.google.one.*` ID in the response, deduped with counts |
| `v7.5 rewrote N occurrence(s)` | Replacement executed |
| `primary tier not in catalog, falling back ...` | Automatically using the backup tier |

After changing mapping tables: `git push`, then clear the Shadowrocket cache once (Data → Clear All Data) and reconnect; jsDelivr caches for a few minutes — purge manually with `https://purge.jsdelivr.net/gh/mkrfsbri/g1-acq@main/g1-acq.js`. Anywhere subscribed modules refresh on their own schedule.

## Permissions and safety boundary

- **Traffic visibility**: the scripts match only HTTP responses of `one.google.com`; they can read and rewrite those response bodies. Traffic of any other domain is never read or modified
- **No outbound capability**: the scripts contain no network calls; all output goes to the on-device log / local report only
- **MITM scope**: only the single hostname `one.google.com` is appended; the CA certificate is generated and kept on the user's device and cannot be obtained by the module author
- **System permissions**: no iOS permissions requested (no notification/location/camera prompts); installation happens inside the proxy app only
- **Global side effect**: `[Rule]` blocks all UDP 443 (QUIC), which slows HTTP/3 for every app — a performance side effect with no privacy impact
- **Trust model**: script addresses point at this GitHub repository (or upstream) and the jsDelivr CDN. Installing means trusting the repository owner's future changes to the script (a malicious version could at most obtain cookies and page data of the single domain `one.google.com`; nothing else is reachable), plus the service integrity of GitHub / jsDelivr. The scripts are open source and can be reviewed by anyone; when distributing, replace `@main` with an exact commit hash to lock an immutable version

## Files

| File | Purpose |
|---|---|
| `g1-acq-v7.sgmodule` | Shadowrocket module: passive collection, three-tier rewrite, local report, response diagnostics |
| `g1-acq.js` | `g1-acq-v7.5` response script (upstream v7.5.0, Shadowrocket) |
| `g1-sku-report.js` | Local HTML report page + JSON export (Shadowrocket `http-request` script) |
| `g1-acq-anywhere.js` | Anywhere port of the v7.5 rewrite + log-mode collector (`process(ctx)` + `Anywhere.codec` API) |
| `g1-acq.amod` | Anywhere module (embeds the script above, import and use) |
| `anywhere-direct.yaml` | Blank direct profile so Anywhere can connect without a server |
| `g1-sku-scan.js` / `g1-sku-scan.sgmodule` | Upstream legacy standalone scanner (compat, not needed for the main flow) |
| `g1-pro-annual-test.js` / `g1-pro-annual-test.sgmodule` | Upstream legacy annual-test entry (compat, not needed for the main flow) |
| `docs/pro-annual-test.md` | Upstream guide: single-module usage, passive collection diagnostics, on-device 12-month offer verification |
| `tests/` | Offline test suites (upstream 27 tests + Anywhere port tests) |

## Offline verification

Node.js 18+, repository root:

```sh
node --test tests/sku-tools.test.cjs tests/anywhere-port.test.cjs
```

The upstream suite covers three-tier complete-ID matching, the fixed 2TB 12-month candidate, 90p-first / 75p-fallback behavior, URL scope, zero-match, report compatibility with older record versions, collection dedup and limits, and module script versions. The Anywhere suite covers the ported rewrite and collector behavior against a simulated `Anywhere` API. Test source IDs are synthetic samples, not store-listing or purchase evidence.

## Customization

- Add or remove tiers: edit the `TARGET` / `SKU_MAP` / `FALLBACK` tables at the top of `g1-acq.js` (or `g1-acq-anywhere.js`, then re-embed the base64 into `g1-acq.amod`)
- Price rewriting: not implemented; if needed, append a regex replacement of `price_amount_micros` after the replacement loop
- The scripts have no telemetry and no external dependencies

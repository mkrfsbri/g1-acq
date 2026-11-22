# g1-acq

[![Telegram](https://img.shields.io/badge/Telegram-AI_Deals_Group-26A5E4?logo=telegram&logoColor=white)](https://t.me/muihbb)

> 💬 **AI Deals Group**: https://t.me/muihbb — discussing AI subscription deals and savings

Google One (iOS) subscription-page SKU mapping module for **Shadowrocket** and **Anywhere**.

It rewrites the raw iOS in-app purchase IDs of the 20TB and 30TB monthly tiers in the response of the `one.google.com/ai` subscription page into the IDs of real promotional tiers, so the subscription panel brings up the App Store checkout at the promo price directly.

> Only product-ID strings in the response text are rewritten. Whether an order can actually be placed, and the price and benefits charged, are subject to the App Store checkout panel and the actual state of your Google One account.

---

## Module addresses

**Shadowrocket (module, phone fills in this one line):**

```
https://cdn.jsdelivr.net/gh/mkrfsbri/g1-acq@main/g1-acq.sgmodule
```

**Anywhere (module):**

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
| `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_90p.acq` | 20TB monthly → promo tier |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_90p.acq` | 30TB AI Pro monthly → AI Ultra promo tier |

Both promo tier names must actually appear in the response's product catalog before the script replaces anything; when the primary tier is absent from the catalog but the backup tier (75p) is present, it automatically falls back to the backup:

| Primary (90p) | Backup (75p) |
|---|---|
| `g1.20tb.3months_ip_90p.acq` | `g1.20tb.3months_ip_75p.acq` |
| `g1.ai.ultra.3months_ip_90p.acq` | `g1.ai.ultra.3months_ip_75p.acq` |

Promo tier IDs are limited-time promotional products; their names and tiers change with Google's campaigns. The catalog probe log lists all promo tiers actually present in the current response — add or remove `SKU_MAP` entries based on that log.

## Installation (Shadowrocket)

The entry to the HTTPS decryption setting: config page → tap the **(i)** icon to the right of the active config → find **HTTPS Decryption** in the config edit page.

![Config page entry: tap the (i) icon next to shadowrocket.conf to enter the config editor, where HTTPS Decryption lives](docs-config-entry.png)

1. Keep the VPN on
2. Settings → **HTTPS Decryption** (MITM) → master switch on → certificate: generate and install → complete the two iOS steps:
   - Settings → General → VPN & Device Management → install the Shadowrocket profile
   - Settings → General → About → **Certificate Trust Settings** → enable trust for the Shadowrocket root certificate (skipping this makes decryption ineffective)
3. In the HTTPS Decryption hostname list, confirm `one.google.com` is present (added automatically when the module is on; if the log never shows `[g1-acq]` and the connection shows undecrypted, append `one.google.com` to the hostname list manually)
4. Config → Modules → `+` in the top right → paste the module address above → install
5. Confirm the module switch is lit, then long-press and reconnect once

## Installation (Anywhere, free and open source)

Requires iOS 18+.

1. Install [Anywhere](https://apps.apple.com/id/app/anywhere-proxy/id6758235178)
2. In the app, generate and install the root CA, then enable trust: iOS Settings → General → About → **Certificate Trust Settings** → enable the Anywhere root CA
3. Enable the app's MITM master switch
4. Modules → import the `.amod` file, or subscribe to:
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq@main/g1-acq.amod
   ```
5. Toggle the module on, connect the VPN
6. Google App → Google One management → subscription page → subscribe to the 20TB / 30TB tier
7. Verify: search the log for `[g1-acq]`; `rewrote N occurrence(s)` means it is working

## Scope of effect

- URL match: `^https://one\.google\.com/ai\?` (subscription entry page only, no site-wide interception)
- MITM hostname: `one.google.com`
- QUIC blocking: the Shadowrocket module ships a rule that blocks UDP 443 so the Google App cannot bypass HTTPS decryption over HTTP/3; Anywhere has a built-in QUIC policy, no rule needed

## Usage flow (phone)

1. Open the **Google App** (the colorful G icon) → profile avatar → **Google One management**, and enter the subscription management page (this page's `/ai` response is what the module rewrites)
2. In the Ultra plan selection panel, tap **Subscribe** on the 20TB tier directly — the App Store checkout comes up at the promo price (about 10% of the regular price); the 30TB tier works the same way

![Google One Ultra plan selection panel: tap Subscribe on the 20TB tier](docs-ultra-plans.png)

> Note: the subscription page entered from the standalone Google One app goes through a native API and is outside this module's rewrite scope. Always enter from **Google One management inside the Google App**.

## Verification and troubleshooting

Data → Logs → Proxy, search for `g1-acq`:

| Log | Meaning |
|---|---|
| `[g1-acq] v6 loaded` / `promo tiers in catalog: ...` | Script loaded; the catalog probe lists the promo tiers present in the response |
| `primary tier not in catalog, falling back ...` | Automatically using the backup tier |
| `rewrote N occurrence(s)` | Replacement executed |
| No `g1-acq` at all | Script not triggered: check the VPN / HTTPS decryption (certificate install + trust switch) / module switch |

After changing `SKU_MAP`: `git push` locally, then clear the Shadowrocket cache once (Data → Clear All Data) and reconnect to fetch the new script; jsDelivr caches for a few minutes — purge manually with `https://purge.jsdelivr.net/gh/mkrfsbri/g1-acq@main/g1-acq.js`. Anywhere subscribed modules refresh on their own schedule.

## Permissions and safety boundary

- **Traffic visibility**: the script matches only HTTP responses of `one.google.com/ai`; it can read and rewrite that page's response body. Traffic of any other domain is never read or modified
- **No outbound capability**: the script contains no `$httpClient` or similar network calls; all output goes to the on-device log only
- **MITM scope**: only the single hostname `one.google.com` is appended; the CA certificate is generated and kept on the user's device and cannot be obtained by the module author
- **System permissions**: no iOS permissions requested (no notification/location/camera prompts); installation happens inside the proxy app only
- **Global side effect**: `[Rule]` blocks all UDP 443 (QUIC), which slows HTTP/3 for every app — a performance side effect with no privacy impact
- **Trust model**: script addresses point at this GitHub repository and the jsDelivr CDN. Installing means trusting the repository owner's future changes to the script (a malicious version could at most obtain cookies and page data of the single domain `one.google.com/ai`; nothing else is reachable), plus the service integrity of GitHub / jsDelivr. The scripts are open source and can be reviewed by anyone; when distributing, replace `@main` with an exact commit hash to lock an immutable version

## Files

| File | Purpose |
|---|---|
| `g1-acq.sgmodule` | Shadowrocket module (rules + script reference + MITM) |
| `g1-acq.js` | Response rewrite script (v6, Shadowrocket) |
| `g1-acq-anywhere.js` | Response rewrite script (Anywhere: `process(ctx)` + `Anywhere.codec` API) |
| `g1-acq.amod` | Anywhere module (embeds the script above, import and use) |

## Customization

- Add or remove tiers: edit only the `SKU_MAP` and `FALLBACK` tables at the top of `g1-acq.js` (or `g1-acq-anywhere.js`, then re-embed the base64 into `g1-acq.amod`)
- Price rewriting: not implemented; if needed, append a regex replacement of `price_amount_micros` after the replacement loop
- The scripts have no telemetry and no external dependencies

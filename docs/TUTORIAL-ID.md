# Tutorial Penggunaan g1-acq

Panduan pakai modul `g1-acq` di iPhone: ProxyPin, Anywhere, dan Shadowrocket.

Modul ini memetakan SKU (product ID) langganan Google One di respons `one.google.com` supaya halaman plan menampilkan/menawarkan produk lain yang lebih murah. **Modul bukan penjamin harga.** Kalau produk target tidak dijual di storefront region akun lu, checkout akan ditolak. Itu batas Apple, bukan bug modul.

---

## 0. Prasyarat semua cara

- iPhone iOS 15+ (ProxyPin/Anywhere) atau iOS apa pun untuk Shadowrocket
- Akun Google yang punya akses Google One
- Apple ID untuk checkout (region Apple ID = region harga yang bisa dibeli)
- **Selalu** verifikasi sheet checkout sebelum konfirmasi: nama produk, tier, periode, harga mulai, harga renewal

Masuk ke halaman plan **selalu** lewat: aplikasi **Google App** (ikon G warna-warni) → avatar → **Google One management**. Kalau lewat aplikasi Google One standalone, halaman itu pakai API native dan di luar jangkauan modul.

---

## 1. Cara A: ProxyPin (gratis, open source)

### Install
1. Install [ProxyPin](https://apps.apple.com/id/app/proxypin-tangkap-trafik/id6450932949)
2. Buka app → start capture (VPN) → ikuti wizard pemasangan sertifikat:
   - Install profil CA
   - iOS Settings → General → **VPN & Device Management** → install profil ProxyPin
   - iOS Settings → General → About → **Certificate Trust Settings** → aktifkan trust untuk sertifikat ProxyPin
3. Filter domain: tambahkan `one.google.com` (kalau tidak difilter, semua trafik lewat MITM dan HP jadi lambat)

### Pasang script
4. Tab **Script** → tambah script baru → tempel isi file:
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq/main/g1-acq-proxypin.js
   ```
5. Simpan → **enable** script (matikan kalau tidak dipakai)

### Verifikasi
6. Buka Google App → Google One management → buka plan apa pun (2TB / 20TB / 30TB)
7. Lihat console script ProxyPin. Baris yang harus muncul:
   ```
   [g1-acq] v7.11 collected 12 id(s): ...
   ```
8. Kalau ada target yang dieksekusi:
   ```
   [g1-acq] g1.ios.20tb.m.v2 -> g1.20tb.3months_ip_75p.acq
   [g1-acq] v7.11 rewrote 16 occurrence(s)
   ```
9. Kalau target tidak ada di katalog region:
   ```
   [g1-acq] v7.11 g1.20tb.3months_ip_75p.acq not in region catalog, g1.ios.20tb.m.v2 left as-is
   ```

Setelah `rewrote`, tap plan dan **baca sheet checkout. Jangan konfirmasi** sampai nama produk dan harganya sesuai harapan.

---

## 2. Cara B: Anywhere

1. Install [Anywhere](https://apps.apple.com/id/app/anywhere-proxy/id6758235178) (iOS 18+)
2. Buat + install root CA, lalu trust di Settings → General → About → **Certificate Trust Settings**
3. Aktifkan MITM master switch
4. Modules → import:
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq/main/g1-acq.amod
   ```
5. Anywhere menolak connect tanpa config: import juga profil direct kosong
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq/main/anywhere-direct.yaml
   ```
6. Aktifkan modul, connect VPN
7. Buka plan di Google App, cek Log:
   ```
   [g1-acq] v7.11 collected ...
   [g1-acq] v7.11 rewrote N occurrence(s)
   ```

Batasan port Anywhere: tanpa penyimpanan persisten dan tanpa halaman report lokal. Kolektor jalan mode log saja.

---

## 3. Cara C: Shadowrocket (fitur paling lengkap)

1. Config → tap ikon **(i)** di kanan config aktif → cari **HTTPS Decryption**
2. Master switch on → generate + install certificate → dua langkah iOS:
   - Settings → General → VPN & Device Management → install profil Shadowrocket
   - Settings → General → About → **Certificate Trust Settings** → aktifkan trust
3. Pastikan `one.google.com` ada di daftar hostname decryption
4. Config → Modules → **+** → tempel:
   ```
   https://cdn.jsdelivr.net/gh/mkrfsbri/g1-acq@v7.11.0/g1-acq-ultra-discount.sgmodule
   ```
5. Modul on → long-press → reconnect
6. Buka `https://one.google.com/g1-sku-report` di Safari untuk melihat SKU terkumpul, **mengedit mapping**, memakai preset, dan export JSON

Halaman report hanya dimiliki Shadowrocket. Di ProxyPin/Anywhere, mapping diubah dengan mengedit file script.

---

## 4. Mapping default (mode `discount75`)

| SKU asli | Diganti jadi | Catatan |
|---|---|---|
| `g1.ios.2tb.*` | `g1.2tb.ai.12months_ip_90p` | hanya kalau region punya offer 2TB 90p |
| `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_75p.acq` | 75% off 3 bulan |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_75p.acq` | 75% off 3 bulan |

Arti akhiran harga: `90p` = diskon 90% (bayar 10%), `75p` = diskon 75% (bayar 25%), `25p` = diskon 25%. Angka pertama = persen diskon.

Setiap rule hanya dieksekusi kalau SKU target **ada di respons region**. Ini sengaja: substitusi ke SKU yang tidak dijual membuat Apple membalas `Pembelian belum selesai`.

---

## 5. Menambah mapping sendiri

Urutan riset yang benar:

1. Buka plan di Google App, lihat baris `collected` di log. Itu daftar lengkap SKU yang storefront lu tawarkan
2. Cari yang lebih murah dari yang sedang tampil: perhatikan pola `ip_3mo_75p`, `ip_1yr_25p`, `ip_1yr_10p`, `12month_ip_15p`
3. Petakan SKU sumber ke SKU murah itu:
   - **ProxyPin**: edit `SKU_MAP` di script, simpan
   - **Shadowrocket**: buka `g1-sku-report` → tambah rule (exact atau prefix)
   - **Anywhere**: edit `g1-acq-anywhere.js` lalu re-embed base64 ke `g1-acq.amod`
4. Buka ulang halaman plan, cek log `-> target`
5. Tap beli, baca sheet, **jangan konfirmasi** kalau produknya bukan yang diharapkan

Kalau target muncul di `collected` tapi checkout tetap menolak, berarti produk itu untuk region/akun lain. Hapus rule-nya.

---

## 6. Troubleshooting

| Gejala | Arti | Tindakan |
|---|---|---|
| `Pembelian belum selesai` / `Coba pilih paket lagi` | SKU hasil substitusi tidak dijual di storefront region akun | Hapus/petakan ulang; pakai SKU yang muncul di `collected` |
| `not in region catalog, ... left as-is` | Guard bekerja, plan asli dibiarkan | Normal. Tidak ada promo yang bisa dipakai di region itu |
| `collected 0 id(s)` | Respons tidak terbaca | Sertifikat CA belum di-trust, atau modul/script belum enable |
| Log tidak muncul sama sekali | Trafik tidak lewat MITM | Pastikan VPN/capture aktif, domain `one.google.com` difilter, dan Google App di-relaunch |
| Halaman plan tidak berubah tapi log `rewrote` | Cache aplikasi | Force close Google App, buka ulang plan |
| Harga promo hilang setelah beberapa menit | Google merotasi katalog | Buka ulang halaman, lihat `collected` terbaru |
| Beli lewat aplikasi Google One standalone | API native, di luar modul | Masuk lewat Google App |

Catatan QUIC: modul Shadowrocket memblokir UDP 443 supaya Google App tidak bypass lewat HTTP/3. Efek samping: HTTP/3 aplikasi lain jadi lambat. ProxyPin dan Anywhere punya pengaturan QUIC sendiri.

---

## 7. Keamanan

- Script hanya membaca dan menulis body respons `one.google.com`. Domain lain tidak disentuh
- Tidak ada network call di dalam script. Semua output ke log lokal (dan file lokal kalau diaktifkan)
- Sertifikat CA dibuat dan disimpan di HP lu, penulis modul tidak bisa mengambilnya
- Isi script terbuka, bisa dibaca siapa pun di repositori
- **Jangan pernah** memasukkan email/password Google ke tool pihak ketiga mana pun. Modul ini tidak butuh kredensial

---

## 8. Uji offline (opsional, di komputer)

```sh
node --test tests/sku-tools.test.cjs tests/mapping-editor.test.cjs
node tests/anywhere-port.test.cjs
node tests/proxypin-port.test.cjs
```

ID di dalam test adalah contoh sintetis, bukan bukti produk atau harga real.

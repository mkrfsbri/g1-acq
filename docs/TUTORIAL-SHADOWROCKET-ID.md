# Tutorial Shadowrocket (小火箭) — g1-acq v7.12.0

Panduan pakai modul `crhywun/g1-acq` di Shadowrocket iOS. Semua URL di dokumen ini nunjuk ke repo upstream **crhywun**, bukan fork.

> Modul cuma mengubah **isi respons web** `one.google.com`. Modul **bukan penjamin harga**: yang menentukan harga, periode, dan trial adalah panel App Store. Selalu baca sheet sebelum ketuk "Langganan".

---

## 0. Prasyarat

- iPhone iOS 15 atau lebih baru, Shadowrocket sudah terpasang dan punya config yang aktif.
- Punya akun Google (bisa tanpa Google One aktif; ini malah lebih baik untuk trial).
- Aplikasi **Google** (ikon G warna-warni), bukan aplikasi "Google One" standalone. Halaman plan dibuka dari dalam aplikasi Google.
- Safari (modul report hanya jalan di Safari).

---

## 1. Pasang modul

Shadowrocket → tab **配置 / Config** → **模块 / Modules** → tombol **+** kanan atas → tempel:

```text
https://cdn.jsdelivr.net/gh/crhywun/g1-acq@v7.12.0/g1-acq-ultra-discount.sgmodule
```

Nama modul yang muncul: **G1 ACQ SKU 管理**. Aktifkan toggle-nya.

Kalau dulu pernah pasang modul lain (`G1 ACQ Ultra 75p`, `G1 ACQ`, `G1 Pro Annual Test`, `G1 SKU Scan`, versi fork `mkrfsbri`), **matikan semuanya**. Dua modul rewrite aktif sekaligus = SKU dihitung dobel dan hasil rewrite bertabrakan.

---

## 2. Nyalakan HTTPS Decryption

Modul tidak akan pernah jalan tanpa ini. Ini langkah yang paling sering kelewat.

1. Shadowrocket → **配置** → di baris config yang lagi dipakai, ketuk ikon **(i)** di kanan.
2. Masuk **HTTPS 解密 / HTTPS Decryption** → nyalakan toggle.
3. Kalau belum punya sertifikat: halaman itu punya tombol generate + install. Ketuk, lalu lanjut ke dua langkah iOS di bawah.
4. **Settings → General → VPN & Device Management** → install profil Shadowrocket.
5. **Settings → General → About → Certificate Trust Settings** → nyalakan trust untuk root CA Shadowrocket.
6. Masih di halaman HTTPS Decryption, cek daftar hostname berisi `one.google.com`. Modul menambahkannya lewat `%APPEND%`. Ini daftar dekripsi, **bukan** DNS hosts.
7. Balik ke Shadowrocket, **disconnect lalu connect** VPN ulang.

---

## 3. Cek modul sudah jalan

Safari → buka:

```text
https://one.google.com/g1-sku-report
```

Harus muncul halaman **Google One SKU 管理** dengan badge **本机脚本已接管 · v7.12.0**. Kalau halaman 404 atau tidak ada badge, modul belum aktif: ulangi langkah 1-2, pastikan VPN tersambung saat halaman dibuka.

Halaman ini juga bisa di-export: `https://one.google.com/g1-sku-report?format=json`.

---

## 4. Biarkan modul mengumpulkan SKU dulu

Buka **aplikasi Google → avatar kanan atas → Google One 管理 / Manage Google One** → masuk halaman plan 2TB/Pro, 20TB, 30TB, dan tab bulanan/tahunan. Setiap halaman yang dibuka mengirim respons `one.google.com/ai?...` yang diambil modul.

Balik ke report page, lihat daftar **采集 / collected**: itu SKU asli yang server kirim ke akun lo, lengkap dengan jumlah kemunculan. SKU yang tidak pernah dikirim server tidak akan muncul di sini.

---

## 5. Pilih template dan terapkan

Scroll ke **预制映射模板 / Preset templates**, ketuk **应用模板 / Apply** di kartu yang mau dipakai. Sukses = balik ke report page dengan pesan tersimpan (HTTP 303), dan mode berubah dari `discount75` ke `custom`.

| Template | Aksi |
| :--- | :--- |
| **1 元开 Pro** (`pro-1yuan`) | prefix `g1.ios.2tb.` → `com.google.gemini.2tb.ai.m.3month_ip_99p` (99% off, ~1 yuan/bln) |
| **Turki 20TB · 1.989,99 TRY** | exact `g1.ios.20tb.m.v2` → `g1.ios.20tb.m` |
| **Turki 30TB · 2.949,99 TRY** | exact `g1.ios.30tb.ai.pro.m` → `g1.ios.30tb.m` |
| **Ultra 20TB/30TB · 3 bulan 75p** | `g1.ios.20tb.m.v2` → `g1.20tb.3months_ip_75p.acq`, `g1.ios.30tb.ai.pro.m` → `g1.ai.ultra.3months_ip_75p.acq` |
| **2TB/Pro · 12 bulan 90p** | prefix `g1.ios.2tb.` → `g1.2tb.ai.12months_ip_90p` |

Arti angka: `75p` = diskon 75%, lo bayar 25%. `90p` = diskon 90%, lo bayar 10% (sekitar sepersepuluh). `99p` = diskon 99%.

Template **1 元开 Pro** dan **12 bulan 90p** sama-sama memakai prefix `g1.ios.2tb.`; template yang diterapkan belakangan yang menang untuk prefix itu. Template Turki dan 75p bisa dipakai bersamaan dengan Pro.

Batas: maksimal 30 rule (rule non-aktif tetap dihitung). Lebih dari itu, seluruh penyimpanan gagal dan tidak ada yang tertulis.

---

## 6. Verifikasi sebelum bayar

1. Tutup halaman plan, lalu **masuk ulang** ke halaman plan yang sesuai. Untuk template Pro: halaman **2TB/Pro sendiri**, bukan halaman 20TB.
2. Refesh report page. Di bagian **最近执行 / last execution** cek tiga hal:
   - `test.version` = `g1-acq-v7.12-mappings`
   - `test.mappingRevision` sama dengan `mappingConfig.revision`
   - `test.matchedFrom` menampilkan `id` sumber (`g1.ios.2tb....`) dan `to` target yang lo pilih
3. Baca sheet App Store: nama produk, periode, harga awal, harga perpanjangan. Kalau sheet menolak tampil atau bilang **"Pembelian belum selesai / Coba pilih paket lagi"**, artinya target tidak dijual di region/akun lo. Ganti template atau balik ke default.

Modul v7.12 **tidak** mengecek apakah target ada di katalog region. Dia menulis target apa pun yang lo pilih. Jadi kegagalan checkout bukan bug modul, tapi target yang tidak ada di storefront lo.

---

## 7. Balik ke default

Report page → **恢复默认 / Restore default**. Isinya tiga rule bawaan:

| Match | Sumber | Target |
| :--- | :--- | :--- |
| prefix | `g1.ios.2tb.` | `g1.2tb.ai.12months_ip_90p` |
| exact | `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_75p.acq` |
| exact | `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_75p.acq` |

Restore default mengganti seluruh rule, tapi riwayat koleksi dan eksekusi tetap disimpan.

---

## 8. Troubleshooting

| Gejala | Penyebab | Fix |
| :--- | :--- | :--- |
| Report page tidak bisa dibuka / tidak ada badge | HTTPS decryption mati, atau `one.google.com` tidak ada di list hostname | Langkah 2, terutama poin 6 |
| Report jalan tapi `collected` kosong | Halaman plan belum dibuka setelah VPN connect | Langkah 4, buka ulang halaman plan |
| `matchedFrom` kosong padahal template sudah diterapkan | Halaman plan belum dimuat ulang setelah simpan | Tutup dan buka ulang halaman plan; config baru dipakai di respons `/ai?` berikutnya |
| Checkout bilang "Pembelian belum selesai" | Target tidak dijual di region/akun lo | Langkah 6 poin 3, ganti template |
| SKU tidak berubah sama sekali | Ada dua modul rewrite aktif | Matikan semua kecuali **G1 ACQ SKU 管理** |
| Semua request lambat setelah modul aktif | Rule blokir UDP 443 memaksa HTTP/3 turun ke TCP | Normal, itu memang cara kerjanya |

---

## 9. Keamanan

- Modul tidak menghubungi server mana pun. Semua logika jalan di HP, data disimpan lokal di Shadowrocket (`$persistentStore`).
- Certifikat CA Shadowrocket dibuat di HP. Jangan export atau bagikan file `.p12`.
- Jangan pernah masukkan email + password Google ke aplikasi atau tool pihak ketiga. Modul ini tidak butuh kredensial sama sekali.
- Setelah selesai eksperimen, matikan modul dan hapus root CA dari Certificate Trust Settings kalau tidak dipakai lagi.

---

## 10. Catatan region Indonesia

Dari log probe di akun region ID, katalog server hanya memuat diskon tier Plus dan storage:

- `g1.ios.ai.2tb.m.ip_3mo_75p.acq` (Plus 2TB, 75% off 3 bulan)
- `g1.ios.100gb.m.3month_ip_75p.acq` / `g1.ios.30gb.m.3month_ip_75p.acq`
- `g1.ios.ai.2tb.a.ip_1yr_10p.acq` / `g1.ios.helium.a.ip_1yr_10p.acq` (tahunan, 10% off)

Tidak ada SKU promo Ultra 20TB/30TB di katalog region ID. Template Ultra 75p dan Turki butuh storefront region lain.

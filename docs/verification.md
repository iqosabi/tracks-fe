# Verifikasi refactor TypeScript

Pemeriksaan 24 Oktober 2026 untuk migrasi modular, type safety, dan build produksi.

## Checks

- Strict typecheck source, server, unit tests, dan E2E berhasil, termasuk no-unused imports/parameters.
- Format Prettier berhasil untuk TypeScript, CSS, HTML, JSON, YAML, dan dokumentasi.
- 35 unit tests berhasil: 13 auth/session, 6 HTTP boundary, 4 adapter monitoring, 8 format/proyeksi/role/tanggal, 4 search/pagination/numbering.
- Build Vite dan kompilasi server Node berhasil. Bundle JS sekitar 320 kB sebelum gzip dan 97 kB gzip; CSS sekitar 68 kB sebelum gzip. Ukuran ini adalah hasil build, bukan pengukuran performa pengguna.
- npm audit pada dependency tree terpasang melaporkan 0 advisory pada saat pemeriksaan. Ini snapshot, bukan jaminan terhadap advisory mendatang.

## Browser dan server produksi

Playwright berada di `tests/e2e/` dan memakai build produksi yang sama dengan `npm start`.

1. Regresi UI: parent-child sidebar, collapse desktop, drawer mobile, pencarian/pagination remote dan lokal, nomor baris lintas halaman, pemetaan record aksi setelah filter, button berborder, susunan filter, parameter CARTO key sintetis, dan popup peta.
2. Alur CMS: request UI cocok dengan 43 metode/path fixture collection, termasuk CRUD master data, ownership bus/rute, rotasi token, help tickets, pengguna/audit, profil, health, logout, dan logout-all. Viewer tidak melihat modul/aksi terlarang. Token perangkat tidak masuk storage atau tabel.
3. Server produksi: security headers, cache immutable bundle hash, no-store HTML/runtime config, GET/HEAD, penolakan POST, dan 404 untuk source/package/env/Git metadata.

Seluruh request CMS dan tile dalam tes browser di-intercept menggunakan data/key sintetis. Test tidak membutuhkan upload awal, akun pengguna, atau database staging. Tidak ada data backend asli yang diubah.

## Batas verifikasi

OpenAPI remote belum dapat diakses dari environment pengerjaan. Collection memuat metode/path/request, tetapi tidak memiliki skema respons lengkap. Tes mock tidak membuktikan bentuk semua respons staging, otorisasi backend, CORS/cookie deployment, atau akses CARTO key/tile nyata. UAT staging dan browser target masih diperlukan sebelum rilis produksi.

Dockerfile multi-stage/non-root disediakan sebagai opsi deployment. Build dan runtime container belum diuji di environment ini. GitHub Actions disediakan; keberhasilan lokal bukan klaim bahwa run remote CI sudah selesai.

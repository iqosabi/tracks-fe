# Arsitektur frontend

## Batas tanggung jawab

`app/application.ts` mengatur pergantian view, auth lifecycle, dan pembersihan fitur; bukan menyusun request CRUD. Shell, navigasi, dan katalog route dipisahkan dari controller.

`core/auth` memiliki tipe User/Role/Session dan validator Zod. Token hanya berada di closure, bukan localStorage. Storage auth hanya menyimpan marker koordinasi refresh/cooldown. Preferensi UI terpisah dari sesi.

`core/api` menyediakan HTTP boundary bersama. Respons bertipe `unknown` sampai diperiksa melalui guard. Error diterjemahkan ke pesan UI stabil; isi respons sensitif tidak dicetak. Cooldown 429 dibagi antarfitur. Tidak ada retry generik pada mutasi; satu retry setelah 401 dimiliki auth client setelah refresh terkoordinasi.

`features/management/definitions.ts` adalah katalog metode/path/field/perizinan. Controller mengorkestrasi list, mutasi, dan ownership. Form dan lookup memiliki modul tersendiri. UUID digunakan pada request, bukan informasi utama tabel.

`features/monitoring` memiliki polling dengan pembatalan request lama dan pemeriksaan generation. Adapter path/query bisa diuji tanpa memuat Leaflet/browser. Peta mempertahankan zoom pengguna saat data diperbarui.

`shared/ui/data-table` mendukung data source remote/lokal. Pagination server memakai offset global; pagination lokal bekerja atas hasil pencarian. Indeks aksi mengarah ke record sumber setelah filter/pagination. Search hanya membaca kolom operasional.

`shared/ui/dialog` memiliki satu lifecycle, focus trap, Escape/backdrop, dan pengembalian fokus. Fitur memiliki abort signal untuk request dialog. Semua input backend/user pada markup harus melalui `escape()`. Tagged template `html` membantu keterbacaan dan bukan sanitizer; error text memakai textContent atau escape.

## TypeScript dan pengujian

Strict typechecking mencakup source, server, unit test, dan E2E. Unused imports/parameters ditolak. Tidak ada any/ts-ignore/ts-nocheck sebagai jalan pintas aplikasi.

Unit tests menguji concurrency/replay sesi, HTTP boundary, BigInt, proyeksi readable, query/tanggal/role, serta numbering dan pemetaan record. Playwright menguji build produksi melalui mock API/tile dan fixture kontrak yang disanitasi. Test tidak membutuhkan file upload, akun asli, atau database backend.

## Build dan deployment

Vite membundel/minify TypeScript/CSS dan memberi hash pada aset. Leaflet dan Zod berasal dari dependency terkunci; tidak ada copy vendor JavaScript manual. CSS dibagi berdasarkan fondasi, identitas, workspace, dan kontrol. Selector tak terpakai/deklarasi tertimpa dikurangi sambil mempertahankan urutan cascade yang relevan.

Build menghasilkan `dist/` dan `build-server/serve.js`. Server memakai built-in Node, allowlist tipe file, pembatasan path/source, security headers, cache immutable pada aset hash, dan no-store pada HTML/runtime config. Docker runtime non-root tidak membawa source atau environment file.

Runtime config hanya memuat base URL dan public basemap key, bukan JWT/password/secret admin. Env yang dikirim ke browser di-allowlist. Mengubah origin backend produksi memerlukan update CSP/env server.

Validasi staging tetap diperlukan: collection tidak menyertakan JSON Schema respons lengkap, OpenAPI remote masih diblokir jaringan, dan mock test tidak membuktikan CORS/cookie, enforcement ownership backend, atau tile CARTO nyata.

# Arsitektur frontend

## Batas tanggung jawab

`app/application.tsx` merender halaman React berdasarkan sesi dan navigasi. `useSession` memiliki lifecycle auth dengan cleanup; `shell.tsx` mengelola sidebar melalui state. Login, ringkasan, peta, armada live, CMS, demo, dan pengaturan adalah komponen TSX. Tidak ada controller DOM tingkat halaman.

Fitur memisahkan komponen UI dari `api.ts` (endpoint dan HTTP), `data.ts` (transformasi payload), `types.ts` (kontrak), dan hooks bersama. `management-page.tsx` menangani list/filter/ownership; `management-modal.tsx` menangani form/konfirmasi/token satu kali; `fields.tsx` merender input dan lookup. `definitions.ts` tetap menjadi katalog metode/path/field/perizinan dari Postman.

`core/auth` memvalidasi User/Role/Session melalui Zod. Access token berada di memori; storage auth hanya untuk koordinasi refresh/cooldown. `core/api` menerima respons `unknown`, menerapkan timeout dan cooldown bersama untuk 429. Tidak ada retry otomatis pada mutasi yang hasilnya belum pasti. Auth memiliki satu retry setelah refresh terkoordinasi pada 401.

`shared/hooks/use-request.ts` membatalkan query saat dependency berubah atau komponen dilepas. `use-polling.ts` mencegah overlap, menunggu request selesai sebelum menjadwalkan polling, menunda saat tab tersembunyi, dan menghormati Retry-After. Hook mengabaikan respons setelah cleanup. Mutasi hanya berjalan dari event handler.

`features/maps/data.ts` memvalidasi koordinat, identitas bus, overspeed, waktu, dan delay. Kecepatan saja tidak membentuk overspeed tanpa flag/peringatan/batas API. `features/overview/data.ts` memproyeksikan metrik readable dan tidak menafsirkan panjang halaman sebagai total. Role menentukan query administratif; scope data tetap ditegakkan backend.

`FleetCanvas`, `DataTableView`, dan `DialogView` menjadi batas integrasi imperative. React memiliki elemen host; Leaflet, engine tabel, dan pengelola dialog hanya mengubah subtree miliknya. Effect melepas listeners, observer, timer, instance peta, dan dialog saat unmount. Callback terbaru dipisahkan dari lifecycle instance agar tabel tidak dibuat ulang pada setiap render. Engine tabel mempertahankan pagination, pencarian, numbering, dan indeks record sumber setelah filter. Dialog mempertahankan focus trap, Escape/backdrop, dan pengembalian fokus.

React meng-escape teks API secara default. Markup engine tabel/marker memakai escape eksplisit; satu-satunya HTML pada komponen shell berasal dari katalog ikon statis. Token perangkat hanya ditampilkan di modal satu kali dan tidak disimpan atau dirender di tabel.

## TypeScript dan pengujian

Strict typechecking mencakup source, server, unit test, dan E2E. Unused imports/parameters ditolak. Tidak ada any/ts-ignore/ts-nocheck sebagai jalan pintas aplikasi.

Unit tests menguji concurrency/replay sesi, HTTP boundary, BigInt, proyeksi readable, query/tanggal/role, serta numbering dan pemetaan record. Playwright menguji build produksi melalui mock API/tile dan fixture kontrak yang disanitasi. Test tidak membutuhkan file upload, akun asli, atau database backend.

## Build dan deployment

Vite membundel/minify TypeScript/CSS dan memberi hash pada aset. React, font OFL, Leaflet, dan Zod berasal dari dependency terkunci; tidak ada copy vendor JavaScript manual. CSS dibagi berdasarkan fondasi, identitas, workspace, dan kontrol. Selector tak terpakai/deklarasi tertimpa dikurangi sambil mempertahankan urutan cascade yang relevan.

Build menghasilkan `dist/` dan `build-server/serve.js`. Server memakai built-in Node, allowlist tipe file, pembatasan path/source, security headers, cache immutable pada aset hash, dan no-store pada HTML/runtime config. Docker runtime non-root tidak membawa source atau environment file.

Runtime config hanya memuat base URL dan public basemap key, bukan JWT/password/secret admin. Env yang dikirim ke browser di-allowlist. Mengubah origin backend produksi memerlukan update CSP/env server.

Validasi staging tetap diperlukan: collection tidak menyertakan JSON Schema respons lengkap, OpenAPI remote masih diblokir jaringan, dan mock test tidak membuktikan CORS/cookie, enforcement ownership backend, atau tile CARTO nyata.

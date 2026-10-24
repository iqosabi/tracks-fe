# AMJ Fleet Workspace

Frontend TypeScript untuk monitoring armada dan pengelolaan CMS Ananda Makmur Jaya. Memakai Vite, Leaflet/CARTO, dan modul browser tanpa framework UI. Sidebar bertingkat, search/pagination/numbering tabel, format satuan, dan pembatasan aksi berdasarkan role dipertahankan.

## Menjalankan

Memerlukan Node.js **22.18+** dan npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:5173`. Login memakai akun CMS atau pilih workspace demo. Demo tidak mengirim request perubahan data ke backend.

| Variabel        | Fungsi                                                              |
| --------------- | ------------------------------------------------------------------- |
| `API_BASE_URL`  | Base CMS, default `https://tracksmon-dev-api.aestaworks.com/api/v1` |
| `CARTO_API_KEY` | CARTO Basemaps key untuk request tile browser                       |
| `PORT`          | Port server produksi, default `4173`                                |

`.env.local` diabaikan Git. Hanya base URL dan public basemap key yang dikirim melalui `/runtime-config.js`; variabel lain tidak diekspos. Base URL dan format key divalidasi saat build. Key bisa diatur per browser melalui **Pengaturan → Peta CARTO**. Basemap key terlihat pada request tile sesuai mekanisme CARTO; jangan memakai secret admin CARTO pada konfigurasi publik ini.

## Struktur

```text
src/
  app/                  # Lifecycle, shell, navigasi, preferensi sidebar
  core/
    api/                # HTTP client, error mapping, cooldown rate limit
    auth/               # Session in-memory, Zod, koordinasi antar-tab
    config/             # Runtime config dan preferensi browser
    types/              # Kontrak komponen/data umum
  features/
    auth/               # View dan controller login
    demo/               # Data/aksi demo terisolasi dari API
    management/         # Definisi modul, form, lookup, controller CRUD
    maps/               # Lifecycle Leaflet dan marker CARTO
    monitoring/         # Polling dan adapter monitoring
    settings/           # Konfigurasi API/peta/sesi
  shared/
    data/               # Guard, kolom readable, formatter angka/byte/tanggal
    ui/                 # Tabel, dialog, toast, DOM helper, HTML view
    styles/             # CSS terformat dan aturan responsif
scripts/serve.ts          # Server produksi; hanya melayani dist/
tests/unit/               # Vitest
tests/e2e/                # Playwright pada build produksi dengan API mock
tests/fixtures/           # Kontrak 43 metode/path, tanpa kredensial
```

Keputusan dan kontrak lifecycle ada di [docs/architecture.md](docs/architecture.md). Cakupan endpoint ada di [docs/api-coverage.md](docs/api-coverage.md).

## Quality checks

```sh
npm run check          # Strict typecheck source/server/tests + format
npm test               # Unit tests
npm run build          # Typecheck + bundle frontend + compile server
npx playwright install chromium
npm run test:e2e       # Server produksi dengan API/tile mock
```

`npm run format` merapikan TypeScript, HTML, CSS, JSON, dan dokumentasi. Tidak ada `any`, `ts-ignore`, atau `ts-nocheck` untuk melewati typecheck aplikasi. Dependensi dikunci dalam `package-lock.json`. GitHub Actions menjalankan checks, unit tests, build, dan E2E.

## Produksi

```sh
npm ci
npm run build
npm start
```

Server membuka `http://localhost:4173`, melayani hanya `dist/`, dan memasang CSP, anti-framing, nosniff, referrer policy, serta permissions policy. Aset hash memakai cache immutable; HTML/runtime config tidak di-cache. Source, `.env`, Git, dan package metadata tidak dilayani. Server mendukung HEAD, menolak metode selain GET/HEAD, serta shutdown melalui SIGTERM/SIGINT.

Untuk static hosting, deploy isi `dist/` dan pasang header yang setara. `npm run preview` hanya untuk pemeriksaan lokal. Runtime config static dihasilkan saat build, sehingga perubahan env memerlukan rebuild. Server Node dapat mengoverride base/key melalui env saat start. CSP hanya mengizinkan origin CMS dari `API_BASE_URL`; pergantian origin produksi memerlukan update env dan restart server, bukan hanya preferensi browser.

Dockerfile menyediakan build multi-stage dan runtime non-root:

```sh
docker build -t amj-fleet .
docker run --rm -p 4173:4173 --env-file .env.local amj-fleet
```

Tempatkan TLS/reverse proxy di depan server/container. Backend harus mengizinkan Origin FE secara tepat, credentialed CORS, dan preflight header auth. Cookie HttpOnly perlu kompatibel dengan topologi domain; FE/API pada situs yang sama lebih mudah dioperasikan. Deployment lintas situs memerlukan konfigurasi cookie backend dan verifikasi browser.

## Kontrak data dan akses

- Cakupan mengikuti 43 endpoint collection Postman pengguna. OpenAPI remote belum dapat diakses dari environment pengerjaan; endpoint di luar collection tidak ditebak.
- Access token hanya di memori. Auth POST menyertakan CSRF header dan credentials. Web Locks menserialisasi refresh/logout; BroadcastChannel menyelaraskan sesi antar-tab. Refresh 401 menghapus sesi; 403 tidak di-refresh. Respons refresh hilang/5xx tidak di-replay otomatis.
- HTTP client bersama mengelola error, timeout, dan cooldown 429. Protected request hanya diulang sekali setelah 401. Kegagalan network pada mutasi ditandai sebagai hasil belum pasti, tanpa replay otomatis.
- Role FE hanya mengatur presentasi; backend menentukan izin/scope operator. Ownership tidak disimpulkan dari label operator. Assignment, hapus, nonaktifkan, lepas akses, dan rotasi token memiliki konfirmasi.
- Token perangkat hanya muncul pada dialog sekali pakai, bukan tabel/storage/log. Dialog, request, timer, event listener, dan peta dibersihkan saat view dilepas.
- Respons API bertipe `unknown` dan diperiksa sebelum dipakai. Collection belum memuat skema respons lengkap; format tak dikenal menghasilkan state yang jelas. Tabel memproyeksikan kolom operasional dan menyembunyikan UUID/hash/metadata/JSON mentah.
- Byte string memakai BigInt dan satuan berbasis 1024: `33933` → `33,14 KB`. Jumlah memakai pemisah ribuan, tanggal dalam WIB, interval perangkat dalam detik di UI dan milidetik pada request.
- Search server hanya memakai parameter terdokumentasi. Endpoint tanpa `q` memakai pencarian di halaman yang diterima; daftar bounded/users/history/alerts dipaginasi lokal.

[Hasil verifikasi](docs/verification.md) membedakan pengujian FE dari integrasi staging. Mock test tidak membuktikan akses server asli, CORS/cookie deployment, atau semua bentuk respons backend. Lakukan smoke test staging sebelum rilis. Dockerfile disediakan, tetapi build container belum diuji di environment pengerjaan.

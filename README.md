# AMJ Fleet workspace

Workspace monitoring dan pengelolaan AMJ dengan sidebar responsif, menggunakan browser-native ES modules. Tidak memerlukan instalasi dependency untuk menjalankan, menguji auth client, atau membuat build.

## Menjalankan

```sh
npm run dev
```

Buka `http://localhost:5173`. Gunakan Node.js 22 atau lebih baru. Port dapat diubah melalui variabel `PORT`.

```sh
npm run check
npm test
npm run build
```

Deploy isi `dist/` ke static hosting melalui HTTPS. `server.mjs` hanya untuk preview lokal; jangan mengekspos direktori source sebagai server produksi. Font Google opsional dan memiliki fallback font sistem.

## Koneksi CMS

Base URL default: `https://tracksmon-dev-api.aestaworks.com/api/v1`, dikonfirmasi oleh pengguna sebagai CMS Auth API. Ubah melalui **Konfigurasi koneksi API** di halaman login atau **Pengaturan** di workspace demo. Base URL harus mencakup prefix `/api/v1`.

Endpoint sesuai kontrak `frontend-auth.md`:

- `POST /auth/login` dengan username/password JSON.
- `POST /auth/refresh` sekali saat reload dan setelah protected request 401.
- `POST /auth/logout` dan `POST /auth/logout-all`.
- `GET /auth/me` untuk verifikasi profil.

Semua POST auth menyertakan `X-CSRF-Protection: 1` dan `credentials: include`. Access token hanya di memori; tidak masuk localStorage/sessionStorage, URL, maupun log. LocalStorage hanya menyimpan URL CMS, marker ketidakpastian refresh, dan cooldown 429. BroadcastChannel membagikan sesi hanya antar-tab pada origin yang sama; Web Locks menserialisasi login/refresh/logout pada base URL yang sama. Browser harus mendukung Web Locks dan berjalan di HTTPS atau localhost.

Protected request 401 melakukan satu refresh terkoordinasi dan satu retry. 403 diteruskan sebagai kegagalan izin. Jika respons refresh hilang, gagal dibaca, atau 5xx, client menandai hasil tidak pasti dan tidak mengulang refresh otomatis. UI meminta login baru; sesi yang sudah ada tetap di memori sampai server menolaknya. 429 mengikuti `Retry-After`. Logout baru menghapus sesi lokal setelah server mengonfirmasi sukses. Perubahan sesi dikirim ke tab lain.

Sebelum deployment, backend perlu mengizinkan **Origin FE yang tepat** pada `CORS_ORIGINS`, mendukung credentialed CORS, dan mengatur cookie refresh sesuai topologi domain. FE lintas situs memerlukan cookie `SameSite=None; Secure`; kebijakan third-party cookie browser tetap dapat membatasinya. Satu situs untuk FE/API atau reverse proxy dengan cookie forwarding lebih sesuai bila tersedia. FE tidak membaca cookie HttpOnly.

## Fleet Monitoring live

Request mengikuti collection Postman yang diberikan pengguna. Environment Postman menunjuk localhost untuk development backend; FE tetap menggunakan base URL dev yang dikonfirmasi pengguna. File Postman, kredensial, token, dan script collection tidak disalin ke frontend maupun dijalankan.

- Ringkasan: `GET /monitoring/summary`.
- Armada dan posisi GPS: `GET /monitoring/vehicles?page=1&limit=25`, dengan pencarian `q` dan filter `status` (`ACTIVE`, `IDLE`, `DELAYED`, `OFFLINE`). Pagination dilakukan di server, bukan menghitung total seluruh armada dari satu halaman.
- Notifikasi: `GET /monitoring/alerts` (daftar dibatasi backend).
- Riwayat perangkat: `GET /monitoring/vehicles/{deviceId}/history?limit=500`, memakai rentang default backend 24 jam. ID adalah record perangkat, bukan nomor bus.
- Laporan penggunaan: `GET /monitoring/usage?page=1&limit=25`.
- Akumulasi byte: `GET /monitoring/usage/summary?page=1&limit=25`. String byte tidak dikonversi ke Number agar tidak kehilangan presisi.
- Perbandingan operator: `GET /monitoring/operators/summary`, tombol hanya ditampilkan untuk `SUPER_ADMIN`; server tetap menentukan otorisasi.

Semua request melalui Bearer client CMS. FE tidak menambahkan override operator; scope ditentukan server. Overview, armada, peta, dan alerts melakukan polling setiap 15 detik setelah permintaan selesai, tanpa overlap. Polling berhenti saat halaman tersembunyi, keluar, berpindah tampilan, atau mendapat 401/403; request dibatalkan ketika view dilepas. Timeout 20 detik. 429 mengikuti `Retry-After`. Respons gagal mempertahankan data yang sebelumnya berhasil diterima dengan peringatan bahwa datanya mungkin lama; waktu penerimaan respons tidak diklaim sebagai waktu telemetry.

Collection tidak memuat contoh respons atau JSON Schema. Tampilan memakai proyeksi field yang berfokus pada informasi operasional: nomor bus/polisi, nama operator/perangkat/rute, status, kecepatan, waktu, dan penggunaan data. UUID, token/hash, metadata, field tidak dikenal, dan JSON mentah tidak ditampilkan di tabel utama. Jika respons tidak memiliki field yang dikenali, UI menampilkan state kosong yang menjelaskan format belum dapat ditampilkan; bukan data palsu.

Format angka mengikuti locale Indonesia. Jumlah menggunakan pemisah ribuan (33933 → 33.933); byte string dikonversi menggunakan BigInt ke B/KB/MB/GB/TB/PB/EB berbasis 1024 (33933 → 33,14 KB, 1073741824 → 1 GB) tanpa konversi sumber ke floating-point. Presisi tampilan byte dua desimal, sedangkan perhitungan sumber tetap integer. Waktu ditampilkan dalam WIB; interval perangkat ditampilkan dalam detik dan dikonversi ke milidetik saat mengirim form. Nilai ID tidak diformat sebagai angka.

Peta live menggunakan Leaflet 1.9.4 dengan basemap CARTO Positron (light_all), attribution OpenStreetMap dan CARTO tetap terlihat. Library, CSS, gambar, dan lisensi Leaflet disimpan lokal pada `src/vendor/leaflet`; tidak memerlukan npm install atau CDN JavaScript. Browser membutuhkan akses HTTPS ke `a/b/c/d.basemaps.cartocdn.com` untuk memuat tile. Marker diambil dari field latitude/longitude (juga lat/lng/lon) yang tersedia pada halaman kendaraan aktif; bukan semua halaman armada. Zoom/pan pengguna dipertahankan saat polling; tombol Semua armada melakukan fitBounds manual. Popup menampilkan label, status, serta koordinat. Tanpa koordinat, peta memberi keterangan tanpa marker palsu. Kegagalan tile diberi pesan, sedangkan marker dan kontrol tetap bisa dipakai. Saat berpindah halaman, peta dan ResizeObserver dibersihkan. Mode demo memakai basemap CARTO yang sama dengan posisi ilustrasi berlabel demo.

Mode demo tetap terpisah dengan label jelas. Tidak ada fallback otomatis dari kegagalan API live menjadi data demo.

## Verifikasi

`npm test` menguji adapter parameter Fleet Monitoring, pembacaan daftar, preservasi string byte besar, serta kontrak login, konkurensi 401, 403, retry maksimum satu kali, sesi kadaluarsa, respons refresh hilang/5xx, logout gagal/sukses, logout-all, rate limit, koordinasi dua tab, dan browser tanpa Web Locks menggunakan mocked API. Pengujian tidak menghubungi backend atau mengubah database. Login, CORS, dan cookie terhadap server staging belum terverifikasi karena akses jaringan tidak tersedia dan kredensial akun belum diberikan.

Panduan backend diperlakukan sebagai referensi kontrak. Migrasi, SQL cleanup, dan perintah verifikasi backend di lampiran tidak dijalankan pada proyek ini.

## Identitas dan tampilan AMJ

Sidebar desktop tetap di kiri dan memiliki area navigasi yang dapat di-scroll; di mobile dibuka melalui hamburger dan ditutup dengan backdrop. Identitas AMJ merah `#ed1235` dan logo SVG referensi pengguna dipertahankan. Kartu ringkasan disederhanakan menjadi label serta angka, tanpa metadata internal atau respons JSON. CSS penyempurnaan workspace berada di `src/workspace.css`.

## Semua modul collection

Cakupan per endpoint ada di [docs/api-coverage.md](docs/api-coverage.md). Sidebar mencakup monitoring, riwayat GPS, penggunaan internet, perbandingan operator, operator/ownership, master bus, rute, perangkat OBU, tiket bantuan, pengguna, audit, status sistem, profil, dan pengaturan sesi. Perbandingan operator, operator/ownership, pengguna, dan audit ditampilkan hanya untuk SUPER_ADMIN. Master data dapat dibaca tenant sesuai scope backend; create/update/delete dan rotasi token hanya tersedia untuk SUPER_ADMIN. OPERATOR_ADMIN dapat mengubah status tiket operatornya. Viewer tidak memiliki aksi tulis. Semua aturan akses tetap ditegakkan backend.

Form CRUD mengirim JSON dengan field yang ada di contoh request collection. Pilihan bus/operator/perangkat/rute mengambil data nama dari endpoint list, mendukung pencarian server, dan mengirim ID/kode asli. Assignment bus menjelaskan perpindahan kepemilikan dan akses telemetry sebelum dikonfirmasi. Hapus, nonaktifkan perangkat, pelepasan akses, dan rotasi token meminta konfirmasi. Tidak ada request mutasi yang dijalankan otomatis saat membuka layar. Token perangkat baru ditampilkan hanya pada dialog respons sekali pakai; tidak masuk storage, log, atau tabel. Menutup dialog atau logout menghapus UI token.

Status tiket yang dicontohkan collection adalah OPEN dan IN_PROGRESS; validitas nilai status lain serta persyaratan body wajib/opsional perlu dikonfirmasi dengan skema OpenAPI backend. Kesalahan validasi 400 dan konflik 409 ditampilkan di form; UI tidak mengulang request mutasi akibat network error. Profil menggunakan /auth/me; logout dan logout-all tetap melalui client auth yang terkoordinasi.

Pemeriksaan peta dan seluruh aksi CMS menggunakan tile dan API mock. Pengujian tidak menyentuh data backend staging. Akses server asli, CORS/cookie, bentuk respons staging, dan akses tile CARTO dari jaringan pengguna belum terverifikasi.

## Navigasi dan tabel bersama

Menu sidebar dikelompokkan menjadi parent Monitoring, Data & operasional, dan Administrasi. Setiap parent bisa dibuka/tutup secara independen. Tombol burger/close sidebar menyembunyikan seluruh sidebar di desktop, sehingga header menampilkan logo AMJ dan tombol pembuka. Di mobile, sidebar tetap drawer dengan backdrop. Preferensi collapse dan grup disimpan lokal di browser, tanpa memuat data sesi.

Semua tabel memakai `src/data-table.js`: pencarian, pilihan 10/25/50/100 baris, nomor baris, informasi rentang hasil, dan tombol nomor halaman. Nomor baris remote memakai offset `(page - 1) * limit`, sedangkan nomor lokal mengikuti hasil filter. Indeks aksi tetap mengarah ke record asli setelah search/pagination. Detail bus dan tabel demo juga memakai komponen yang sama.

List endpoint dengan dukungan page/limit menggunakan pagination server. Search server memakai `q` hanya pada endpoint yang mendokumentasikannya (armada, master bus/rute/perangkat, operator, audit, dan list ownership). Untuk endpoint paginated yang tidak mendokumentasikan `q`, pencarian diberi label **Cari di halaman ini** dan memfilter hanya halaman yang sudah diterima. Users, riwayat GPS, perbandingan operator, dan alerts dipaginasi/dicari lokal dari respons yang diterima. Alerts dan history tetap mengikuti batas hasil backend; tidak diklaim mencakup seluruh database. Tidak ada query tambahan yang ditebak.

Filter disusun dalam grid yang sama, dengan kontrol setinggi 41px serta tombol Reset/Terapkan filter. Pencarian pilihan perangkat/bus/operator berada dalam popover pada ikon pencarian di samping select, sehingga tidak membuat tinggi field berbeda. Aksi tabel memakai button berborder; hapus/nonaktifkan tetap memiliki konfirmasi.

## CARTO Basemaps key

CARTO mendokumentasikan key basemap pada parameter `?key=` URL tile. Sumber: https://github.com/CartoDB/basemap-styles. Nilai key pengguna tidak ditaruh pada source atau commit.

Untuk development, salin `.env.example` menjadi `.env.local` lalu isi `CARTO_API_KEY`. File `.env.local` diabaikan Git. Server dev mengirim public basemap config melalui `/runtime-config.js`; build menulis konfigurasi yang sama ke `dist/runtime-config.js` (dist juga diabaikan Git). Untuk hosting statis, isi env saat build dan jalankan ulang build jika key diganti. Runtime config ini khusus key basemap yang memang dipakai browser untuk tile, bukan secret admin CARTO atau access token CMS.

Alternatif per browser: buka **Pengaturan → Peta CARTO**, masukkan key, lalu simpan. Key basemap ini disimpan lokal pada browser dan mengoverride runtime config. Tombol **Gunakan key runtime** menghapus override lokal. Field tidak mengisi ulang key yang sudah tersimpan. Token autentikasi CMS tetap hanya di memori dan terpisah dari konfigurasi basemap.

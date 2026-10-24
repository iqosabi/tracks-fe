# Tracks Monitor frontend

Frontend monitoring armada responsif, menggunakan browser-native ES modules. Tidak memerlukan instalasi dependency untuk menjalankan, menguji auth client, atau membuat build.

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

Collection tidak memuat contoh respons atau JSON Schema. Karena itu tampilan live menggunakan pembacaan field adaptif: ringkasan numerik mempertahankan nama field API, tabel meratakan field nested dan mempertahankan null/string/nilai byte. Daftar dikenali dari array langsung, `items`, `data.items`, atau `data`. Struktur lain ditampilkan sebagai respons JSON, bukan dipalsukan menjadi daftar kosong. Mapping ini perlu dicocokkan dengan respons staging sebenarnya sebelum mengklaim integrasi live terverifikasi.

Peta live menggunakan Leaflet 1.9.4 dengan basemap CARTO Positron (light_all), attribution OpenStreetMap dan CARTO tetap terlihat. Library, CSS, gambar, dan lisensi Leaflet disimpan lokal pada `src/vendor/leaflet`; tidak memerlukan npm install atau CDN JavaScript. Browser membutuhkan akses HTTPS ke `a/b/c/d.basemaps.cartocdn.com` untuk memuat tile. Marker diambil dari field latitude/longitude (juga lat/lng/lon) yang tersedia pada halaman kendaraan aktif; bukan semua halaman armada. Zoom/pan pengguna dipertahankan saat polling; tombol Semua armada melakukan fitBounds manual. Popup menampilkan label, status, serta koordinat. Tanpa koordinat, peta memberi keterangan tanpa marker palsu. Kegagalan tile diberi pesan, sedangkan marker dan kontrol tetap bisa dipakai. Saat berpindah halaman, peta dan ResizeObserver dibersihkan. Mode demo memakai basemap CARTO yang sama dengan posisi ilustrasi berlabel demo.

Mode demo tetap terpisah dengan label jelas. Tidak ada fallback otomatis dari kegagalan API live menjadi data demo.

## Verifikasi

`npm test` menguji adapter parameter Fleet Monitoring, pembacaan daftar, preservasi string byte besar, serta kontrak login, konkurensi 401, 403, retry maksimum satu kali, sesi kadaluarsa, respons refresh hilang/5xx, logout gagal/sukses, logout-all, rate limit, koordinasi dua tab, dan browser tanpa Web Locks menggunakan mocked API. Pengujian tidak menghubungi backend atau mengubah database. Login, CORS, dan cookie terhadap server staging belum terverifikasi karena akses jaringan tidak tersedia dan kredensial akun belum diberikan.

Panduan backend diperlakukan sebagai referensi kontrak. Migrasi, SQL cleanup, dan perintah verifikasi backend di lampiran tidak dijalankan pada proyek ini.

## Identitas dan tampilan AMJ

Refactor menggunakan navigasi atas, ruang putih, tipografi lebih besar, kartu membulat, dan kontrol berbentuk pill yang terinspirasi pola Airbnb. Palet merah `#ed1235` mengikuti referensi logo AMJ dari pengguna. Logo SVG lokal di `src/assets/amj-logo.svg` digambar ulang dari referensi tersebut. Di mobile, navigasi utama berada di bawah; tombol menu membuka pengaturan. Style tambahan berada pada `src/redesign.css`.

Pemeriksaan peta menggunakan tile dan API mock untuk memverifikasi marker, popup, attribution, kontrol, pembaruan posisi tanpa reset zoom, dan cleanup. Ini tidak memverifikasi ketersediaan tile CARTO atau backend dari jaringan pengguna.

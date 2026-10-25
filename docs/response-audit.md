# Penyesuaian contoh respons CMS v1.1

Sumber: `api-response-examples.json` yang diberikan pengguna pada 25 Oktober 2026, disalin menjadi fixture di `tests/fixtures/`. File memuat 43 contoh respons sintetis, bukan rekaman request staging dan bukan skema OpenAPI lengkap. Metadata dokumentasi tidak dibungkus sebagai payload; pengujian memakai `response.body`.

| Modul                           | Penyesuaian                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pengguna                        | Membaca `users[]`, menampilkan role/status/waktu dan memperkaya nama operator melalui daftar operator yang hanya diakses super admin.                                                            |
| Perbandingan operator           | Membaca `operators[]`, `assignedBuses`, `totalDevices`, `activeDevices`, `idleDevices`, `delayedDevices`, `offlineDevices`, serta jumlah bus belum ditugaskan.                                   |
| Ringkasan                       | Memakai `totalBuses`, `totalDevices`, `delay`, `openHelpReports`, timestamp pengukuran/penerimaan, serta ambang aktif/offline/lag.                                                               |
| Armada, history, peringatan     | Mendukung `speedKmh` berupa string, `deviceTimestamp`, `DELAY`, `routeCode`, arah, akurasi, umur data dan flag overspeed.                                                                        |
| Penggunaan internet             | Memformat `deviceBytes`/`appBytes` tanpa kehilangan presisi, hari dan jumlah laporan. Akumulasi perangkat merupakan daftar tanpa pagination server; pencarian/pagination dilakukan lokal.        |
| Bus, rute, perangkat, ownership | Menampilkan data operasional, kode operator, timestamp dan penugasan yang tersedia; lookup menyediakan tombol halaman berikutnya ketika `hasMore` masih true.                                    |
| Bantuan                         | Menampilkan `busBodyNo`, kategori, uraian, rute, posisi, akurasi, kecepatan serta waktu laporan/penerimaan.                                                                                      |
| Audit                           | Membaca `actor` string. ID internal dan metadata mentah tetap tidak ditampilkan sebagai informasi utama.                                                                                         |
| Auth, health, mutasi            | Bentuk auth, profil, 204, token satu kali, dan health sesuai contoh. Konfirmasi serta perizinan aksi dipertahankan. Contoh mutasi Core OBU tetap ilustratif, bukan bukti kontrak upstream final. |

Pagination mengikuti `hasMore`, termasuk saat server mengembalikan lebih sedikit baris daripada limit yang diminta. Tabel tidak membuat total palsu. Ringkasan operasional menghitung halaman sampai selesai, maksimal 25 halaman per sumber per refresh. Bila batas tercapai, angka ditandai `≥` dan dijelaskan sebagai batas bawah. Peta juga mengikuti halaman sampai habis; pengguna dapat memperluas pemuatan 25 halaman berikutnya ketika batas tercapai.

Waktu bus floating memakai `deviceTimestamp`; delay memakai nilai API atau selisih waktu penerimaan terhadap waktu bus. Field yang tidak tersedia tetap `—`. Marker berbentuk bus, mendukung scroll/double-click/pinch dan kontrol zoom; pemilihan dari marker atau pencarian memusatkan peta minimal pada zoom 16. Pemilihan ulang bus yang sama juga memusatkan kembali peta. Polling mempertahankan zoom/pan pengguna.

Popup loading menggabungkan request paralel, termasuk auth, lookup dan mutasi. Popup muncul setelah 180 ms untuk menghindari kedipan pada respons cepat, tidak mengambil fokus atau menghalangi navigasi/peta, dan dilepas setelah semua request selesai/gagal/dibatalkan. Animasi mengikuti preferensi reduced motion.

Pengujian memakai seluruh contoh yang diberikan, ditambah regresi pagination pada halaman pendek dan pengujian browser untuk tiap modul baca, popup loading, marker bus, zoom tombol/scroll, fokus pilihan, serta responsif mobile. Tidak ada request mutasi ke backend asli. Validasi langsung staging masih memerlukan akses jaringan; contoh sintetis tidak membuktikan enforcement role/CORS/cookie maupun bentuk respons upstream nyata.

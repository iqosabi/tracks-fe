# Verifikasi frontend

Hasil pemeriksaan 24 Oktober 2026 untuk sidebar, seluruh modul collection, kartu sederhana, dan format nilai.

- Syntax check dan static build berhasil.
- 24 pengujian Node berhasil: 12 auth, 4 adapter monitoring, 8 presentasi/format/role/validasi tanggal.
- Skenario Chromium desktop dan mobile berhasil tanpa page error.
- Request yang dipicu melalui UI cocok dengan seluruh 43 kombinasi metode/path collection Postman, termasuk create/update/delete master data, transfer/lepas ownership, rotasi token, profil, health, dan logout.
- Pilihan bus/operator/rute memakai label nama dan mengirim ID/kode yang benar. Path berkode slash di-encode.
- Interval 10 detik pada form perangkat menghasilkan `sendIntervalMs: 10000`.
- Penggunaan data string `33933` ditampilkan `33,14 KB`; `1073741824` menjadi `1 GB`.
- UUID, hash token, field debug, dan configVersion tidak muncul di tabel/card utama.
- Token perangkat hasil create/rotate hanya muncul di dialog sekali pakai; tidak tersimpan di localStorage. Viewer tidak melihat modul admin atau aksi tulis. Izin update tiket admin operator juga diuji pada unit role.
- Sidebar mobile bisa dibuka/ditutup; tidak ada overflow horizontal pada dokumen.

Semua request dalam skenario browser di-intercept dan dijawab oleh API mock. Semua tile peta juga mock. Tidak ada perubahan data pada backend staging. Cakupan 43 endpoint ini memverifikasi jalur FE, bukan keberhasilan endpoint di staging atau kesesuaian skema respons yang belum tersedia dalam collection.

OpenAPI remote kembali diperiksa, tetapi proxy environment memberikan HTTP 403 pada CONNECT. Deployment backend, respons staging aktual, CORS, cookie lintas situs, dan akses tile CARTO dari jaringan pengguna belum terverifikasi.

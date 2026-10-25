# Cakupan kontrak API

Sumber: collection Postman pengguna, 24 Oktober 2026, serta contoh respons sintetis CMS v1.1 dari pengguna, 25 Oktober 2026. OpenAPI remote belum dapat diakses. Dokumen ini tidak mengklaim endpoint di luar collection. Script dan environment berisi kredensial tidak dijalankan atau dimasukkan ke repo.

43 endpoint di 10 kelompok tercakup oleh navigasi dan aksi FE. Pengujian end-to-end menggunakan server mock; integrasi staging dan bentuk respons aktual tetap perlu diverifikasi.

| Kelompok            | Metode dan endpoint                                         | Layar / alur                                                                                      |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Health              | `GET /health/live`                                          | Status sistem                                                                                     |
| Health              | `GET /health/ready`                                         | Status sistem                                                                                     |
| Authentication      | `POST /auth/login`                                          | Login, profil, sesi / pengaturan                                                                  |
| Authentication      | `GET /auth/me`                                              | Login, profil, sesi / pengaturan                                                                  |
| Authentication      | `POST /auth/refresh`                                        | Login, profil, sesi / pengaturan                                                                  |
| Authentication      | `POST /auth/logout`                                         | Login, profil, sesi / pengaturan                                                                  |
| Authentication      | `POST /auth/logout-all`                                     | Login, profil, sesi / pengaturan                                                                  |
| Fleet Monitoring    | `GET /monitoring/summary`                                   | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Fleet Monitoring    | `GET /monitoring/operators/summary`                         | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Fleet Monitoring    | `GET /monitoring/vehicles`                                  | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Fleet Monitoring    | `GET /monitoring/alerts`                                    | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Fleet Monitoring    | `GET /monitoring/vehicles/{{deviceId}}/history`             | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Fleet Monitoring    | `GET /monitoring/usage`                                     | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Fleet Monitoring    | `GET /monitoring/usage/summary`                             | Ringkasan, armada live, peta, notifikasi, riwayat GPS, penggunaan internet, perbandingan operator |
| Operator Ownership  | `GET /cms/operators`                                        | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `POST /cms/operators`                                       | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `PATCH /cms/operators/{{operatorId}}`                       | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `GET /cms/operators/{{operatorId}}/buses`                   | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `PUT /cms/operators/{{operatorId}}/buses/{{busId}}`         | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `DELETE /cms/operators/{{operatorId}}/buses/{{busId}}`      | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `GET /cms/operators/{{operatorId}}/routes`                  | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `PUT /cms/operators/{{operatorId}}/routes/{{routeCode}}`    | Operator / Bus / Rute                                                                             |
| Operator Ownership  | `DELETE /cms/operators/{{operatorId}}/routes/{{routeCode}}` | Operator / Bus / Rute                                                                             |
| CMS Buses           | `GET /cms/buses`                                            | Master bus                                                                                        |
| CMS Buses           | `POST /cms/buses`                                           | Master bus                                                                                        |
| CMS Buses           | `GET /cms/buses/{{busId}}`                                  | Master bus                                                                                        |
| CMS Buses           | `PATCH /cms/buses/{{busId}}`                                | Master bus                                                                                        |
| CMS Buses           | `DELETE /cms/buses/{{busId}}`                               | Master bus                                                                                        |
| CMS Routes          | `GET /cms/routes`                                           | Rute                                                                                              |
| CMS Routes          | `POST /cms/routes`                                          | Rute                                                                                              |
| CMS Routes          | `PATCH /cms/routes/{{routeCode}}`                           | Rute                                                                                              |
| CMS Routes          | `DELETE /cms/routes/{{routeCode}}`                          | Rute                                                                                              |
| CMS Devices         | `GET /cms/devices`                                          | Perangkat OBU                                                                                     |
| CMS Devices         | `POST /cms/devices`                                         | Perangkat OBU                                                                                     |
| CMS Devices         | `PATCH /cms/devices/{{deviceId}}`                           | Perangkat OBU                                                                                     |
| CMS Devices         | `DELETE /cms/devices/{{deviceId}}`                          | Perangkat OBU                                                                                     |
| CMS Devices         | `POST /cms/devices/{{deviceId}}/rotate-token`               | Perangkat OBU                                                                                     |
| Driver Help Tickets | `GET /cms/help-reports`                                     | Tiket bantuan                                                                                     |
| Driver Help Tickets | `PATCH /cms/help-reports/{{helpReportId}}/status`           | Tiket bantuan                                                                                     |
| CMS Users           | `GET /cms/users`                                            | Pengguna                                                                                          |
| CMS Users           | `POST /cms/users`                                           | Pengguna                                                                                          |
| CMS Users           | `PATCH /cms/users/{{userId}}`                               | Pengguna                                                                                          |
| CMS Audit           | `GET /cms/audit`                                            | Log audit                                                                                         |

Pemetaan respons dan batas verifikasi terbaru ada di [audit contoh respons](response-audit.md).

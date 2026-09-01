# SIM PKL — Panduan Teknis

Sistem Informasi & Manajemen Presensi Siswa Praktik Kerja Lapangan
SMK HKTI 2 Purwareja Klampok · versi 2.8

Dokumen ini menjelaskan aplikasi sebagaimana adanya sekarang: cara kerjanya, cara
memasangnya dari nol, dan cara mengembangkannya. Ditulis untuk orang yang akan
melanjutkan pemeliharaan aplikasi ini, termasuk bila itu bukan Anda.

---

## 1. Gambaran singkat

Aplikasi web untuk mengelola PKL siswa SMK: presensi selfie berbasis lokasi,
jurnal kegiatan harian, pendaftaran dan penempatan tempat PKL, laporan akhir,
penilaian, dan sertifikat digital.

Tiga peran: **Siswa**, **Guru Pembimbing**, dan **Pokja PKL (Admin)**.

Dibangun mobile-first — mayoritas siswa mengaksesnya lewat ponsel.

---

## 2. Arsitektur

Aplikasi terbagi dua bagian yang berjalan di tempat berbeda:

```
    Browser siswa / guru
            │
            │  https://pklpro.vercel.app        ← halaman & tampilan
            ▼
    ┌───────────────────┐
    │  Vercel (statis)  │  index.html, app.css, app1–6.js
    └─────────┬─────────┘
              │  fetch POST { fn, args }
              │  credentials: 'omit'  ← tanpa cookie
              ▼
    ┌───────────────────┐
    │  Apps Script      │  Kode.gs — doPost() → petaApi() → 72 fungsi
    └─────────┬─────────┘
              ▼
    Google Sheets (data)  +  Google Drive (berkas)
```

### Mengapa dipisah seperti ini

Ini bukan pilihan gaya, melainkan jawaban atas satu masalah yang tidak punya
jalan lain.

Ketika halaman aplikasi disajikan langsung oleh Apps Script, Google **menulis
ulang alamatnya** mengikuti cookie akun yang sedang masuk di browser:

```
diminta : script.google.com/macros/s/AKfy…/exec
menjadi : script.google.com/macros/u/2/s/AKfy…/exec
```

Lalu Google mencari penerapan itu di dalam konteks Drive milik akun slot-2,
tidak menemukannya, dan menampilkan halaman Drive *"Maaf, saat ini tidak dapat
membuka file"*. Ini terjadi **sebelum** kode aplikasi dijalankan, sehingga tidak
ada setelan penerapan yang bisa memperbaikinya. Hampir semua ponsel siswa dan
laptop guru masuk ke lebih dari satu akun Google, jadi aplikasi praktis tidak
bisa dibuka siapa pun kecuali lewat tab samaran.

Permintaan `fetch` lintas domain dikirim **tanpa cookie**. Tanpa cookie, Google
tidak punya akun untuk dirutekan, dan permintaan sampai apa adanya — sama persis
di setiap perangkat.

> ⚠️ **Jangan mengembalikan halaman aplikasi ke Apps Script.** Itu akan
> menghidupkan lagi masalah yang persis ini. `doGet()` sengaja hanya berisi
> pengalih ke alamat Vercel.

### Yang ikut membaik karena pemisahan ini

- **Tidak ada lagi batas ukuran halaman.** Dulu seluruh HTML+CSS+JS harus muat
  dalam 256 KB keluaran `HtmlService`, dan berkas klien terpaksa dipecah enam
  serta ditulis tanpa komentar. Sekarang berkas dilayani Vercel apa adanya —
  tulis komentar sebanyak yang perlu.
- **Kamera dan GPS adalah izin domain sendiri.** Selfie presensi berjalan
  langsung di halaman; tidak perlu jendela terpisah.
- **Boot lebih cepat**, karena berkas statis dilayani CDN.

---

## 3. Struktur berkas

### Repo GitHub → Vercel (kode klien)

| Berkas | Isi |
|---|---|
| `index.html` | Kerangka DOM, sidebar, header, modal, dan **alamat API** |
| `app.css` | Seluruh tampilan, tema terang & gelap |
| `app1.js` | Inti: `AppState`, `panggil()`, mesin tabel, navigasi, sesi |
| `app2.js` | Beranda siswa, presensi, kamera, izin/sakit |
| `app3.js` | Riwayat, jurnal, tempat PKL, laporan, nilai, profil |
| `app4.js` | Dashboard guru/admin, monitoring, rekap, penilaian |
| `app5.js` | Pendaftaran, master data, impor Excel |
| `app6.js` | Sertifikat, pengaturan, akun, boot |
| `vercel.json` | Mencegah berkas baru tertahan cache lama |
| `api/gas.js` | Proxy cadangan — lihat §10 |
| `favicon.svg` + `favicon-16/32.png` | Ikon tab browser |
| `apple-touch-icon.png` | Ikon saat ditambahkan ke layar utama iOS |
| `icon-192/512.png`, `icon-maskable-512.png` | Ikon untuk `manifest.webmanifest` |
| `manifest.webmanifest` | Nama, warna, dan ikon saat dipasang di layar utama |

### Ikon dan identitas tab

Favicon bawaan berupa topi toga putih di atas kotak `#1C7293` — warna utama
aplikasi. Ikon ini statis dan tampil seketika, bahkan sebelum pengguna login.

Bila admin mengisi **URL Logo Sekolah** di Pengaturan, `pasangFaviconSekolah()`
menggantinya dengan logo tersebut, dan judul tab ikut mengikuti **Nama
Aplikasi**. Penggantian hanya dilakukan **setelah gambar terbukti dapat
dimuat** — menukar lebih dulu lalu gagal akan meninggalkan tab tanpa ikon sama
sekali, dan itu lebih buruk daripada memakai ikon bawaan.

Karena `manifest.webmanifest` berupa berkas statis, nama di layar utama tetap
"SIM PKL" walau nama aplikasi diubah lewat Pengaturan. Bila sekolah memakai nama
lain, sunting berkas itu langsung.

Urutan `app1.js` … `app6.js` **penting**: berkas berikutnya memakai fungsi dari
berkas sebelumnya.

### Apps Script (kode server)

Hanya satu berkas: **`Kode.gs`**. Tidak ada berkas HTML di sini.

---

## 4. Komunikasi klien–server

Seluruh komunikasi lewat **satu** fungsi di klien:

```js
const res = await panggil('namaFungsiServer', arg1, arg2);
```

`panggil()` mengirim `POST { fn, args }` ke Apps Script, dan `doPost()`
menerjemahkannya:

1. Membaca `{ fn, args }` dari badan permintaan.
2. Mencocokkan `fn` dengan **daftar putih** `petaApi()` — 72 nama.
3. Menjalankan fungsinya, mengembalikan `{ hasil: … }` atau `{ __galat: "…" }`.

Sebagian besar fungsi server mengembalikan bentuk seragam:

```js
{ success: true|false, data: …, message: 'penjelasan untuk pengguna' }
```

### Masuk dan keluar

`masukLengkap()` mengerjakan doLogin, getBootstrapData, dan semuaHalamanHtml
dalam **satu** eksekusi. Sebelumnya ketiganya berjalan berurutan sebagai tiga
perjalanan terpisah, masing-masing 1–2 detik, sehingga pengguna menunggu lama
memandangi form login yang belum juga berganti.

Keluar dikerjakan **optimistis**: layar dibersihkan lebih dulu memakai kerangka
halaman login yang sudah ikut terkirim saat masuk, lalu `doLogout` menyusul di
latar belakang. Sesi lokal sudah dibuang, jadi tidak ada yang bisa dilakukan
seandainya permintaan itu gagal di jalan.

Keduanya berlaku untuk ketiga peran — alurnya memang cuma satu.

### Menambah fungsi server baru

1. Tulis fungsinya di `Kode.gs`. Baris pertama **wajib** memeriksa sesi:
   ```js
   const sesi = validateSession(token);
   if (!sesi.valid) return createResponse(false, null, 'Sesi tidak valid.');
   ```
2. Daftarkan namanya di `petaApi()`. **Tanpa langkah ini fungsi tidak dapat
   dipanggil** — dan itu memang disengaja.
3. Panggil dari klien dengan `panggil('namaFungsi', …)`.

### Keamanan

Alamat `/exec` menerima POST dari siapa saja — itu memang perlu, dan sama dengan
situasi sebelumnya. Pertahanannya ada di dua lapis:

- **Daftar putih.** Hanya 72 nama di `petaApi()` yang bisa dijangkau. Fungsi
  internal seperti `setupAppEnvironment`, `bacaSheet`, atau `hashPassword` tidak.
- **Token sesi.** Setiap fungsi memeriksa sesi dan perannya sendiri. Tanpa login
  yang sah, tidak ada satu data pun yang bisa diambil.

Password disimpan sebagai SHA-256 bergaram per akun. Sesi berumur 6 jam.

---

## 5. Percepatan

Empat lapis, dari yang paling dekat ke pengguna:

| Lapis | Cara kerja |
|---|---|
| **Kerangka semua halaman** | `semuaHalamanHtml()` mengirim HTML seluruh menu sekali saat login. Perpindahan menu jadi operasi DOM murni — nol perjalanan server |
| **Paket data awal** | `paketDataAwal()` menarik data seluruh halaman di latar belakang setelah aplikasi hidup |
| **Cache berkunci versi** | `dataAwalHalaman()` menyimpan hasil per halaman per akun. Kuncinya memuat `versiData()` yang naik setiap ada penulisan, jadi cache lama otomatis tak terbaca — tanpa risiko data basi |
| **Memo per eksekusi** | `MEMO_SHEET` membuat satu sheet hanya dibaca sekali per permintaan, betapa pun sering disentuh |

Dua hal berikut sengaja di-memo karena dulu terbukti menghabiskan puluhan detik:
`getTZ()` dan `offsetZonaMs()` (dulu satu panggilan layanan **per sel tanggal**),
serta `getSpreadsheet()` (dulu `openById()` belasan kali per permintaan).

> **Aturan yang tidak boleh dilanggar:** setiap fungsi yang menulis data harus
> memanggil `lupakanMemo(namaSheet)` **sebelum** `return`. Menaruhnya setelah
> `return` membuatnya tidak pernah dijalankan, dan akibatnya data basi bertahan
> sampai 10 menit.

---

## 6. Database

Spreadsheet **`DB_SIM_PKL`** di dalam folder Drive **`SIM_PKL_Data`**, 17 sheet:

| Sheet | Isi |
|---|---|
| `Akun` | Login: username, hash, garam, peran, tautan ke Siswa/Guru |
| `Siswa` | Biodata siswa, kelas, jurusan, status penempatan |
| `GuruPembimbing` | Biodata guru pembimbing |
| `TempatPKL` | Instansi, koordinat, radius, kuota, jam & hari kerja |
| `PendaftaranPKL` | Pengajuan siswa beserta statusnya |
| `PenempatanPKL` | Relasi aktif siswa–tempat–guru |
| `Presensi` | Masuk, Pulang, Izin, dan Sakit — satu sheet, dibedakan kolom `Jenis` |
| `JurnalHarian` | Jurnal kegiatan beserta review guru |
| `LaporanAkhir` | Berkas laporan dan statusnya |
| `KriteriaPenilaian` | Kriteria & bobot yang dapat diubah admin |
| `Penilaian` | Nilai per siswa, rincian per kriteria di `NilaiDetail` (JSON) |
| `Pengumuman` | Pengumuman beserta sasarannya |
| `PeriodePKL` | Tahun ajaran, semester, tahap, rentang tanggal |
| `Sertifikat` | Nomor dan berkas sertifikat terbit |
| `LogNotifikasi` | Riwayat email terkirim |
| `Sesi` | Token sesi aktif |
| `AppConfig` | Seluruh pengaturan aplikasi (pasangan kunci–nilai) |

### Folder Drive

`SIM_PKL_Data` berisi tujuh subfolder: `Foto_Presensi`, `Foto_Jurnal`,
`Laporan_Akhir`, `Surat_Pengantar`, `Sertifikat`, `Foto_Profil`, `Template`.

Setiap berkas diunggah dengan akses *anyone with link* agar dapat ditampilkan di
aplikasi. ID-nya — bukan URL-nya — yang disimpan di sheet.

### Kolom yang wajib berformat teks

`NIS`, `NIP`, `NoHP`, `NoKontak`, `JamMasuk`, `JamPulang`, `Username`.

Tanpa ini Sheets membaca `081234…` sebagai angka dan membuang nol depannya, serta
membaca `08:00` sebagai waktu yang lalu terbaca `1899-12-30`.
`setupAppEnvironment()` memaksa formatnya, dan `formatNilaiSel()` memperbaiki
data lama saat dibaca.

---

## 7. Peran dan hak akses

| Halaman | Siswa | Guru | Admin |
|---|:---:|:---:|:---:|
| Beranda, Profil Saya | ✅ | ✅ | ✅ |
| Presensi, Riwayat, Jurnal, Tempat PKL, Laporan, Nilai | ✅ | — | — |
| Monitoring, Rekap Jurnal, Rekap Laporan, Penilaian, Pengumuman | — | ✅ | ✅ |
| Pendaftaran, Data Siswa, Guru, Tempat PKL, Periode, Sertifikat, Pengaturan | — | — | ✅ |

Guru hanya melihat **siswa bimbingannya**; admin melihat seluruhnya. Pembatasan
itu dijalankan `bolehAksesSiswa()` di server — bukan sekadar disembunyikan di
tampilan.

---

## 8. Aturan yang perlu diketahui

### Presensi

- Presensi sah hanya bila siswa berada **dalam radius** tempat PKL. Di luar
  radius **ditolak**, tidak disimpan dengan status khusus.
- Akurasi GPS diperhitungkan sebagai margin: `jarakEfektif = jarak − akurasi`,
  sehingga siswa tidak dirugikan sinyal lemah. Akurasi di atas 200 m ditolak
  karena tidak dapat dipercaya.
- Radius bawaan 100 m, dapat diatur per tempat PKL.
- Status **Telat** bila melewati jam masuk + toleransi (bawaan 15 menit).
- Foto selfie **wajib**, dan hanya boleh dari kamera langsung. Tidak ada jalur
  unggah berkas — itu disengaja, karena jalur unggah membuka celah memakai foto
  lama.

### Izin dan Sakit

Disimpan di sheet `Presensi` dengan `Jenis` = `Izin`/`Sakit`, supaya rekap
kehadiran punya satu sumber kebenaran. Wajib melampirkan bukti. Boleh diajukan
maksimal 14 hari ke depan atau 3 hari ke belakang. Selama pengajuan masih
`Menunggu`, presensi hari itu terkunci agar tidak bentrok. Guru memverifikasinya
di **Monitoring Siswa**.

### Alpha

Dihitung **saat data dibaca**, bukan ditulis lewat trigger harian. Dua alasannya:
tidak ada trigger yang bisa gagal diam-diam, dan bila izin disetujui belakangan
untuk tanggal lampau, catatan Alpha hilang dengan sendirinya.

| Kondisi | Status |
|---|---|
| Hari kerja lampau, tanpa presensi & tanpa izin | Alpha |
| Hari berjalan, belum lewat jam pulang | Belum Presensi |
| Hari berjalan, sudah lewat jam pulang | Alpha |
| Bukan hari kerja (mengikuti kolom Hari Kerja) | Libur — tidak dihitung |
| Di luar rentang penempatan | tidak dihitung |

### Penilaian

Kriteria dan bobotnya dapat diubah admin lewat **Penilaian → Kriteria & Bobot**.
Bawaannya: Kedisiplinan 30, Jurnal Kegiatan 25, Laporan Akhir 25, Sikap & Etika 20.

Nilai akhir **dinormalisasi**: `Σ(nilai × bobot) ÷ Σbobot`, jadi tetap benar pada
skala 0–100 walau total bobot bukan 100%.

Predikat: ≥90 Sangat Kompeten · ≥80 Kompeten · ≥70 Cukup Kompeten · sisanya Belum
Kompeten.

### Sertifikat

Lima syarat, semuanya wajib: penempatan aktif · ada rekaman kehadiran · minimal
satu jurnal disetujui · laporan akhir disetujui · sudah dinilai.

Nomor disusun dari format yang dapat diatur, misalnya
`{NOMOR}/PKL/{KODE_SEKOLAH}/{BULAN_ROMAWI}/{TAHUN}` → `001/PKL/SMKHKTI2/IX/2026`.
Kode yang tersedia: `{NOMOR}` `{TAHUN}` `{TAHUN2}` `{BULAN}` `{BULAN_ROMAWI}`
`{KODE_SEKOLAH}` `{NIS}` `{TAHUN_AJARAN}`. Format wajib memuat `{NOMOR}`.
Pratinjau **tidak** menghabiskan nomor urut.

Desainnya boleh memakai template Google Slides sendiri dengan 21 placeholder
(`{{NAMA}}`, `{{NILAI_AKHIR}}`, `{{RINCIAN_NILAI}}`, dan seterusnya). Tombol
**Buatkan Template Contoh Otomatis** membuat berkas Slides berisi seluruh
placeholder lalu langsung memasangnya. Bila tidak ada template, aplikasi memakai
desain bawaan.

---

## 9. Pemasangan dari nol

### 1 — Apps Script

1. Buat proyek Apps Script baru, tempel seluruh isi `Kode.gs`.
2. Sesuaikan konstanta di dekat atas berkas:
   ```js
   const URL_APLIKASI = 'https://pklpro.vercel.app';
   ```
3. Jalankan **`setupAppEnvironment()`** sekali dari editor. Fungsi ini membuat
   folder Drive, spreadsheet, seluruh sheet, konfigurasi awal, dan akun admin.
   Aman dijalankan berulang — tidak pernah menghapus apa pun, hanya menambahkan
   yang belum ada. Periksa hasilnya di **View → Logs**.
4. **Deploy → New deployment → Web app**
   | Kolom | Nilai |
   |---|---|
   | Execute as | **Me** |
   | Who has access | **Anyone** |

   "Anyone" wajib: `doPost()` memang harus bisa dipanggil tanpa akun. Salin
   **Web app URL** yang berakhiran `/exec` — bukan Deployment ID.

### 2 — Vercel

1. Salin seluruh isi folder `web/` ke akar repo GitHub.
2. Di `index.html`, isi alamat API dengan `/exec` dari langkah sebelumnya:
   ```js
   window.SIMPKL_API = 'https://script.google.com/macros/s/…/exec';
   ```
3. Push. Vercel membangun otomatis.

### 3 — Uji

Buka alamat Vercel di ponsel lain, **mode normal** — bukan tab samaran. Itu satu-
satunya uji yang berarti. Masuk dengan akun bawaan:

```
Username : admin
Password : admin123
```

**Segera ganti** lewat Profil Saya → Ganti Password.

### Setiap kali mengubah kode

| Yang diubah | Yang harus dilakukan |
|---|---|
| `Kode.gs` | Simpan → **Deploy → Manage deployments → ✏️ → New version** |
| `web/*` | Push ke GitHub |

Mengubah `Kode.gs` tanpa membuat versi baru tidak berpengaruh apa pun pada
aplikasi yang berjalan. Ini kekeliruan yang paling sering terjadi.

Jangan memilih **New deployment** — alamatnya berubah dan `SIMPKL_API` di Vercel
jadi salah.

---

## 10. Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| Aplikasi kosong, Console menyebut **CORS** | Aktifkan proxy cadangan: di `index.html` ubah `window.SIMPKL_API` menjadi `'/api/gas'`, lalu push. Permintaan jadi satu domain dengan halaman sehingga CORS tidak berlaku, dan `api/gas.js` meneruskannya dari sisi server |
| Semua panggilan gagal setelah mengubah `Kode.gs` | Belum **New version** setelah menyimpan |
| Halaman **Google Drive** "tidak dapat membuka file" | Ada yang membuka `/exec` langsung, bukan alamat Vercel. Bagikan alamat Vercel |
| "Sheet tidak ditemukan" atau kolom kosong | `setupAppEnvironment()` belum dijalankan setelah penambahan kolom |
| Data lama muncul lagi setelah diubah | Ada fungsi penulisan yang tidak memanggil `lupakanMemo()` — lihat §5 |
| Jam kerja terbaca `1899-12-30` | Jalankan `setupAppEnvironment()`, lalu buka Tempat PKL → edit → isi ulang jamnya |
| Nol depan nomor HP hilang | Data lama perlu diketik ulang sekali; data baru sudah otomatis benar |
| Kamera tidak menyala | Aplikasi menjelaskan penyebabnya di tempat placeholder — izin ditolak, tidak ada kamera, atau kamera dipakai aplikasi lain |
| Penilaian kosong | Pastikan minimal satu kriteria berstatus Aktif |
| Grafik tidak muncul | Chart.js gagal diunduh dari CDN. Data tetap tersedia dalam bentuk tabel |

Untuk galat yang tidak jelas, buka **Console browser (F12)** dan **Executions**
di editor Apps Script — keduanya menunjukkan sisi yang berbeda dari masalah yang
sama.

---

## 11. Pengembangan selanjutnya

**Menambah halaman.** Daftarkan di `AKSES_HALAMAN` (siapa boleh membuka), tulis
fungsi `buildNamaHalaman()` di `Kode.gs`, sambungkan di `switch` dalam
`getPageContent()`, daftarkan di `menuAplikasi()` dan `judulHalaman()`, lalu
tambahkan penyiapnya di `INIT_HALAMAN` pada `app2.js`.

**Menambah kolom sheet.** Cukup tambahkan ke `definisiSkema()` lalu jalankan
`setupAppEnvironment()`. Kolom baru selalu masuk di ujung kanan sehingga data
lama tidak bergeser.

**Menambah tabel data.** Pakai `buatTabel()` di `app1.js`. Pengurutan, pencarian,
paginasi, filter otomatis, ekspor Excel/PDF, dan aksi massal ikut didapat tanpa
kode tambahan. Filter dibangun sendiri dari nilai unik pada data — kolom dengan
2–30 nilai berbeda dianggap layak jadi filter, sisanya diabaikan.

### Palet grafik

Warna status pada grafik ditetapkan di satu tempat — `warnaGrafik()` di
`app1.js` — sehingga dashboard siswa, guru, dan admin selalu memakai warna yang
sama. Nilainya lembut, tetapi bukan hasil kira-kira: setiap pasangan diuji
terhadap lima gerbang (pita terang, ambang kroma, keterpisahan bagi mata buta
warna, ambang mata normal, dan kontras terhadap kartu), untuk SELURUH pasangan —
bukan hanya yang bersebelahan — karena potongan donat bisa bertetangga dalam
urutan apa pun.

| Status | Terang | Gelap |
|---|---|---|
| Hadir | `#4CA37D` | `#49A97E` |
| Telat | `#C2891A` | `#BC8B33` |
| Izin | `#2F6DA8` | `#3273AE` |
| Sakit | `#A87FD9` | `#9E7ED2` |
| Alpha | `#B0353F` | `#B0414F` |
| Belum Presensi | `#B6C2C9` | `#48545A` |

Dua pasangan tersulit — Hadir(hijau) lawan Alpha(merah), dan Izin(biru) lawan
Sakit(violet) — dipisahkan dengan memberi jarak **terang**, bukan menggeser rona.
Itu sebabnya biru sengaja gelap dan violet sengaja terang, dan mengapa daftar
hex-nya terlihat tidak beraturan bila dibaca sebagai deretan angka. Bila suatu
saat diubah, ukur ulang — jangan hanya dilihat.

> **Operator di dalam `calc()` wajib diapit spasi.** `calc(8px+env(...))` bukan
> CSS yang sah: browser membuang seluruh deklarasinya tanpa pesan galat apa pun.
> Pola ini pernah membuat padding topbar, bilah navigasi bawah, laci, dan kaki
> modal tidak pernah berlaku sama sekali. Tulis `calc(8px + env(...))`.

**Ubah tampilan.** Semua warna dan jarak berupa variabel CSS di puncak
`app.css`, terpisah untuk tema terang dan gelap.

**Menulis komentar.** Silakan. Batasan lama yang melarang `//` dan `/*` di berkas
klien berasal dari pembersih komentar Apps Script, dan sudah tidak berlaku sejak
berkas dilayani Vercel.

---

## 12. Batasan yang perlu disadari

- **Kuota Apps Script.** Eksekusi maksimal 6 menit; email harian terbatas.
  Impor dibatasi 1000 baris sekali jalan.
- **Sheets bukan basis data transaksional.** Penulisan penting dilindungi
  `LockService`. Untuk jumlah siswa satu sekolah ini memadai; untuk skala jauh
  lebih besar, basis data sungguhan akan lebih tepat.
- **Login Google tidak tersedia.** Pada penerapan "Anyone", Google tidak memberi
  tahu siapa yang membuka, sehingga tombolnya menyembunyikan diri sendiri. Ini
  konsekuensi langsung dari setelan yang membuat aplikasi bisa dibuka semua
  perangkat — dan pertukaran yang sepadan. Login NIS/NIP berlaku penuh untuk
  semua orang.
- **Cadangkan berkala.** Salin `DB_SIM_PKL` secara berkala. Tidak ada mekanisme
  pemulihan bawaan.

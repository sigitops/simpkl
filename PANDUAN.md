# SIM PKL — Panduan Teknis

Sistem Informasi & Manajemen Presensi Siswa Praktik Kerja Lapangan
SMK HKTI 2 Purwareja Klampok · versi 3.7

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
    │  Apps Script      │  Kode.gs — doPost() → petaApi() → 88 fungsi
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
2. Mencocokkan `fn` dengan **daftar putih** `petaApi()` — 88 nama.
3. Menjalankan fungsinya, mengembalikan `{ hasil: … }` atau `{ __galat: "…" }`.

Sebagian besar fungsi server mengembalikan bentuk seragam:

```js
{ success: true|false, data: …, message: 'penjelasan untuk pengguna' }
```

### Ketahanan transport

`panggil()` dan `panggilDiam()` sama-sama memakai satu inti, `kirimKeServer()`.
Inti itu ada karena satu kegagalan yang sempat sampai ke pengguna: aplikasi
dibuka setelah lama menganggur, permintaan pertama ke `/exec` tidak sampai, dan
yang tampil adalah halaman putih kosong.

Yang perlu dipahami tentang gejalanya: Console menyebut **CORS**, tetapi setelan
CORS aplikasi ini tidak pernah salah. Selama `doPost()` menjawab, jawabannya
disajikan lewat `script.googleusercontent.com` dengan `Access-Control-Allow-Origin: *`.
Pesan CORS muncul justru ketika permintaan **tidak sampai ke `doPost()`** — instans
Apps Script masih dingin, Google membalas 5xx sesaat, atau koneksi HTTP yang
menganggur sejak layar terkunci sudah mati (`net::ERR_FAILED`). Google lalu
membalas dengan halamannya sendiri, yang memang tidak berheader CORS.

Empat lapis penahannya:

| Lapis | Perilaku |
|---|---|
| **Batas waktu** | `AbortController`, 25 detik. Permintaan yang menggantung tidak pernah abadi |
| **Pengulangan berjenjang** | 3 percobaan tambahan berjarak 400/1200/2600 ms plus jitter. Jeda itu cukup untuk memaksa peramban membuka koneksi baru |
| **Jalur cadangan** | Setelah semuanya habis, satu percobaan lewat `/api/gas` (proxy Vercel, satu domain dengan halaman sehingga CORS tidak berlaku). Bila berhasil, jalur itu dipakai 30 menit lalu kembali ke jalur langsung |
| **Penggolongan galat** | Kegagalan transport diberi tanda `err.jenis === 'jaringan'`, dibedakan dari galat aplikasi. `iniGalatJaringan()` yang memeriksanya |

**404 dan 403 ikut dihitung sebagai gangguan sesaat**, dan ini berlawanan dengan
naluri. Apps Script tidak menjawab POST secara langsung: `/exec` membalas 302 ke
`script.googleusercontent.com/macros/echo?user_content_key=…`, dan kunci itu
berumur pendek serta sekali pakai. Pada jaringan seluler yang lambat, lompatan
kedua itu bisa tiba setelah kuncinya kedaluwarsa — Google menjawab 404, padahal
penerapannya sehat. Gejalanya khas: satu panel gagal dengan "Server menjawab kode
404" sementara seluruh isi halaman yang sama baik-baik saja. Penerapan yang
benar-benar salah alamat tetap gagal sesudah semua percobaan habis, hanya empat
detik lebih lambat.

**Hanya pembacaan yang diulang dan dialihkan.** Awalan `get`, `cari`, `periksa`,
`html`, `hitung`, `rekap`, `daftar`, `statistik`, `semua`, `opsi` (dan seluruh
fungsi masuk) dianggap aman.
Penyimpanan data tidak pernah diulang otomatis: permintaan yang gagal di tengah
jalan bisa saja sudah tercatat di spreadsheet, dan mengirimnya lagi berisiko
menggandakan baris presensi atau jurnal. Untuk itu pengguna diberi pesan dan
menekan tombolnya sendiri.

Tiga akibat penting di sisi antarmuka:

1. **Halaman login tidak pernah kosong.** Kerangkanya dirakit server, jadi dulu
   tanpa server tidak ada apa pun untuk digambar — dan blok `catch` menulis
   `wadah.innerHTML = ''`. Kini kerangkanya disinggah di `localStorage`
   (`htmlLogin`) dan masih ada `loginCadangan()` sebagai cadangan bawaan.
2. **Gangguan jaringan tidak mengeluarkan pengguna.** `mulaiAplikasi()` hanya
   membuang token bila server benar-benar menjawab bahwa sesinya tidak berlaku.
   Sebelumnya satu permintaan yang tidak sampai sudah cukup untuk menghapus sesi
   yang masih sah sepenuhnya.
3. **Layar galat punya dua wajah.** `tampilkanGalatFatal(pesan, 'jaringan')`
   menjelaskan koneksi dan menghitung mundur percobaan otomatis; tanpa argumen
   kedua ia menampilkan diagnosis integritas kode. Dulu keduanya satu, sehingga
   gangguan jaringan pun disuruh menyalin ulang berkas dan men-deploy ulang.

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

### Fungsi kembar server–klien

Sebagian kecil HTML dirakit di server, bukan di browser — yang terbesar adalah
isi modal detail siswa di `htmlDetailSiswa()`. Potongan itu memakai pembantu
tampilan `esc()`, `tglSingkat()`, dan `chipStatus()`, sehingga **ketiganya harus
ada di kedua sisi dengan keluaran yang sama persis**.

Kelalaian ini sudah dua kali lolos ke lapangan — `tglSingkat is not defined`
lalu `chipStatus is not defined` — karena Apps Script baru mengeluh saat fungsi
itu benar-benar dipanggil, bukan saat kode disimpan. `uji/uji-kembaran.js`
menjaganya dengan dua pemeriksaan: tidak ada fungsi khusus-klien yang dipanggil
di dalam `${…}` pada `Kode.gs`, dan setiap fungsi kembar menghasilkan keluaran
identik untuk 30 contoh masukan. Jalankan uji itu setiap kali menambah pembantu
tampilan baru.

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

- **Daftar putih.** Hanya 88 nama di `petaApi()` yang bisa dijangkau. Fungsi
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
| **Pramuat saat singgah** | Kursor yang berhenti 170 ms di sebuah menu memicu pengambilan data halaman itu, jadi saat diklik datanya sudah ada. Dulu berhenti sia-sia karena kerangka HTML memang sudah terkirim; kini yang diperiksa adalah kesiapan datanya |
| **Singgahan klien** | `SinggahData` di `app1.js` menggambar halaman yang pernah dibuka seketika dari data tersimpan, lalu memeriksa server diam-diam dan menggambar ulang hanya bila isinya berubah. `batalkanPaketData()` membuangnya setiap kali pengguna mengubah data |
| **Memo per eksekusi** | `MEMO_SHEET` membuat satu sheet hanya dibaca sekali per permintaan, betapa pun sering disentuh |

Dua hal berikut sengaja di-memo karena dulu terbukti menghabiskan puluhan detik:
`getTZ()` dan `offsetZonaMs()` (dulu satu panggilan layanan **per sel tanggal**),
serta `getSpreadsheet()` (dulu `openById()` belasan kali per permintaan).

### Kunci pengalihan sekali pakai (v3.7)

Modal detail siswa menggantung di "Memuat detail…", dan Console menunjukkan
`getRiwayatPresensi` dan `getRiwayatPenempatan` sama-sama gagal **404 pada satu
`user_content_key` yang sama**.

Sebabnya bukan salah satu fungsi itu. `/exec` tidak menjawab POST secara
langsung: ia membalas 302 ke
`script.googleusercontent.com/macros/echo?user_content_key=…`, dan kunci itu
**sekali pakai**. Peramban boleh menyinggah pengalihan; ketika dua POST berangkat
nyaris bersamaan ke alamat yang sama persis, keduanya dapat mengikuti pengalihan
tersinggah yang sama — satu memakai kuncinya, satu lagi menerima 404. Percobaan
ulangnya lalu menabrak CORS, karena Google menjawab dengan halaman galatnya
sendiri yang memang tidak berheader CORS.

Dua lapis penangkalnya:

| Lapis | Cara kerja |
|---|---|
| **Alamat unik per permintaan** | Setiap POST menambahkan `?_p=<nomor><waktu>` dan `cache: 'no-store'`. Tidak ada dua permintaan beralamat sama, jadi tidak ada pengalihan yang bisa dipakai berdua |
| **Penggabungan permintaan** | Pembacaan yang berangkat dalam hentakan yang sama (jendela 8 ms) disatukan menjadi satu `panggilBanyak()`. Modal detail yang tadinya dua permintaan kini satu |

`panggilBanyak(token, daftar)` menjalankan sampai 12 pembacaan dalam **satu**
eksekusi. Karena memo per eksekusi, sheet yang sama hanya dibaca sekali — paket
berisi tiga pembacaan hampir selalu lebih murah daripada tiga perjalanan
terpisah. **Hanya pembacaan yang boleh dipaketkan**; `AWALAN_BOLEH_PAKET` di
server menolak sisanya, karena klien sengaja tidak pernah mengulang penulisan
dan membungkusnya di dalam paket akan menyelundupkannya melewati aturan itu.

Klien juga tahan terhadap pasangan versi yang tidak seimbang: bila `web/`
ter-deploy lebih dulu daripada `Kode.gs`, server menolak `panggilBanyak`, klien
menyetel `PAKET_DIDUKUNG = false` dan mengirim permintaannya satu per satu —
aplikasi tetap berjalan, hanya kehilangan penggabungannya.

### Aturan beban server (v3.6) — dibayar dengan satu kemunduran nyata

v3.5 memecah login menjadi satu permintaan ringan plus dua pekerjaan latar, dan
memberi setiap permintaan batas waktu 25 detik. Keduanya masuk akal sendiri-
sendiri, dan bersama-sama justru mematikan dashboard: pemutar berputar selamanya
dan Console penuh `Server tidak menjawab dalam 25 detik`.

Sebabnya bukan satu permintaan yang lambat. **Apps Script mengantrekan eksekusi
milik pengguna yang sama.** Tepat sesudah masuk, klien melepas tiga permintaan
berat sekaligus — `semuaHalamanHtml`, `paketDataAwal`, dan `getDashboardMonitoring`
yang diminta dashboard untuk dirinya sendiri. Ketiganya mengantre, masing-masing
melewati 25 detik, lalu dibatalkan dan **diulang** — dan setiap pengulangan
menambah antrean yang justru menjadi sebab keterlambatannya.

Empat aturan yang sekarang berlaku, dan tidak boleh dilanggar:

| Aturan | Alasan |
|---|---|
| **Layar pertama tidak boleh meminta apa pun** | `masukKilat()` mengirim beranda **beserta `dataAwal`-nya**. Klien menaruhnya di `AppState.paketData`, sehingga `panggilCepat` menemukannya sebagai `dataAwal` dan dashboard tergambar tanpa satu pun permintaan tambahan |
| **Pekerjaan latar berjalan berurutan** | `jadwalkanTugasLatar()` menunggu satu detik, lalu menjalankan kerangka halaman dulu, baru paket data. Tidak pernah dua-duanya sekaligus |
| **Kehabisan waktu tidak diulang** | Batas dinaikkan (45 detik, 100 detik untuk perakitan berat) dan `galatLambat()` sengaja **tidak** lolos `bolehDiulang()`. Kehabisan waktu berarti server masih bekerja; permintaan kedua hanya menambah beban |
| **Permintaan kembar digabung** | `SEDANG_TERBANG` menyatukan pembacaan identik yang sedang berjalan menjadi satu janji. Penulisan tidak pernah digabung — dua tekan Simpan adalah dua kehendak |

Sebagai tambahan, `semuaHalamanHtml(token, hanya)` kini menerima daftar halaman.
Klien mengirim hanya yang belum dipegangnya, jadi begitu kerangka tersinggah di
`localStorage`, permintaan ini nyaris tidak berbiaya — pada pembukaan kedua ia
bahkan tidak dikirim sama sekali.

`uji/uji-boot.js` menjaga keempat aturan itu dengan mengukur puncak jumlah
permintaan yang berjalan bersamaan; nilainya harus tetap satu.

### Yang dihapus dari jalur kritis pada v3.5

Tiga sumber jeda yang paling terasa, dan bagaimana ketiganya dihilangkan.

**1. Perjalanan server kedua sesudah setiap simpan/hapus.** Polanya dulu
`batalkanPaketData(); muatTabelX();` — membuang seluruh singgahan lalu mengambil
ulang tabel yang barusan dikosongkan. Dua perjalanan berurutan, dengan tabel
berkedip kosong di antaranya.

`batalkanPaketData()` kini **lunak**: data lama tetap dipakai untuk menggambar
seketika, tetapi seluruh entri ditandai wajib diperiksa ulang, sehingga
penyegaran senyap tetap berjalan. Di atas itu, jawaban mutasi disuntikkan
langsung ke singgahan dengan `suntikBaris()`, jadi tabel sudah benar sebelum
penyegaran itu selesai. `batalkanPaketData(true)` — pembuangan sungguhan —
tinggal dipakai tombol Segarkan dan saat keluar.

**2. Merakit kerangka seluruh halaman saat login.** `masukLengkap()` merakit
belasan kerangka halaman sementara pengguna memandangi tombol Masuk yang
berputar, padahal yang dilihatnya sesudah itu hanya Beranda. `masukKilat()`
mengirim Beranda dan Login lebih dulu; sisanya disusul klien di latar belakang
lewat `lengkapiKerangkaHalaman()`, lalu disimpan di `localStorage` dengan kunci
`kerangka_<peran>` sehingga pembukaan berikutnya menggambar menu apa pun
seketika. Kerangka itu dibuang saat keluar — di ponsel yang dipakai bergantian,
menyisakannya berarti pengguna berikutnya bisa melihat sekilas menu peran
sebelumnya.

`semuaHalamanHtml()` sendiri kini menyinggah tiap kerangka di `CacheService`
dengan kunci `hal_<peran>_<halaman>_<versiData()>`. Karena `versiData()` naik
pada setiap penulisan, kerangka basi mustahil bertahan. **Hanya halaman dalam
`HALAMAN_SERAGAM` yang boleh disinggah** — yaitu halaman yang perakitnya tidak
menerima objek sesi sama sekali. Beranda, profil, monitoring, rekap-jurnal,
rekap-laporan, penilaian, dan pengumuman sengaja tidak ada di daftar itu karena
perakitnya membaca sesi; menambahkannya tanpa memeriksa tanda tangan fungsinya
adalah cara paling mudah membocorkan data antar pengguna.

**3. Mengganti tema memuat ulang seluruh halaman.** `toggleTema()` dulu memanggil
`jalankanInit(halamanAktif)` supaya grafik berganti warna — tetapi fungsi itu
menjalankan seluruh penyiapan halaman: tabel, antrean izin, antrean pindah,
kartu ringkasan, semuanya diambil ulang dari server. Kini setiap penggambar
grafik mendaftarkan dirinya ke `PELUKIS_GRAFIK` beserta data yang dipakainya,
dan pergantian tema menggambar ulang dari data itu. Nol perjalanan server.

> **Aturan yang tidak boleh dilanggar:** setiap fungsi yang menulis data harus
> memanggil `lupakanMemo(namaSheet)` **sebelum** `return`. Menaruhnya setelah
> `return` membuatnya tidak pernah dijalankan, dan akibatnya data basi bertahan
> sampai 10 menit.

---

## 6. Database

Spreadsheet **`DB_SIM_PKL`** di dalam folder Drive **`SIM_PKL_Data`**, 18 sheet:

| Sheet | Isi |
|---|---|
| `Akun` | Login: username, hash, garam, peran, tautan ke Siswa/Guru |
| `Siswa` | Biodata siswa, kelas, jurusan, status penempatan |
| `GuruPembimbing` | Biodata guru pembimbing |
| `TempatPKL` | Instansi, koordinat, radius, kuota, jam & hari kerja |
| `PendaftaranPKL` | Pengajuan siswa beserta statusnya |
| `PenempatanPKL` | Relasi siswa–tempat–guru; satu baris per penempatan, jadi rantainya sekaligus riwayat perpindahan |
| `PengajuanPindah` | Permintaan pindah tempat PKL dari siswa beserta keputusannya |
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
| Pendaftaran & Penempatan Langsung, Data Siswa, Guru, Tempat PKL, Periode, Sertifikat, Pengaturan | — | — | ✅ |
| Menyetujui pengajuan pindah & memindahkan siswa | — | — | ✅ |
| Mengajukan pindah tempat PKL | ✅ | — | — |

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

### Penempatan dan perpindahan

Satu siswa hanya boleh memiliki **satu** baris `PenempatanPKL` berstatus `Aktif`.
Hampir seluruh kode membaca penempatan dengan pola `find(Status === 'Aktif')` dan
mengambil hasil pertama, jadi dua baris aktif membuat sistem salah diam-diam:
siswa terhitung ganda di monitoring dan presensinya divalidasi ke radius yang
keliru. Setiap perubahan penempatan karena itu berjalan di dalam satu
`LockService`, dan **Pengaturan → Pemeriksa Penempatan** dapat mendeteksi bila
aturan ini pernah bocor sekaligus menyelaraskan ulang kuota.

Ada tiga jalan menuju penempatan:

| Jalur | Pemicu | Kolom `PendaftaranPKL.Jalur` |
|---|---|---|
| Pendaftaran mandiri | Siswa memilih tempat, Pokja PKL menerima | `Mandiri` |
| Penempatan langsung | Pokja PKL menempatkan sendiri lewat menu Pendaftaran | `Langsung` |
| Perpindahan | Penempatan lama ditutup, yang baru dibuka | — |

Penempatan langsung tetap menulis satu baris `PendaftaranPKL` berstatus
`Diterima`. Itu disengaja: seluruh laporan, ekspor, dan dashboard yang sudah ada
ikut menghitungnya tanpa satu baris pun kode laporan perlu diubah.

**Kunci pendaftaran mandiri.** Kolom `Siswa.KunciPendaftaran` menahan siswa yang
butuh pengawasan intensif sekolah agar tidak memilih tempat sendiri;
`ajukanPendaftaran()` menolaknya dengan alasan yang tercatat di `AlasanKunci`.

**Tempat PKL yang masih jadi jalan pulang.** Selama sebuah perpindahan masih
mungkin ditarik kembali, tempat asalnya tidak boleh dihapus — kalau dihapus,
siswa tidak punya tempat untuk dikembalikan. `tempatMasihJadiJalanPulang_()`
menahannya di `hapusMasterMassal()`, dan berhenti menahan begitu penempatan
barunya sudah dipakai sehingga pembatalan memang tidak lagi mungkin.
`batalkanPindahTempat()` juga menolak bila tempat asalnya sudah tidak ada,
alih-alih memulihkan penempatan yang menunjuk entah ke mana.

**Penempatan yatim.** Bila basis data terlanjur memuat penempatan aktif yang
tempat PKL-nya sudah dihapus, `penempatanYatim_()` mendeteksinya dan
`tutupPenempatanYatim()` menutupnya lewat **Pengaturan → Pemeriksa
Penempatan**. Siswanya kembali berstatus belum ditempatkan, presensi dan jurnal
lama tetap utuh.

**Pembatalan.** `batalkanPenempatan()` menarik kembali penempatan yang baru
dibuat, dan `batalkanPindahTempat()` mengembalikan siswa ke tempat sebelum
perpindahan terakhir. Keduanya menolak bila `jejakPenempatan_()` menemukan
presensi atau jurnal yang sudah menempel pada penempatan bersangkutan — sebab
membatalkan penempatan yang sudah dipakai membuat rekap kehadiran menunjuk ke
lokasi yang tidak lagi berlaku. Untuk kasus itu jalurnya adalah perpindahan
biasa, yang justru merawat riwayat. Baris yang dibatalkan berstatus `Batal`,
jadi riwayat tetap jujur mencatat bahwa tindakan itu pernah terjadi.

**Perpindahan.** `pindahkanPenempatan_()` adalah satu-satunya tempat perpindahan
benar-benar terjadi — dipakai baik oleh perpindahan langsung Pokja PKL maupun
oleh persetujuan pengajuan siswa. Urutannya: tutup baris lama
(`Status: 'Pindah'`), kembalikan kuota tempat lama, ambil kuota tempat baru,
tulis baris baru yang menunjuk `PenempatanSebelumnyaID`. Karena setiap
penempatan adalah satu baris, **rantai baris itulah riwayatnya** — tidak ada
sheet riwayat terpisah.

Presensi dan jurnal menyimpan `PenempatanID` sejak awal, sehingga tiap catatan
tahu ia dibuat di tempat mana. Rekap tetap menyaring berdasarkan `SiswaID`, jadi
kehadiran satu periode utuh lintas tempat; pecahannya per tempat dihitung
`getRiwayatPenempatan()`. Sertifikat mencetak tempat terakhir.

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
| Modal atau panel menggantung, Console menyebut 404 pada `user_content_key` | Dua POST berebut satu kunci pengalihan sekali pakai. Sejak v3.7 setiap permintaan beralamat unik dan pembacaan yang bersamaan digabung — lihat §4 |
| Panel gagal dengan **"Server menjawab kode 404"** | Gangguan sesaat pada lompatan redirect Apps Script. Sejak v3.5 permintaannya diulang otomatis. Bila menetap, periksa apakah `SIMPKL_API` menunjuk `/exec` penerapan yang masih ada |
| **/api/gas** menjawab 404 | Fungsi proxy tidak terbangun. Berkas `api/gas.js` harus memakai `module.exports`, bukan `export default` (repo ini tanpa package.json, jadi Vercel menjalankannya sebagai CommonJS). Periksa juga folder `api/` benar-benar ikut terdorong ke GitHub — buka `/api/gas` di peramban, jawabannya harus `{"siap":true,…}` |
| Console menyebut **CORS** | Sejak v3.4 ditangani sendiri: permintaan diulang, lalu dialihkan otomatis ke `/api/gas`. Bila tetap gagal, endpoint memang sedang mati — periksa **Executions** di editor Apps Script. Untuk memaksa proxy permanen, ubah `window.SIMPKL_API` di `index.html` menjadi `'/api/gas'` |
| Halaman putih kosong tanpa pesan | Seharusnya sudah tidak mungkin sejak v3.4 — lihat §4. Bila terjadi lagi, periksa apakah keenam `appN.js` benar-benar termuat (`window.__blok` harus 6) |
| Pengguna tiba-tiba ter-logout | Sesi memang berumur 6 jam (`SESSION_TTL`). Sejak v3.4 gangguan jaringan tidak lagi menghapus sesi, jadi logout mendadak berarti sesinya benar-benar kedaluwarsa |
| Semua panggilan gagal setelah mengubah `Kode.gs` | Belum **New version** setelah menyimpan |
| Halaman **Google Drive** "tidak dapat membuka file" | Ada yang membuka `/exec` langsung, bukan alamat Vercel. Bagikan alamat Vercel |
| "Sheet tidak ditemukan" atau kolom kosong | `setupAppEnvironment()` belum dijalankan setelah penambahan kolom |
| Data lama muncul lagi setelah diubah | Ada fungsi penulisan yang tidak memanggil `lupakanMemo()` — lihat §5 |
| Jam kerja terbaca `1899-12-30` | Jalankan `setupAppEnvironment()`, lalu buka Tempat PKL → edit → isi ulang jamnya |
| Nol depan nomor HP hilang | Data lama perlu diketik ulang sekali; data baru sudah otomatis benar |
| Kamera tidak menyala | Aplikasi menjelaskan penyebabnya di tempat placeholder — izin ditolak, tidak ada kamera, atau kamera dipakai aplikasi lain |
| Penilaian kosong | Pastikan minimal satu kriteria berstatus Aktif |
| Grafik tidak muncul | Chart.js gagal diunduh dari seluruh CDN. Data tetap tersedia dalam bentuk tabel. Catatan: cdnjs **tidak** memuat Chart.js 4.4.4 — alamat itu menjawab 404 berisi HTML dan peramban menolaknya dengan "MIME type ('text/html') is not executable". Urutan CDN karena itu jsdelivr dulu, cdnjs (4.4.1) sebagai cadangan |

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

**Pemuat data.** `memuatInline()` di klien dan `muat()` di server menghasilkan
markup yang sama: cincin berputar dengan keterangan di bawahnya. Kemunculannya
ditunda 180 ms lewat CSS — halaman yang datanya sudah tersinggah tidak pernah
sempat menampilkannya, jadi tidak ada kedipan yang justru terasa lambat. Kotak
kecil seperti kartu KPI tetap memakai kerangka abu-abu `sk()` karena bentuknya
sudah menyerupai isi yang akan datang.

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

function sembunyikanSplash() {
const el = document.getElementById('bootLoader');
if (el) el.hidden = true;
}
function splashMasihTampil() {
const el = document.getElementById('bootLoader');
return !!(el && !el.hidden);
}
function lolosHtml(teks) {
return String(teks == null ? '' : teks)
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── PENJAGA VERSI ASET ─────────────────────────────────────────────────────
//
// Satu kelas kegagalan yang mahal justru karena tidak terlihat seperti
// kegagalan: Kode.gs sudah versi baru, tetapi peramban masih memegang
// app.css / app*.js versi lama dari cache-nya sendiri. Markup baru lalu
// tergambar tanpa aturan gaya dan tanpa fungsi pendampingnya, dan yang dilihat
// pengguna bukan "berkas basi" melainkan "tombol Ekspor hilang" dan "filter
// bulan melebar penuh" — dua gejala yang menuntun ke tempat yang salah.
//
// Karena itu tiap berkas kini membawa capnya sendiri:
//   index.html → window.SIMPKL_VERSI      (acuan; URL-nya tanpa ?v= sehingga
//                                          selalu divalidasi ulang ke server)
//   app*.js    → window.__SIMPKL_EOF      (ditulis blok kode terakhir)
//   app.css    → --versi-aset pada :root
//
// Bila salah satu cap berbeda dari acuan, berkas itulah yang tertinggal. URL
// asetnya sekarang membawa ?v=, jadi satu kali muat ulang sudah cukup untuk
// menariknya. Muat ulang dijaga sessionStorage supaya tidak mungkin berputar:
// bila sesudah sekali muat ulang capnya masih berbeda, penyebabnya ada di
// penyebaran (Vercel belum terbit), bukan di cache — dan pengguna diberi tahu
// apa adanya alih-alih dibiarkan menebak.
function versiCss() {
try {
return String(getComputedStyle(document.documentElement)
.getPropertyValue('--versi-aset') || '').replace(/[^0-9.]/g, '');
} catch (e) { return ''; }
}

/** @return {string} Nama berkas yang tertinggal, atau '' bila semuanya sepadan. */
function versiAsetBasi() {
const acuan = String(window.SIMPKL_VERSI || '');
if (!acuan) return '';
const js = String(window.__SIMPKL_EOF || '');
const css = versiCss();
if (js && js !== acuan) return 'app*.js';
if (css && css !== acuan) return 'app.css';
return '';
}

/** @return {boolean} true bila halaman sedang dimuat ulang dan boot harus berhenti. */
function jagaVersiAset() {
const basi = versiAsetBasi();
if (!basi) {
try { sessionStorage.removeItem('muatUlangAset'); } catch (e) {}
return false;
}
const acuan = String(window.SIMPKL_VERSI || '');
let sudah = '';
try { sudah = sessionStorage.getItem('muatUlangAset') || ''; } catch (e) {}
if (sudah !== acuan) {
try { sessionStorage.setItem('muatUlangAset', acuan); } catch (e) {}
console.warn('Berkas ' + basi + ' masih versi lama. Memuat ulang sekali.');
location.reload();
return true;
}
console.warn('Berkas ' + basi + ' tetap tertinggal sesudah satu kali muat ulang.');
setTimeout(function () {
toast('Berkas ' + basi + ' di perangkat ini masih versi lama. Tutup lalu buka ' +
'kembali tab, atau tekan Ctrl+Shift+R.', 'warning', 9000);
}, 1500);
return false;
}

// Layar galat fatal punya DUA wajah, dan membedakannya penting.
//
// Sebelumnya hanya ada satu: apa pun penyebabnya, pengguna diberi tahu "Blok
// kode termuat 6 dari 6" lalu disuruh memastikan berkas Index/Stylesheet/
// JavaScript tersalin lengkap dan men-deploy ulang Apps Script. Untuk gangguan
// jaringan sesaat, saran itu bukan cuma tidak menolong — ia menuduh berkas yang
// sebenarnya baik-baik saja dan mengirim orang mengerjakan deploy yang percuma.
//
// Kini galat jaringan mendapat layarnya sendiri: penjelasan yang benar, hitung
// mundur percobaan otomatis, dan penyambungan ulang begitu perangkat kembali
// daring.
let PEWAKTU_PULIH = null;
let JEDA_PULIH = 0;
function tampilkanGalatFatal(pesan, jenis) {
sembunyikanSplash();
if (PEWAKTU_PULIH) { clearInterval(PEWAKTU_PULIH); PEWAKTU_PULIH = null; }
try { tampilkanKerangkaAplikasi(false); } catch (e) {}
const wadah = document.getElementById('app-container');
if (!wadah) return;
const aman = lolosHtml(pesan || 'Terjadi kesalahan tak terduga.');

if (jenis === 'jaringan') {
wadah.innerHTML =
'<div class="auth-wrap"><div class="auth-card">' +
'<div class="alert alert-warning" style="margin-bottom:16px">' +
'<span class="mi">cloud_off</span>' +
'<div><strong>Server belum dapat dihubungi</strong><p>' + aman + '</p></div></div>' +
'<div class="info-tonal" style="margin-bottom:16px"><span class="mi">info</span>' +
'<div><div class="info-eyebrow">Yang sedang terjadi</div>' +
'<div class="info-strong">Data Anda aman</div>' +
'<div class="info-sub">Tidak ada yang rusak di aplikasi maupun di database. ' +
'Layanan Google Apps Script hanya belum menjawab — biasanya karena koneksi ' +
'sempat terputus atau layanannya baru bangun setelah lama tidak dipakai.</div>' +
'</div></div>' +
'<p class="field-help" style="margin-bottom:16px" id="hitungPulih">' +
'Mencoba menyambung ulang…</p>' +
'<button class="btn btn-primary btn-block" onclick="cobaSambungUlang()">' +
'<span class="mi">refresh</span> Coba Sekarang</button>' +
'</div></div>';
// Jarak percobaan melebar tiap kali gagal (8 → 15 → 30 → 60 detik) supaya
// perangkat yang benar-benar tanpa sinyal tidak terus-menerus mencoba.
JEDA_PULIH = Math.min(60, JEDA_PULIH ? JEDA_PULIH * 2 : 8);
jadwalkanSambungUlang(JEDA_PULIH);
return;
}
JEDA_PULIH = 0;

const blokTermuat = (typeof window.__blok === 'number') ? window.__blok : 0;
const utuh = blokTermuat === 6;
wadah.innerHTML =
'<div class="auth-wrap"><div class="auth-card">' +
'<div class="alert alert-error" style="margin-bottom:16px">' +
'<span class="mi">error</span>' +
'<div><strong>Aplikasi gagal dimuat</strong><p>' + aman + '</p></div></div>' +
'<div class="info-tonal" style="margin-bottom:16px"><span class="mi">bug_report</span>' +
'<div><div class="info-eyebrow">Diagnosis</div>' +
'<div class="info-strong">Blok kode termuat: ' + blokTermuat + ' dari 6</div>' +
'<div class="info-sub">' + (utuh
? 'Seluruh kode aplikasi termuat dengan baik, jadi berkasnya tidak perlu disalin ulang. ' +
'Galatnya berasal dari sumber lain — detailnya ada di Console browser.'
: 'Blok ke-' + (blokTermuat + 1) + ' gagal diurai. Sebutkan angka ini saat melapor.') +
'</div></div></div>' +
(utuh ? '' :
'<p class="field-help" style="margin-bottom:16px">Pastikan berkas <code>Index</code>, ' +
'<code>Stylesheet</code>, dan <code>JavaScript</code> tersalin lengkap di Apps Script, ' +
'lalu deploy versi baru.</p>') +
'<button class="btn btn-primary btn-block" onclick="cobaSambungUlang()">' +
'<span class="mi">refresh</span> Coba Lagi</button>' +
'</div></div>';
}

function cobaSambungUlang() {
if (PEWAKTU_PULIH) { clearInterval(PEWAKTU_PULIH); PEWAKTU_PULIH = null; }
const tombol = document.querySelector('#app-container .btn-primary');
if (tombol) {
tombol.disabled = true;
tombol.innerHTML = '<span class="spinner spinner-sm"></span> Menyambung…';
}
mulaiAplikasi();
}

/** Hitung mundur percobaan otomatis, supaya pengguna tidak perlu menunggu buta. */
function jadwalkanSambungUlang(detik) {
let sisa = detik;
const gambar = () => {
const label = document.getElementById('hitungPulih');
if (!label) { clearInterval(PEWAKTU_PULIH); PEWAKTU_PULIH = null; return; }
label.textContent = sisa > 0
? 'Mencoba menyambung ulang otomatis dalam ' + sisa + ' detik…'
: 'Menyambung ulang…';
if (sisa <= 0) { clearInterval(PEWAKTU_PULIH); PEWAKTU_PULIH = null; cobaSambungUlang(); }
sisa--;
};
gambar();
PEWAKTU_PULIH = setInterval(gambar, 1000);
}

// Begitu perangkat kembali daring, tidak ada gunanya menunggu hitung mundur.
window.addEventListener('online', () => {
if (document.getElementById('hitungPulih')) cobaSambungUlang();
});

window.addEventListener('error', e => {
// Menyertakan berkas dan baris: tanpa ini, galat dari skrip lintas-asal (Chart.js
// dan SheetJS yang diunduh dari CDN) hanya muncul sebagai "Script error." tanpa
// petunjuk apa pun, dan itulah yang dahulu tampil di layar pengguna.
const asal = e.filename ? ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')' : '';
console.error('Galat tak tertangkap:', e.error || e.message, asal);
if (window.__pulihSedangJalan) return;
if (splashMasihTampil()) {
tampilkanGalatFatal((e.message || 'Terjadi kesalahan tak terduga.') + asal +
' Detail lengkap tersedia di Console browser.');
}
});
window.addEventListener('unhandledrejection', e => {
console.error('Promise gagal tanpa penanganan:', e.reason);
if (window.__pulihSedangJalan) return;
if (!splashMasihTampil()) return;
// Kegagalan menghubungi server bukan kerusakan aplikasi; ia tidak boleh
// menghasilkan layar merah yang menuduh berkas kode.
const sebab = e.reason;
if (sebab && sebab.jenis === 'jaringan') {
tampilkanGalatFatal(sebab.message, 'jaringan');
return;
}
tampilkanGalatFatal((sebab && sebab.message) || 'Gagal menghubungi server.');
});
const Simpanan = (() => {
let memori = {}, tersedia = true;
try { localStorage.setItem('__uji', '1'); localStorage.removeItem('__uji'); }
catch (e) { tersedia = false; }
return {
ambil(k) { try { return tersedia ? localStorage.getItem(k) : (memori[k] || null); }
catch (e) { return memori[k] || null; } },
simpan(k, v) { memori[k] = v; try { if (tersedia) localStorage.setItem(k, v); } catch (e) {} },
hapus(k) { delete memori[k]; try { if (tersedia) localStorage.removeItem(k); } catch (e) {} }
};
})();
const AppState = {
sessionToken: null, user: null, config: {}, periode: null, penempatan: null,
halamanAktif: null, grafik: {},
posisi: null, watchId: null, streamKamera: null, fotoTerambil: null,
jenisPresensi: 'Masuk', modeFilter: 'bulanan',
dataTabel: [], filterPendaftaran: 'Diproses', timerJam: null,
tabel: {},
imporSiap: null,
cmdkTimer: null, cmdkIndex: -1, cmdkHasil: []
};
let MENU = {};
let JUDUL_HALAMAN = {};
const $  = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function esc(v) {
if (v === null || v === undefined) return '';
return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function toast(pesan, tipe = 'info', durasi = 4200) {
const ikon = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' }[tipe] || 'info';
const el = document.createElement('div');
el.className = 'toast ' + tipe;
el.setAttribute('role', tipe === 'error' ? 'alert' : 'status');
el.innerHTML = `<span class="mi">${ikon}</span><div>${esc(pesan)}</div>`;
$('toastArea').appendChild(el);
setTimeout(() => {
el.style.opacity = '0'; el.style.transition = 'opacity .2s';
setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
}, durasi);
}
function tampilkanSibuk(teks) { $('busyText').textContent = teks || 'Memproses…'; $('busyOverlay').hidden = false; }
function sembunyikanSibuk() { $('busyOverlay').hidden = true; }
function bukaModal(judul, isiHtml, tombol) {
$('modalTitle').textContent = judul;
$('modalBody').innerHTML = isiHtml;
const foot = $('modalFoot');
foot.innerHTML = '';
(tombol || []).forEach((t, i) => {
const b = document.createElement('button');
b.className = 'btn ' + (t.kelas || 'btn-outline');
b.innerHTML = t.label;
b.onclick = t.aksi || tutupModal;
b.id = 'modalBtn' + i;
foot.appendChild(b);
});
$('modal').classList.toggle('modal-konfirm', String(isiHtml).indexOf('class="konfirm"') >= 0);
$('modal').hidden = false;
document.body.style.overflow = 'hidden';
}
function tutupModal() {
$('modal').hidden = true;
$('modal').classList.remove('modal-konfirm');
$('modalBody').innerHTML = '';
document.body.style.overflow = '';
}
function konfirmasi(judul, pesan, labelYa = 'Ya, lanjutkan', kelasYa = 'btn-danger') {
const bahaya = kelasYa === 'btn-danger';
return new Promise(resolve => {
bukaModal(judul, `<div class="konfirm">
<span class="konfirm-ikon ${bahaya ? 'bahaya' : ''}">
<span class="mi">${bahaya ? 'warning' : 'help'}</span></span>
<p class="konfirm-teks">${esc(pesan)}</p>
</div>`, [
{ label: 'Batal', kelas: 'btn-outline', aksi: () => { tutupModal(); resolve(false); } },
{ label: labelYa, kelas: kelasYa,       aksi: () => { tutupModal(); resolve(true); } }
]);
});
}
function bukaPratinjau(judul, url, unduhUrl, tipe = 'gambar') {
$('previewTitle').textContent = judul;
$('previewBody').innerHTML = (tipe === 'gambar')
? `<img src="${esc(url)}" alt="${esc(judul)}" loading="lazy">`
: `<iframe src="${esc(url)}" title="${esc(judul)}" loading="lazy"></iframe>`;
const btn = $('btnUnduhPratinjau');
if (unduhUrl) { btn.href = unduhUrl; btn.hidden = false; } else { btn.hidden = true; }
$('modalPreview').hidden = false;
document.body.style.overflow = 'hidden';
}
function tutupPratinjau() {
$('modalPreview').hidden = true;
$('previewBody').innerHTML = '';
document.body.style.overflow = '';
}
function memuatInline(pesan, kecil) {
// Kemunculannya ditunda 180 ms lewat CSS. Bila data datang dari singgahan,
// pemuat ini tidak pernah sempat terlihat — tidak ada kedipan.
return `<div class="muat-inline${kecil ? ' muat-inline-kecil' : ''}" role="status" aria-live="polite">
<span class="muat-cincin" aria-hidden="true"></span>
<p class="muat-teks">${esc(pesan || 'Mengambil data…')}</p></div>`;
}
function emptyState(ikon, judul, deskripsi, tombolHtml) {
return `<div class="empty">
<span class="mi">${ikon}</span>
<p class="empty-title">${esc(judul)}</p>
${deskripsi ? `<p class="empty-desc">${esc(deskripsi)}</p>` : ''}
${tombolHtml || ''}
</div>`;
}
function chipStatus(status) {
const peta = {
'Hadir': ['chip-success', 'check_circle'], 'Disetujui': ['chip-success', 'check_circle'],
'Diterima': ['chip-success', 'check_circle'], 'Terbit': ['chip-success', 'verified'],
'Aktif': ['chip-success', 'check_circle'], 'Ya': ['chip-success', 'check_circle'],
'Telat': ['chip-warning', 'schedule'], 'Menunggu': ['chip-warning', 'hourglass_top'],
'Diproses': ['chip-warning', 'hourglass_top'],
'Di Luar Radius': ['chip-error', 'location_off'], 'Ditolak': ['chip-error', 'cancel'],
'Belum Presensi': ['chip-error', 'error'],
'Dibatalkan': ['chip-neutral', 'block'], 'Belum Ada': ['chip-neutral', 'remove'],
'Izin': ['chip-info', 'event_busy'], 'Sakit': ['chip-info', 'sick'],
'Alpha': ['chip-error', 'person_off'], 'Libur': ['chip-neutral', 'weekend'],
'Izin (Menunggu)': ['chip-warning', 'hourglass_top'], 'Sakit (Menunggu)': ['chip-warning', 'hourglass_top'],
'Tidak': ['chip-neutral', 'block'], 'Nonaktif': ['chip-neutral', 'block']
};
const [kelas, ikon] = peta[status] || ['chip-neutral', 'info'];
return `<span class="chip ${kelas}"><span class="mi">${ikon}</span>${esc(status)}</span>`;
}
function tglSingkat(iso) {
// Logikanya sengaja sama persis dengan kembarannya di Kode.gs — teks
// yyyy-mm-dd diurai apa adanya, bukan lewat new Date(), agar zona waktu tidak
// menggeser harinya. Mengiris 10 huruf pertama membuat nilai bertimestamp
// penuh (mis. 2026-01-05T00:00:00.000Z, yang kadang datang dari sel Sheets
// bertipe tanggal) ikut terbaca, bukan tampil mentah.
if (!iso) return '-';
const teks = String(iso).slice(0, 10);
const bagian = teks.split('-');
if (bagian.length !== 3) return esc(String(iso));
const th = Number(bagian[0]), bl = Number(bagian[1]), tg = Number(bagian[2]);
if (!th || !bl || !tg || bl < 1 || bl > 12) return esc(String(iso));
const h = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const d = new Date(Date.UTC(th, bl - 1, tg));
return `${h[d.getUTCDay()]}, ${tg} ${b[bl - 1]} ${th}`;
}
function jamTampil(nilai) {
const s = String(nilai == null ? '' : nilai).trim();
if (!s) return '-';
const m = s.match(/([0-9]{1,2}):([0-9]{2})/);
return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : s;
}
function panggilCepat(namaFungsi, ...args) {
const kunci = SinggahData.kunci(namaFungsi, args);
const awal = AppState.dataAwal;
if (awal && Object.prototype.hasOwnProperty.call(awal, namaFungsi)) {
const hasil = awal[namaFungsi];
delete awal[namaFungsi];
SinggahData.simpan(kunci, hasil);
return Promise.resolve(hasil);
}
// Sudah pernah dibuka: gambar seketika dari singgahan, lalu periksa diam-diam.
const singgahan = SinggahData.ambil(kunci);
if (singgahan) {
// Gambar ulang tepat setelah penyegaran tidak perlu memeriksa server lagi:
// datanya baru saja diambil. Penandanya sekali pakai, jadi kunjungan
// berikutnya tetap memeriksa seperti biasa.
if (singgahan.barusanSegar) singgahan.barusanSegar = false;
else segarkanDiLatar(kunci, namaFungsi, args);
return Promise.resolve(singgahan.data);
}
return panggil(namaFungsi, ...args).then(hasil => { SinggahData.simpan(kunci, hasil); return hasil; });
}
let SIBUK_JUMLAH = 0;
function mulaiSibukGlobal() {
SIBUK_JUMLAH++;
const bar = document.getElementById('progresGlobal');
if (bar) bar.classList.add('jalan');
}
function selesaiSibukGlobal() {
SIBUK_JUMLAH = Math.max(0, SIBUK_JUMLAH - 1);
if (SIBUK_JUMLAH > 0) return;
const bar = document.getElementById('progresGlobal');
if (!bar) return;
bar.classList.add('tuntas');
setTimeout(() => { bar.classList.remove('jalan', 'tuntas'); }, 260);
}
// ── LAPISAN TRANSPORT ──────────────────────────────────────────────────────
//
// Endpoint Apps Script /exec sesekali gagal menjawab: instansnya dingin setelah
// lama menganggur, Google membalas 5xx sesaat, atau koneksi HTTP yang menganggur
// sejak layar terkunci sudah mati sehingga permintaan pertama tumbang dengan
// net::ERR_FAILED. Saat itu terjadi, yang kembali ke browser BUKAN jawaban
// ContentService kita melainkan halaman Google sendiri — tanpa header
// Access-Control-Allow-Origin — sehingga Chrome menampilkannya sebagai galat
// CORS. Pesannya menyesatkan: setelan CORS aplikasi ini tidak pernah salah,
// permintaannya saja yang tidak sampai ke doPost().
//
// Gangguan seperti itu sembuh sendiri dalam hitungan ratusan milidetik. Yang
// dahulu membuatnya terasa fatal adalah kita hanya mencoba SEKALI. Sekarang
// percobaan diulang beberapa kali dengan jeda menanjak — cukup untuk memaksa
// browser membuka koneksi baru — dan setiap permintaan diberi batas waktu agar
// tidak pernah menggantung selamanya.
const GALAT_JARINGAN = 'jaringan';
const GALAT_LAMBAT = 'lambat';

// Batas waktu 25 detik ternyata terlalu galak untuk Apps Script.
//
// Merakit kerangka belasan halaman atau menarik data seluruh menu memang bisa
// memakan lebih dari itu pada instans yang baru bangun. Yang terjadi kemudian
// bukan sekadar satu permintaan gagal: permintaan itu DIBATALKAN, diulang, dan
// setiap pengulangan menjalankan ulang seluruh pekerjaan server dari nol.
// Karena Apps Script mengantrekan eksekusi milik pengguna yang sama, antreannya
// justru makin panjang — permintaan yang sebenarnya akan selesai di detik ke-30
// tidak pernah punya kesempatan. Itulah pemutar yang berputar selamanya.
//
// Dua koreksi: batasnya dinaikkan dan dibedakan menurut beratnya pekerjaan, dan
// kehabisan waktu TIDAK LAGI diulang. Kehabisan waktu berarti server masih
// bekerja; mengirim permintaan kedua hanya menambah beban yang justru menjadi
// sebab kegagalannya.
const BATAS_WAKTU_MS = 45000;
const BATAS_WAKTU_BERAT_MS = 100000;
const FUNGSI_BERAT = ['semuaHalamanHtml', 'paketDataAwal', 'masukKilat', 'masukLengkap',
  'pulihKilat', 'imporMasterMassal', 'terbitkanSertifikatMassal', 'imporSiswaMassal'];
const JEDA_ULANG = [400, 1200, 2600];

/** Menandai galat yang berasal dari transport, bukan dari logika aplikasi. */
function galatJaringan(pesan) {
  const e = new Error(pesan || 'Tidak dapat menghubungi server.');
  e.jenis = GALAT_JARINGAN;
  return e;
}
/** Server masih bekerja, hanya belum selesai. Tidak boleh diulang. */
function galatLambat(pesan) {
  const e = new Error(pesan);
  e.jenis = GALAT_LAMBAT;
  return e;
}
function iniGalatJaringan(e) { return !!(e && (e.jenis === GALAT_JARINGAN || e.jenis === GALAT_LAMBAT)); }
function bolehDiulang(e) { return !!(e && e.jenis === GALAT_JARINGAN); }

// Mengulang permintaan hanya aman bila permintaannya tidak mengubah data:
// percobaan kedua atas "simpanPresensi" bisa menghasilkan dua baris presensi
// bila yang gagal ternyata hanya jawabannya. Maka pengulangan otomatis dibatasi
// pada pembacaan — sisanya tetap dilaporkan ke pengguna untuk diulang manual.
const AWALAN_AMAN_ULANG = ['get', 'cari', 'periksa', 'html', 'hitung', 'rekap',
  'daftar', 'statistik', 'semua', 'opsi'];
// Masuk boleh diulang: yang dilakukannya hanya membaca akun lalu membuat sesi
// baru. Percobaan kedua paling banter menyisakan satu token yang tidak terpakai
// dan kedaluwarsa sendiri — jauh lebih ringan daripada memaksa pengguna
// mengetik ulang password karena satu paket hilang di jalan.
// pulihKilat hanya membaca — ia tidak membuat sesi baru sekali pun — jadi
// mengulangnya sepenuhnya aman, sementara gagal di percobaan pertama berarti
// pengguna terlempar ke form login padahal sesinya masih sah.
const AMAN_ULANG_KHUSUS = ['doLogin', 'masukKilat', 'masukLengkap', 'doLoginGoogle',
  'pulihKilat'];
function amanDiulang(namaFungsi) {
  const n = String(namaFungsi || '');
  if (AMAN_ULANG_KHUSUS.indexOf(n) !== -1) return true;
  return AWALAN_AMAN_ULANG.some(a => n.indexOf(a) === 0);
}

// ── JALUR CADANGAN LEWAT PROXY VERCEL ──────────────────────────────────────
//
// `api/gas.js` sudah lama ada di repo tetapi menganggur: ia meneruskan
// permintaan ke Apps Script dari sisi server, sehingga browser hanya berbicara
// dengan domain aplikasinya sendiri dan CORS tidak berlaku sama sekali.
// Sampai sekarang ia harus diaktifkan manual dengan menyunting index.html —
// artinya baru menolong bila ada yang sempat menyunting dan men-deploy saat
// gangguan sedang berlangsung, yang praktis tidak pernah terjadi.
//
// Sekarang perpindahannya otomatis: setelah seluruh percobaan langsung habis,
// satu percobaan terakhir dikirim lewat proxy. Bila berhasil, seluruh sesi
// memakai jalur itu, lalu kembali ke jalur langsung yang lebih cepat setengah
// jam kemudian.
const ALAMAT_PROXY = '/api/gas';
const UMUR_PROXY_MS = 30 * 60 * 1000;

function proxySedangDipakai() {
  const sampai = Number(Simpanan.ambil('proxySampai') || 0);
  if (!sampai) return false;
  if (Date.now() > sampai) { Simpanan.hapus('proxySampai'); return false; }
  return true;
}
function aktifkanProxy() {
  Simpanan.simpan('proxySampai', String(Date.now() + UMUR_PROXY_MS));
  console.warn('Beralih ke jalur cadangan ' + ALAMAT_PROXY + ' untuk sementara.');
}
/** Proxy hanya masuk akal bila halaman disajikan Vercel, bukan dari /exec. */
function proxyTersedia() {
  return String(window.SIMPKL_API || '').indexOf('http') === 0 &&
    location.protocol.indexOf('http') === 0;
}

// Permintaan kembar yang sedang berjalan digabung menjadi satu.
//
// Halaman yang menggambar ulang, penyegaran senyap, dan pramuat bisa meminta
// pembacaan yang sama nyaris bersamaan. Setiap permintaan berarti satu eksekusi
// Apps Script, dan eksekusi milik pengguna yang sama diantre — jadi permintaan
// kembar bukan hanya mubazir, ia memperlambat permintaan yang sedang ditunggu.
// Hanya pembacaan yang digabung; penulisan tidak pernah, karena dua penekanan
// tombol Simpan memang dua kehendak yang berbeda.
const SEDANG_TERBANG = {};
let NOMOR_PERMINTAAN = 0;
function kunciTerbang(namaFungsi, args) {
  try { return namaFungsi + '|' + JSON.stringify((args || []).slice(1)); }
  catch (e) { return ''; }
}

// ── PENGGABUNG PERMINTAAN ──────────────────────────────────────────────────
//
// Pembacaan yang berangkat dalam hentakan yang sama disatukan menjadi SATU
// perjalanan lewat panggilBanyak(). Contoh nyatanya adalah modal detail siswa:
// ia meminta riwayat penempatan dan riwayat presensi berturut-turut tanpa jeda,
// dan dua permintaan yang berangkat bersamaan itulah yang saling merebut kunci
// pengalihan Apps Script sampai salah satunya menerima 404.
//
// Menyatukannya bukan sekadar menghindari tabrakan: di sisi server, sheet yang
// sama hanya dibaca sekali berkat memo per eksekusi, jadi paket berisi tiga
// pembacaan hampir selalu lebih cepat daripada tiga perjalanan terpisah.
const JEDA_KUMPUL_MS = 8;
let ANTREAN_PAKET = [];
let PEWAKTU_PAKET = null;
// Klien baru bisa saja berpasangan dengan Kode.gs versi lama yang belum mengenal
// panggilBanyak — misalnya ketika Vercel sudah ter-deploy tetapi Apps Script
// belum dibuatkan versi barunya. Begitu terdeteksi, penggabungan dimatikan untuk
// seterusnya dan aplikasi berjalan seperti sebelumnya, bukan berhenti bekerja.
let PAKET_DIDUKUNG = true;

/** Hanya pembacaan milik sesi ini yang boleh dipaketkan. */
function bolehDipaketkan(namaFungsi, args, opsi) {
  if (!PAKET_DIDUKUNG) return false;
  if (opsi && opsi.tanpaPaket) return false;
  if (namaFungsi === 'panggilBanyak') return false;
  if (FUNGSI_BERAT.indexOf(namaFungsi) !== -1) return false;
  if (AMAN_ULANG_KHUSUS.indexOf(namaFungsi) !== -1) return false;   // fungsi masuk
  if (!AWALAN_AMAN_ULANG.some(a => namaFungsi.indexOf(a) === 0)) return false;
  // Argumen pertama wajib token sesi yang sedang berlaku: itulah yang membuat
  // paketnya sah di server, sekaligus menyaring panggilan berbentuk lain
  // seperti getPageContent(namaHalaman, …).
  return !!AppState.sessionToken && args && args[0] === AppState.sessionToken;
}

function jadwalkanPaket(namaFungsi, args) {
  return new Promise((selesai, gagal) => {
    ANTREAN_PAKET.push({ fn: namaFungsi, args: args, selesai: selesai, gagal: gagal });
    if (PEWAKTU_PAKET) return;
    PEWAKTU_PAKET = setTimeout(kirimPaket, JEDA_KUMPUL_MS);
  });
}

function kirimPaket() {
  PEWAKTU_PAKET = null;
  const isi = ANTREAN_PAKET;
  ANTREAN_PAKET = [];
  if (!isi.length) return;

  // Sendirian? Tidak ada gunanya dibungkus.
  if (isi.length === 1) {
    kirimSatu(isi[0].fn, isi[0].args, { tanpaPaket: true }).then(isi[0].selesai, isi[0].gagal);
    return;
  }
  const satuPerSatu = () => isi.forEach(b =>
    kirimSatu(b.fn, b.args, { tanpaPaket: true }).then(b.selesai, b.gagal));

  const daftar = isi.map(b => ({ fn: b.fn, args: b.args }));
  kirimSatu('panggilBanyak', [AppState.sessionToken, daftar], { tanpaPaket: true })
    .then(jawab => {
      const bagian = (jawab && jawab.success && Array.isArray(jawab.data)) ? jawab.data : null;
      if (!bagian || bagian.length !== isi.length) {
        PAKET_DIDUKUNG = false;
        console.warn('Server belum mengenal panggilBanyak — penggabungan permintaan dimatikan.');
        satuPerSatu();
        return;
      }
      isi.forEach((b, i) => {
        const satu = bagian[i];
        if (satu && satu.__galat) b.gagal(new Error(satu.__galat));
        else b.selesai(satu ? satu.hasil : null);
      });
    })
    .catch(err => {
      // Gangguan transport memang milik bersama: setiap penunggu menerima galat
      // yang sama lengkap dengan penandanya. Tetapi penolakan dari SERVER —
      // "Fungsi panggilBanyak tidak tersedia" pada penerapan lama — bukan
      // kegagalan permintaan aslinya, jadi permintaannya dikirim ulang sendiri.
      if (iniGalatJaringan(err)) { isi.forEach(b => b.gagal(err)); return; }
      PAKET_DIDUKUNG = false;
      console.warn('Paket permintaan ditolak server (' + err.message +
        '). Penggabungan dimatikan, permintaan dikirim satu per satu.');
      satuPerSatu();
    });
}

/**
 * Satu-satunya pintu keluar aplikasi ke server. panggil() dan panggilDiam()
 * sama-sama memakainya supaya keduanya tidak pernah lagi berbeda perilaku.
 */
function kirimKeServer(namaFungsi, args, opsi) {
  opsi = opsi || {};
  if (!window.SIMPKL_API) {
    return Promise.reject(new Error('Alamat API belum disetel. Periksa window.SIMPKL_API di index.html.'));
  }
  const kunciGabung = amanDiulang(namaFungsi) ? kunciTerbang(namaFungsi, args) : '';
  if (kunciGabung && SEDANG_TERBANG[kunciGabung]) return SEDANG_TERBANG[kunciGabung];

  const perjalanan = bolehDipaketkan(namaFungsi, args, opsi)
    ? jadwalkanPaket(namaFungsi, args)
    : kirimSatu(namaFungsi, args, opsi);

  if (!kunciGabung) return perjalanan;
  SEDANG_TERBANG[kunciGabung] = perjalanan;
  const lepas = () => { delete SEDANG_TERBANG[kunciGabung]; };
  perjalanan.then(lepas, lepas);
  return perjalanan;
}

/** Satu permintaan, satu perjalanan — lengkap dengan batas waktu dan pengulangan. */
function kirimSatu(namaFungsi, args, opsi) {
  opsi = opsi || {};
  const batasUlang = opsi.ulang === false ? 0
    : (amanDiulang(namaFungsi) || namaFungsi === 'panggilBanyak' ? JEDA_ULANG.length : 0);

  const sekali = (alamat) => {
    // AbortController tidak ada di peramban yang sangat tua; di sana kita cukup
    // berjalan tanpa batas waktu ketimbang gagal sama sekali.
    let pembatal = null, pewaktu = null;
    try { pembatal = new AbortController(); } catch (e) { pembatal = null; }
    const batas = FUNGSI_BERAT.indexOf(namaFungsi) !== -1 ? BATAS_WAKTU_BERAT_MS : BATAS_WAKTU_MS;
    if (pembatal) pewaktu = setTimeout(() => { try { pembatal.abort(); } catch (e) {} }, batas);
    const bersihkan = () => { if (pewaktu) clearTimeout(pewaktu); };

    // ALAMAT DIBUAT UNIK SETIAP KALI. Ini bukan kerapian, ini perbaikan bug.
    //
    // /exec tidak menjawab POST secara langsung: ia membalas 302 ke
    // script.googleusercontent.com/macros/echo?user_content_key=…, dan kunci itu
    // SEKALI PAKAI. Peramban boleh menyinggah pengalihan, dan ketika dua
    // permintaan berangkat nyaris bersamaan ke alamat yang sama persis, keduanya
    // dapat mengikuti pengalihan tersinggah yang sama — yang satu memakai
    // kuncinya, yang lain menerima 404 untuk kunci yang sudah hangus.
    //
    // Itu persis yang terlihat di lapangan: getRiwayatPresensi dan
    // getRiwayatPenempatan gagal 404 pada satu user_content_key yang sama, lalu
    // percobaan ulangnya menabrak CORS karena Google menjawab dengan halaman
    // galatnya sendiri. Dengan penanda unik, tidak ada dua permintaan yang
    // beralamat sama, jadi tidak ada pengalihan yang bisa dipakai berdua.
    const unik = alamat + (alamat.indexOf('?') >= 0 ? '&' : '?') +
      '_p=' + (++NOMOR_PERMINTAAN) + Date.now().toString(36);

    const permintaan = {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: namaFungsi, args: args })
    };
    if (pembatal) permintaan.signal = pembatal.signal;

    return fetch(unik, permintaan).then(r => {
      bersihkan();
      // 5xx dan 429 adalah gangguan sesaat di sisi Google.
      //
      // 404 dan 403 juga — dan ini berlawanan dengan naluri. Apps Script tidak
      // menjawab POST secara langsung: /exec membalas 302 ke
      // script.googleusercontent.com/macros/echo?user_content_key=…, dan kunci
      // itu berumur pendek serta sekali pakai. Bila lompatan kedua itu telat
      // ditempuh — jaringan seluler yang lambat, atau proxy operator yang
      // mengulang permintaan — Google menjawab 404 untuk kunci yang sudah tidak
      // berlaku, bukan karena penerapannya hilang. Gejalanya persis seperti yang
      // dilaporkan: satu panel gagal dengan "Server menjawab kode 404" sementara
      // seluruh halaman lain di menu yang sama baik-baik saja.
      //
      // Penerapan yang benar-benar salah alamat akan gagal juga setelah semua
      // percobaan habis — hanya empat detik lebih lambat, dengan pesan yang
      // sudah menjelaskan bahwa alamatnya yang perlu diperiksa.
      if (!r.ok) {
        const e = new Error(r.status === 404
          ? 'Alamat layanan tidak menjawab (404).'
          : 'Server menjawab kode ' + r.status + '.');
        if (r.status >= 500 || r.status === 429 || r.status === 404 || r.status === 403) {
          e.jenis = GALAT_JARINGAN;
        }
        throw e;
      }
      return r.text().then(teks => {
        // Bila Google menyisipkan halaman HTML-nya sendiri, JSON.parse akan
        // gagal. Itu gangguan transport, bukan jawaban aplikasi.
        try { return JSON.parse(teks); }
        catch (x) { throw galatJaringan('Server membalas dengan jawaban yang tidak utuh.'); }
      });
    }, err => {
      bersihkan();
      // fetch() hanya menolak untuk kegagalan transport: CORS, DNS, koneksi
      // putus, atau batas waktu kita sendiri.
      if (err && err.name === 'AbortError') {
        throw galatLambat('Server belum selesai dalam ' + Math.round(batas / 1000) +
          ' detik. Permintaan dihentikan agar tidak menambah beban.');
      }
      throw galatJaringan(navigator.onLine === false
        ? 'Perangkat sedang tidak terhubung ke internet.'
        : 'Tidak dapat menghubungi server.');
    });
  };

  const alamatUtama = proxySedangDipakai() && proxyTersedia() ? ALAMAT_PROXY : window.SIMPKL_API;

  const coba = (sisa, keTampil) => sekali(alamatUtama).catch(err => {
    if (sisa <= 0 || !bolehDiulang(err)) throw err;
    const jeda = JEDA_ULANG[keTampil] + Math.floor(Math.random() * 250);
    console.warn('Permintaan "' + namaFungsi + '" gagal (' + err.message +
      '). Mencoba lagi dalam ' + jeda + ' ms.');
    return new Promise(r => setTimeout(r, jeda)).then(() => coba(sisa - 1, keTampil + 1));
  });

  return coba(batasUlang, 0)
    .catch(err => {
      // Pengalihan ke proxy hanya untuk pembacaan, dengan alasan yang sama
      // seperti pengulangan: penyimpanan data yang gagal di tengah jalan bisa
      // saja sudah tercatat di spreadsheet, dan mengirimnya lagi lewat jalur
      // lain berisiko menggandakannya.
      if (!bolehDiulang(err) || batasUlang === 0) throw err;
      if (alamatUtama === ALAMAT_PROXY || !proxyTersedia()) throw err;
      return sekali(ALAMAT_PROXY).then(paket => { aktifkanProxy(); return paket; }, () => { throw err; });
    })
    .then(paket => {
      JEDA_PULIH = 0;                 // koneksi terbukti hidup, jarak percobaan disetel ulang
      if (paket && paket.__galat) throw new Error(paket.__galat);
      return paket ? paket.hasil : null;
    });
}

function panggil(namaFungsi, ...args) {
const diam = (namaFungsi === 'getPageContent' && args[1] && args[1].__pramuat);
if (!diam) mulaiSibukGlobal();
const tuntas = () => { if (!diam) selesaiSibukGlobal(); };
return kirimKeServer(namaFungsi, args).then(
  hasil => { tuntas(); return hasil; },
  err => { tuntas(); throw err; }
);
}
const SLASH2 = '/' + '/';
const HTTPS = 'https:' + SLASH2;
const CDN = {
// Urutannya sengaja: jsdelivr lebih dulu karena alamat inilah yang terbukti ada.
// cdnjs TIDAK memuat Chart.js 4.4.4 — alamat lamanya menjawab 404 berisi halaman
// HTML, dan peramban menolaknya dengan "MIME type ('text/html') is not
// executable". Grafik tetap muncul karena cadangannya bekerja, tetapi setiap
// pemuatan membuang satu perjalanan dan menaburkan galat merah di Console yang
// menyesatkan saat menelusuri masalah lain. Alamat cdnjs diturunkan ke 4.4.1,
// versi terakhir yang benar-benar tersedia di sana.
chart: [
HTTPS + 'cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
HTTPS + 'cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
HTTPS + 'unpkg.com/chart.js@4.4.4/dist/chart.umd.min.js'
],
sheetjs: [
HTTPS + 'cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
HTTPS + 'cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
HTTPS + 'unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
]
};
const StatusSkrip = {};
function muatSkripEksternal(nama, daftarUrl, sudahSiap) {
if (sudahSiap()) return Promise.resolve(true);
if (StatusSkrip[nama]) return StatusSkrip[nama];
StatusSkrip[nama] = new Promise(function (resolve) {
let indeks = 0;
const coba = function () {
if (indeks >= daftarUrl.length) {
console.warn('Semua CDN gagal untuk pustaka: ' + nama);
resolve(false);
return;
}
const url = daftarUrl[indeks++];
const el = document.createElement('script');
el.src = url;
el.async = true;
// Tanpa ini, galat apa pun di dalam pustaka CDN dilaporkan peramban sebagai
// "Script error." tanpa berkas, baris, maupun pesan aslinya.
el.crossOrigin = 'anonymous';
let tuntas = false;
const selesai = function (berhasil) {
if (tuntas) return;
tuntas = true;
clearTimeout(pewaktu);
if (berhasil && sudahSiap()) resolve(true);
else coba();
};
const pewaktu = setTimeout(function () { selesai(false); }, 12000);
el.onload = function () { selesai(true); };
el.onerror = function () { selesai(false); };
document.head.appendChild(el);
};
coba();
});
return StatusSkrip[nama];
}
function pastikanChart() {
return muatSkripEksternal('chart', CDN.chart, function () { return typeof Chart !== 'undefined'; });
}
function pastikanSheetJS() {
return muatSkripEksternal('sheetjs', CDN.sheetjs, function () { return typeof XLSX !== 'undefined'; });
}
function grafikTidakTersedia(canvas) {
const kotak = canvas && canvas.parentElement;
if (!kotak) return;
kotak.innerHTML = emptyState('signal_wifi_off', 'Grafik tidak dapat dimuat',
'Pustaka grafik gagal diunduh. Data tetap tersedia dalam bentuk tabel di bawah.');
}
function hancurkanGrafik() {
Object.keys(AppState.grafik).forEach(k => { try { AppState.grafik[k].destroy(); } catch (e) {} });
AppState.grafik = {};
}

// ── REGISTRI PELUKIS GRAFIK ────────────────────────────────────────────────
//
// Warna grafik ikut tema, dan Chart.js menyimpan warna di dalam konfigurasi
// masing-masing dataset — tidak ada cara memutakhirkannya selain menggambar
// ulang. Yang tidak perlu adalah mengambil ulang DATANYA.
//
// Setiap fungsi penggambar mendaftarkan dirinya beserta data yang dipakainya.
// Saat tema berganti, data itu dipakai lagi apa adanya. Nol perjalanan server,
// dan grafik berganti warna dalam satu bingkai.
const PELUKIS_GRAFIK = {};
function catatGrafik(nama, pelukis, data) {
  PELUKIS_GRAFIK[nama] = { pelukis: pelukis, data: data };
}
function lupakanPelukisGrafik() {
  Object.keys(PELUKIS_GRAFIK).forEach(k => { delete PELUKIS_GRAFIK[k]; });
}
function gambarUlangSemuaGrafik() {
  const nama = Object.keys(PELUKIS_GRAFIK);
  if (!nama.length) return;
  hancurkanGrafik();
  nama.forEach(k => {
    const g = PELUKIS_GRAFIK[k];
    try { g.pelukis(g.data); } catch (e) { console.warn('Grafik "' + k + '" gagal digambar ulang:', e); }
  });
}
// Palet grafik — lembut, tetapi setiap pasangan warnanya sudah diukur, bukan dikira.
//
// Warna pastel gampang terlihat manis lalu gagal dipakai: dua status yang mirip
// jadi tidak terbedakan, dan bar terang hilang di atas kartu putih. Palet ini
// karena itu diuji terhadap lima gerbang: pita terang, ambang kroma (agar tidak
// terbaca abu), keterpisahan bagi mata buta warna, ambang mata normal, dan
// kontras terhadap permukaan kartu. Diuji untuk SELURUH pasangan, bukan hanya
// yang bersebelahan, karena potongan donat bisa bertetangga dalam urutan apa pun.
//
// Pasangan tersulit selalu Hadir(hijau) lawan Alpha(merah) — kebingungan merah-hijau
// yang dialami sekitar 8% laki-laki — dan Izin(biru) lawan Sakit(violet). Keduanya
// dipisahkan bukan dengan menggeser rona, melainkan dengan memberi jarak TERANG:
// biru sengaja gelap, violet sengaja terang. Itu sebabnya nilainya tampak tidak
// beraturan bila hanya dilihat sebagai daftar hex.
//
// Hasil ukur: mode terang ΔE buta warna 10,0 dan mata normal 16,2 (ambang 8 dan 15);
// mode gelap 8,2 dan 15,3. Seluruh warna ≥3:1 terhadap permukaannya.
// Mode gelap DIPILIH ULANG untuk permukaan gelap, bukan hasil pembalikan otomatis.
function warnaGrafik() {
const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
return {
sukses:  gelap ? '#49A97E' : '#4CA37D',  // Hadir
warning: gelap ? '#BC8B33' : '#C2891A',  // Telat
primary: gelap ? '#3273AE' : '#2F6DA8',  // Izin
ungu:    gelap ? '#9E7ED2' : '#A87FD9',  // Sakit
error:   gelap ? '#B0414F' : '#B0353F',  // Alpha
// Bukan bagian palet kategori: "Belum Presensi" berarti belum ada datanya,
// jadi sengaja netral supaya tidak ikut bersaing dengan status yang sebenarnya.
netral:  gelap ? '#48545A' : '#B6C2C9',
permukaan: gelap ? '#171D20' : '#FFFFFF',
grid:    gelap ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
teks:    gelap ? '#BFC8CE' : '#3F484D'
};
}
function buatTabel(cfg) {
const st = AppState.tabel[cfg.id] || {};
AppState.tabel[cfg.id] = {
cfg: cfg,
data: cfg.data || [],
cari: st.cfg && st.cfg.id === cfg.id ? (st.cari || '') : '',
sortKey: st.cfg && st.cfg.id === cfg.id ? st.sortKey : (cfg.sortAwal || null),
sortDir: st.cfg && st.cfg.id === cfg.id ? (st.sortDir || 'asc') : 'asc',
// Memuat ulang tabel yang sama tidak melempar pengguna kembali ke halaman
// pertama — baik saat penyegaran diam-diam maupun setelah menyimpan data.
// Perubahan pencarian, penyaringan, dan jumlah entri tetap kembali ke awal,
// sebab ketiganya menyetel st.halaman sendiri.
halaman: st.cfg && st.cfg.id === cfg.id ? (st.halaman || 1) : 1,
perHal: st.cfg && st.cfg.id === cfg.id ? (st.perHal || 25) : 25,
filterNilai: st.cfg && st.cfg.id === cfg.id ? (st.filterNilai || {}) : {},
terpilih: {}
};
AppState.prefixTabel = AppState.prefixTabel || {};
if (cfg.idPrefix) AppState.prefixTabel[cfg.idPrefix] = cfg.id;
pasangToolbarTabel(cfg);
pasangFilterTabel(cfg.id);
if (cfg.idPrefix) {
const kotakEkspor = $(cfg.idPrefix + 'EksporWrap');
if (kotakEkspor) kotakEkspor.hidden = (cfg.ekspor === false);
}
renderTabel(cfg.id);
}
function pasangToolbarTabel(cfg) {
if (!cfg.idPrefix) return;
const cari = $(cfg.idPrefix + 'Cari');
const perHal = $(cfg.idPrefix + 'PerHal');
const st = AppState.tabel[cfg.id];
if (cari) {
cari.value = st.cari || '';
cari.oninput = () => {
st.cari = cari.value;
st.halaman = 1;
renderTabel(cfg.id);
};
}
if (perHal) {
perHal.value = String(st.perHal);
perHal.onchange = () => {
st.perHal = Number(perHal.value) || 0;
st.halaman = 1;
renderTabel(cfg.id);
};
}
}
function dataTerproses(id) {
const st = AppState.tabel[id];
const cfg = st.cfg;
let data = st.data.slice();
const q = String(st.cari || '').trim().toLowerCase();
if (q) {
const fields = cfg.cariField || cfg.kolom.map(k => k.k);
data = data.filter(row => fields.some(f =>
String(row[f] == null ? '' : row[f]).toLowerCase().indexOf(q) >= 0));
}
const aktif = st.filterNilai;
if (aktif && typeof aktif === 'object') {
const tetapMap = {};
(cfg.filterTetap || []).forEach(f => { tetapMap[f.k] = f; });
Object.keys(aktif).forEach(kk => {
if (!aktif[kk]) return;
const ft = tetapMap[kk];
if (ft && typeof ft.cocok === 'function') data = data.filter(r => ft.cocok(r, aktif[kk]));
else data = data.filter(r => String(r[kk] == null ? '' : r[kk]).trim() === aktif[kk]);
});
}
if (cfg.filterEkstra) data = data.filter(cfg.filterEkstra);
if (st.sortKey) {
const kol = cfg.kolom.find(k => k.k === st.sortKey) || {};
const arah = st.sortDir === 'desc' ? -1 : 1;
data.sort((a, b) => {
let va = a[st.sortKey], vb = b[st.sortKey];
if (kol.tipe === 'angka') {
va = Number(va); vb = Number(vb);
if (!isFinite(va)) va = -Infinity;
if (!isFinite(vb)) vb = -Infinity;
return (va - vb) * arah;
}
return String(va == null ? '' : va)
.localeCompare(String(vb == null ? '' : vb), 'id', { numeric: true, sensitivity: 'base' }) * arah;
});
}
return data;
}
function idDariPrefix(p) {
return (AppState.prefixTabel && AppState.prefixTabel[p]) || p;
}
function bangunKandidatFilter(st) {
const daftar = [];
(st.cfg.kolom || []).forEach(kol => {
if (!kol || !kol.k) return;
const nilai = [];
let terlalu = false;
for (let i = 0; i < st.data.length; i++) {
const v = String(st.data[i][kol.k] == null ? '' : st.data[i][kol.k]).trim();
if (!v || v.length > 40) continue;
if (nilai.indexOf(v) < 0) {
nilai.push(v);
if (nilai.length > 30) { terlalu = true; break; }
}
}
if (terlalu || nilai.length < 2) return;
if (st.data.length >= 3 && nilai.length === st.data.length) return;
if (nilai.length >= 5 && nilai.length > st.data.length * 0.7) return;
nilai.sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
daftar.push({ k: kol.k, label: kol.label || kol.k, nilai: nilai });
});
return daftar.slice(0, 6);
}
function pasangFilterTabel(id) {
const st = AppState.tabel[id];
if (!st || !st.cfg.idPrefix) return;
const pfx = st.cfg.idPrefix;
const wrap = $(pfx + 'FilterWrap'), isi = $(pfx + 'FilterIsi');
if (!wrap || !isi) return;
if (typeof st.filterNilai !== 'object' || st.filterNilai === null) st.filterNilai = {};
const tetap = (st.cfg.filterTetap || []).map(f => ({
k: f.k, label: f.label, nilai: f.opsi.slice(), tetap: true
}));
// Kolom yang sudah punya filter tetap tidak perlu ditawarkan dua kali.
const kunciTetap = tetap.map(f => f.k);
const kandidat = tetap.concat(
bangunKandidatFilter(st).filter(f => kunciTetap.indexOf(f.k) < 0)).slice(0, 8);
st.kandidatFilter = kandidat;
if (!kandidat.length) { wrap.hidden = true; return; }
wrap.hidden = false;
isi.innerHTML = kandidat.map(f => `
<div class="filter-field">
<label class="filter-label" for="${pfx}_f_${esc(f.k)}">${esc(f.label)}</label>
<select class="field-input" id="${pfx}_f_${esc(f.k)}" data-kolom="${esc(f.k)}"
onchange="ubahFilter('${pfx}','${esc(f.k)}',this.value)">
<option value="">Semua</option>
${f.nilai.map(v => `<option value="${esc(v)}"${st.filterNilai[f.k] === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}
</select>
</div>`).join('');
perbaruiLencanaFilter(pfx);
}
function jumlahFilterAktif(st) {
let n = 0;
Object.keys(st.filterNilai || {}).forEach(k => { if (st.filterNilai[k]) n++; });
return n;
}
function perbaruiLencanaFilter(pfx) {
const st = AppState.tabel[idDariPrefix(pfx)];
const lencana = $(pfx + 'FilterBadge'), tombol = $(pfx + 'FilterBtn');
if (!st || !lencana) return;
const n = jumlahFilterAktif(st);
lencana.textContent = String(n);
lencana.hidden = (n === 0);
if (tombol) tombol.classList.toggle('filter-aktif', n > 0);
}
function ubahFilter(pfx, kolom, nilai) {
const id = idDariPrefix(pfx);
const st = AppState.tabel[id];
if (!st) return;
if (nilai) st.filterNilai[kolom] = nilai; else delete st.filterNilai[kolom];
st.halaman = 1;
st.terpilih = {};
perbaruiLencanaFilter(pfx);
if (typeof st.cfg.saatFilter === 'function') st.cfg.saatFilter();
else renderTabel(id);
}
function resetFilter(pfx) {
const id = idDariPrefix(pfx);
const st = AppState.tabel[id];
if (!st) return;
st.filterNilai = {};
st.halaman = 1;
st.terpilih = {};
const isi = $(pfx + 'FilterIsi');
if (isi) $$('#' + pfx + 'FilterIsi select').forEach(s => s.value = '');
perbaruiLencanaFilter(pfx);
if (typeof st.cfg.saatFilter === 'function') st.cfg.saatFilter();
else renderTabel(id);
}
function bukaPanelFilter(pfx) {
const panel = $(pfx + 'FilterPanel'), tombol = $(pfx + 'FilterBtn');
if (!panel || !tombol) return;
const buka = panel.hidden;
$$('.filter-panel').forEach(p => p.hidden = true);
$$('.ekspor-menu').forEach(m => m.hidden = true);
if (!buka) { tombol.setAttribute('aria-expanded', 'false'); return; }
panel.hidden = false;
tombol.setAttribute('aria-expanded', 'true');
posisikanPanel(panel, tombol);
}
function posisikanPanel(panel, tombol) {
const r = tombol.getBoundingClientRect();
const lebar = panel.offsetWidth || 300;
const tinggi = panel.offsetHeight || 320;
const jendela = { w: window.innerWidth, h: window.innerHeight };
let kiri = r.left;
if (kiri + lebar > jendela.w - 12) kiri = Math.max(12, jendela.w - lebar - 12);
let atas = r.bottom + 8;
if (atas + tinggi > jendela.h - 12) {
const diAtas = r.top - tinggi - 8;
atas = (diAtas > 12) ? diAtas : Math.max(12, jendela.h - tinggi - 12);
}
panel.style.left = Math.round(kiri) + 'px';
panel.style.top = Math.round(atas) + 'px';
}
function tutupPanelFilter(pfx) {
const panel = $(pfx + 'FilterPanel'), tombol = $(pfx + 'FilterBtn');
if (panel) panel.hidden = true;
if (tombol) tombol.setAttribute('aria-expanded', 'false');
}
function pasangEksporKartu(cfg) {
AppState.tabel = AppState.tabel || {};
const lama = AppState.tabel[cfg.id];
AppState.tabel[cfg.id] = {
cfg: cfg, data: cfg.data || [], cari: '',
filterNilai: (lama && lama.cfg && lama.cfg.id === cfg.id) ? (lama.filterNilai || {}) : {},
sortKey: null, sortDir: 'asc', halaman: 1, perHal: 0, terpilih: {}
};
AppState.prefixTabel = AppState.prefixTabel || {};
if (cfg.idPrefix) AppState.prefixTabel[cfg.idPrefix] = cfg.id;
pasangFilterTabel(cfg.id);
if (cfg.idPrefix) {
const kotak = $(cfg.idPrefix + 'EksporWrap');
if (kotak) kotak.hidden = false;
}
return AppState.tabel[cfg.id].filterNilai;
}
function bukaMenuEkspor(prefix) {
const menu = $(prefix + 'EksporMenu'), tombol = $(prefix + 'EksporBtn');
if (!menu) return;
const buka = menu.hidden;
$$('.ekspor-menu').forEach(m => m.hidden = true);
menu.hidden = !buka;
if (tombol) tombol.setAttribute('aria-expanded', String(buka));
}
function barisUntukEkspor(prefix) {
const id = idDariPrefix(prefix);
const st = AppState.tabel[id];
if (!st) return { judul: [], baris: [], nama: 'Data' };
const kolom = st.cfg.kolom.filter(k => k.k);
const data = dataTerproses(id);
return {
nama: st.cfg.judulEkspor || 'Data',
judul: kolom.map(k => k.label),
baris: data.map(r => kolom.map(k => {
const v = r[k.k];
return (v == null || v === '') ? '' : String(v);
}))
};
}
/**
 * @param {string} prefix Awalan tabel yang dibangun buatTabel().
 * @param {string} format 'xlsx' atau 'pdf'.
 * @param {Object} [paketLangsung] Data siap ekspor { nama, judul, baris } untuk
 *   tampilan yang BUKAN tabel buatTabel — misalnya kisi Jadwal Shift. Dengan
 *   jalan masuk ini, kisi tersebut memakai penulis Excel, gaya cetak, dan pesan
 *   yang sama persis dengan menu lain, alih-alih membangun ekspornya sendiri
 *   yang cepat atau lambat akan menyimpang perilakunya.
 */
async function eksporTabel(prefix, format, paketLangsung) {
const menu = $(prefix + 'EksporMenu');
if (menu) menu.hidden = true;
const paket = paketLangsung || barisUntukEkspor(prefix);
if (!paket.baris.length) { toast('Tidak ada data untuk diekspor.', 'warning'); return; }
const berkas = paket.nama.replace(/[^A-Za-z0-9]+/g, '_') + '_' +
new Date().toISOString().slice(0, 10);
if (format === 'xlsx') {
tampilkanSibuk('Menyiapkan berkas Excel…');
const siap = await pastikanSheetJS();
sembunyikanSibuk();
if (!siap) { toast('Pustaka Excel gagal dimuat. Coba lagi atau pakai ekspor PDF.', 'error', 7000); return; }
try {
const ws = XLSX.utils.aoa_to_sheet([paket.judul].concat(paket.baris));
ws['!cols'] = paket.judul.map((h, i) => ({
wch: Math.min(42, Math.max(10, ...paket.baris.map(b => String(b[i] || '').length), h.length + 2))
}));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, paket.nama.substring(0, 28) || 'Data');
XLSX.writeFile(wb, berkas + '.xlsx');
toast(paket.baris.length + ' baris diekspor ke Excel.', 'success');
} catch (e) { toast('Gagal membuat berkas: ' + e.message, 'error'); }
return;
}
cetakPdfTabel(paket, berkas);
}
function cetakPdfTabel(paket, berkas) {
const w = window.open('', 'CetakTabel', 'width=1000,height=700');
if (!w) { toast('Jendela cetak diblokir. Izinkan pop-up untuk situs ini.', 'warning', 7000); return; }
w.document.write('<html><body style="font-family:sans-serif;padding:24px">Menyiapkan dokumen…</body></html>');
const tulis = (gaya) => {
if (!w || w.closed) return;
const kop = (AppState.config && AppState.config.namaSekolah) || '';
w.document.open();
w.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>' +
esc(berkas) + '</title><style>' + gaya + '</style></head><body>' +
'<h1>' + esc(paket.nama) + '</h1><div class="sub">' + esc(kop) + (kop ? ' &middot; ' : '') +
'Diekspor ' + new Date().toLocaleString('id-ID') + ' &middot; ' + paket.baris.length + ' baris</div>' +
'<table><thead><tr>' + paket.judul.map(h => '<th>' + esc(h) + '</th>').join('') +
'</tr></thead><tbody>' +
paket.baris.map(b => '<tr>' + b.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') +
'</tbody></table></body></html>');
w.document.close(); w.focus();
setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
};
const tambah = paket.gayaTambahan || '';
if (AppState.gayaCetak) { tulis(AppState.gayaCetak + tambah); return; }
panggil('gayaCetakTabel', AppState.sessionToken)
.then(res => { AppState.gayaCetak = (res && res.success) ? res.data : ''; tulis(AppState.gayaCetak + tambah); })
.catch(() => tulis(tambah));
}
function renderKolom(k, row) {
const fn = (typeof k.render === 'string') ? RENDER_KOLOM[k.render] : k.render;
if (typeof fn === 'function') return fn(row);
const v = row[k.k];
return esc(v == null || v === '' ? '-' : v);
}
function renderTabel(id) {
const st = AppState.tabel[id];
if (!st) return;
const cfg = st.cfg;
const mount = $(cfg.mount);
if (!mount) return;
const semua = dataTerproses(id);
const total = semua.length;
if (!total) {
const k = cfg.kosong || {};
mount.innerHTML = emptyState(k.ikon || 'inbox', k.judul || 'Tidak ada data',
st.cari ? 'Tidak ada hasil untuk kata kunci "' + st.cari + '".' : (k.desc || ''), k.tombol || '');
perbaruiBarAksiMassal(id);
return;
}
const perHal = st.perHal > 0 ? st.perHal : total;
const totalHal = Math.max(1, Math.ceil(total / perHal));
if (st.halaman > totalHal) st.halaman = totalHal;
const mulai = (st.halaman - 1) * perHal;
const potong = semua.slice(mulai, mulai + perHal);
const kunci = cfg.kunciPilih || 'ID';
const semuaTerpilihDiHalaman = cfg.pilihBisa &&
potong.length > 0 && potong.every(r => st.terpilih[r[kunci]]);
const thead = `<thead><tr>
${cfg.pilihBisa ? `<th class="col-pilih">
<input type="checkbox" ${semuaTerpilihDiHalaman ? 'checked' : ''}
onchange="pilihSemuaHalaman('${id}', this.checked)"
aria-label="Pilih semua di halaman ini"></th>` : ''}
${cfg.kolom.map(k => {
if (!k.sortable) return `<th class="${k.kelas || ''}">${esc(k.label)}</th>`;
const aktif = st.sortKey === k.k;
const ikon = !aktif ? 'unfold_more' : (st.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward');
return `<th class="th-sort ${aktif ? 'aktif' : ''} ${k.kelas || ''}"
onclick="urutkanTabel('${id}','${k.k}')" role="button" tabindex="0"
onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();urutkanTabel('${id}','${k.k}')}"
aria-sort="${aktif ? (st.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}">
<span class="th-sort-inner">${esc(k.label)}<span class="mi">${ikon}</span></span></th>`;
}).join('')}
${cfg.aksi ? '<th></th>' : ''}
</tr></thead>`;
const tbody = `<tbody>${potong.map(row => {
const idRow = row[kunci];
const dipilih = cfg.pilihBisa && !!st.terpilih[idRow];
return `<tr class="${dipilih ? 'terpilih' : ''}">
${cfg.pilihBisa ? `<td class="col-pilih">
<input type="checkbox" ${dipilih ? 'checked' : ''}
onchange="pilihBaris('${id}', '${esc(idRow)}', this.checked)"
aria-label="Pilih baris"></td>` : ''}
${cfg.kolom.map(k => `<td class="${k.kelas || ''}">${
renderKolom(k, row)
}</td>`).join('')}
${cfg.aksi ? `<td><div class="td-actions">${cfg.aksi(row)}</div></td>` : ''}
</tr>`;
}).join('')}</tbody>`;
mount.innerHTML = `<div class="table-wrap"><table class="data-table">${thead}${tbody}</table></div>` +
paginasiHtml(id, total, totalHal, mulai, potong.length);
perbaruiBarAksiMassal(id);
}
function paginasiHtml(id, total, totalHal, mulai, jumlahTampil) {
const st = AppState.tabel[id];
if (totalHal <= 1) {
return `<div class="pagination"><span class="pg-info">Menampilkan ${total} dari ${total} data</span></div>`;
}
const hal = st.halaman;
const nomor = [];
const tambah = n => nomor.push(`<button class="pg-btn ${n === hal ? 'aktif' : ''}"
onclick="gantiHalaman('${id}', ${n})" ${n === hal ? 'aria-current="page"' : ''}>${n}</button>`);
if (totalHal <= 7) { for (let i = 1; i <= totalHal; i++) tambah(i); }
else {
tambah(1);
if (hal > 3) nomor.push('<span class="pg-ellipsis">…</span>');
for (let i = Math.max(2, hal - 1); i <= Math.min(totalHal - 1, hal + 1); i++) tambah(i);
if (hal < totalHal - 2) nomor.push('<span class="pg-ellipsis">…</span>');
tambah(totalHal);
}
return `<div class="pagination">
<span class="pg-info">Menampilkan ${mulai + 1}–${mulai + jumlahTampil} dari ${total} data</span>
<div class="pg-nav">
<button class="pg-btn" onclick="gantiHalaman('${id}', ${hal - 1})" ${hal === 1 ? 'disabled' : ''}
aria-label="Halaman sebelumnya"><span class="mi">chevron_left</span></button>
${nomor.join('')}
<button class="pg-btn" onclick="gantiHalaman('${id}', ${hal + 1})" ${hal === totalHal ? 'disabled' : ''}
aria-label="Halaman berikutnya"><span class="mi">chevron_right</span></button>
</div>
</div>`;
}
function urutkanTabel(id, kolom) {
const st = AppState.tabel[id];
if (!st) return;
if (st.sortKey === kolom) st.sortDir = (st.sortDir === 'asc') ? 'desc' : 'asc';
else { st.sortKey = kolom; st.sortDir = 'asc'; }
renderTabel(id);
}
function gantiHalaman(id, hal) {
const st = AppState.tabel[id];
if (!st || hal < 1) return;
st.halaman = hal;
renderTabel(id);
}
function pilihBaris(id, idRow, nilai) {
const st = AppState.tabel[id];
if (!st) return;
if (nilai) st.terpilih[idRow] = true; else delete st.terpilih[idRow];
renderTabel(id);
}
function pilihSemuaHalaman(id, nilai) {
const st = AppState.tabel[id];
if (!st) return;
const kunci = st.cfg.kunciPilih || 'ID';
const perHal = st.perHal > 0 ? st.perHal : Infinity;
const semua = dataTerproses(id);
const mulai = (st.halaman - 1) * (perHal === Infinity ? 0 : perHal);
const potong = perHal === Infinity ? semua : semua.slice(mulai, mulai + perHal);
potong.forEach(r => { if (nilai) st.terpilih[r[kunci]] = true; else delete st.terpilih[r[kunci]]; });
renderTabel(id);
}
function idTerpilih(id) {
const st = AppState.tabel[id];
return st ? Object.keys(st.terpilih) : [];
}
function batalkanPilihan() {
Object.keys(AppState.tabel).forEach(id => {
if (AppState.tabel[id].cfg.pilihBisa) {
AppState.tabel[id].terpilih = {};
renderTabel(id);
}
});
}
function perbaruiBarAksiMassal(id) {
const st = AppState.tabel[id];
if (!st || !st.cfg.pilihBisa) return;
const bar = $('barAksiMassal');
if (!bar) return;
const jumlah = Object.keys(st.terpilih).length;
bar.hidden = jumlah === 0;
if (jumlah) {
$('bulkJumlah').textContent = jumlah;
const aksi = $('bulkActions');
if (aksi && st.cfg.aksiMassal) aksi.innerHTML = st.cfg.aksiMassal();
}
if (typeof st.cfg.onPilihBerubah === 'function') st.cfg.onPilihBerubah(jumlah);
}
// Favicon bawaan sudah terpasang di index.html dan tampil seketika, bahkan sebelum
// login. Bila admin memasang logo sekolah di Pengaturan, favicon diganti logo itu —
// tetapi hanya setelah gambarnya terbukti dapat dimuat. Menukar lebih dulu lalu
// gagal akan meninggalkan tab tanpa ikon sama sekali, dan itu lebih buruk daripada
// memakai ikon bawaan.
function pasangFaviconSekolah(url) {
if (!url) return;
const uji = new Image();
uji.onload = function () {
$$('link[rel="icon"]').forEach(el => el.parentNode.removeChild(el));
const el = document.createElement('link');
el.rel = 'icon';
el.href = url;
document.head.appendChild(el);
};
uji.onerror = function () {};
uji.src = url;
}
function terapkanTema(tema) {
document.documentElement.setAttribute('data-theme', tema);
Simpanan.simpan('tema', tema);
const gelap = tema === 'dark';
const sw = $('themeSwitch');
if (sw) sw.setAttribute('aria-checked', gelap ? 'true' : 'false');
if ($('ikonTema')) $('ikonTema').textContent = gelap ? 'dark_mode' : 'light_mode';
if ($('ikonTemaTopbar')) $('ikonTemaTopbar').textContent = gelap ? 'light_mode' : 'dark_mode';
if ($('popIkonTema')) $('popIkonTema').textContent = gelap ? 'light_mode' : 'dark_mode';
if ($('popLabelTema')) $('popLabelTema').textContent = gelap ? 'Mode Terang' : 'Mode Gelap';
}
function toggleTema() {
const baru = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
terapkanTema(baru);
// Dahulu baris berikut berbunyi `hancurkanGrafik(); jalankanInit(halamanAktif)`.
//
// Yang sebenarnya perlu diperbarui hanyalah warna grafik — Chart.js menyimpan
// warna di dalam konfigurasinya, jadi kanvas memang harus digambar ulang. Tetapi
// jalankanInit() menjalankan SELURUH penyiapan halaman: memuat tabel, antrean
// izin, antrean pindah, kartu ringkasan, semuanya diambil ulang dari server.
// Menekan tombol bulan-matahari karena itu terasa seperti halaman dimuat ulang,
// lengkap dengan jeda menunggu data — persis keluhan yang dilaporkan.
//
// Sekarang grafik digambar ulang dari data yang SUDAH ada di memori, tanpa satu
// pun perjalanan ke server.
gambarUlangSemuaGrafik();
}
// ── KERANGKA LOGIN YANG SELALU TERSEDIA ────────────────────────────────────
//
// Halaman login dirakit di server karena memuat logo dan nama sekolah dari
// Pengaturan. Konsekuensinya, tanpa server tidak ada apa pun untuk digambar.
// Kerangkanya karena itu disimpan di localStorage, dan bila belum pernah
// tersimpan sekali pun, ada cadangan bawaan di bawah ini yang sepenuhnya
// berfungsi — id kolomnya sama persis dengan yang dipakai handleLogin().
/** Kunci kerangka login ikut membawa versi, dengan alasan sama seperti kunciKerangka(). */
function kunciHtmlLogin() {
  return 'htmlLogin_' + String(window.SIMPKL_VERSI || '0');
}
function simpanHtmlLogin(html) {
  if (!html) return;
  AppState.htmlLogin = html;
  Simpanan.simpan(kunciHtmlLogin(), html);
}

/** Memeriksa versi terbaru kerangka login tanpa membuat pengguna menunggu. */
function segarkanHtmlLogin() {
  if (AppState.__segarLogin) return;
  AppState.__segarLogin = true;
  panggilDiam('getPageContent', ['login', {}])
    .then(res => {
      if (!res || !res.success || !res.html || res.html === AppState.htmlLogin) return;
      simpanHtmlLogin(res.html);
      // Digambar ulang hanya bila pengguna memang masih memandangi form login
      // dan belum mengetikkan apa pun, supaya ketikannya tidak terhapus.
      if (AppState.halamanAktif !== 'login') return;
      const u = $('loginUser'), p = $('loginPass');
      if ((u && u.value) || (p && p.value)) return;
      const wadah = $('app-container');
      if (wadah) wadah.innerHTML = res.html;
    })
    .catch(() => {});
}

function loginCadangan() {
  let ident = {};
  try { ident = JSON.parse(Simpanan.ambil('identitas') || '{}') || {}; } catch (e) { ident = {}; }
  const nama = ident.appName || 'SIM PKL';
  const logo = ident.logoUrl
    ? '<img src="' + esc(ident.logoUrl) + '" alt="Logo" class="auth-logo-img">'
    : '<div class="auth-logo"><span class="mi">school</span></div>';
  const sekolah = ident.namaSekolah
    ? '<div class="auth-sekolah-pill"><span class="mi">location_city</span><span>' +
      esc(ident.namaSekolah) + '</span></div>' : '';
  return '<div class="auth-wrap"><div class="auth-card">' +
    '<div class="auth-identity">' + logo +
    '<h1 class="auth-app">' + esc(nama) + '</h1>' +
    '<p class="auth-tagline">' + esc(ident.appTagline || 'Manajemen Praktik Kerja Lapangan') + '</p>' +
    sekolah + '</div>' +
    '<div class="alert alert-warning" style="margin-bottom:16px"><span class="mi">cloud_off</span>' +
    '<div><strong>Server sedang tidak dapat dihubungi</strong>' +
    '<p>Silakan tetap masuk seperti biasa — aplikasi akan mencoba menyambung ulang ' +
    'secara otomatis. Bila tetap gagal, periksa koneksi internet Anda.</p></div></div>' +
    '<form id="formLogin" onsubmit="handleLogin(event)" novalidate>' +
    '<div class="field"><label class="field-label" for="loginUser">NIS / NIP / Username</label>' +
    '<div class="input-affix"><span class="mi affix-lead">person</span>' +
    '<input class="field-input has-lead" id="loginUser" type="text" autocomplete="username" ' +
    'placeholder="Masukkan NIS, NIP, atau username" required></div>' +
    '<div class="field-error" id="errUser"></div></div>' +
    '<div class="field"><label class="field-label" for="loginPass">Password</label>' +
    '<div class="input-affix"><span class="mi affix-lead">lock</span>' +
    '<input class="field-input has-lead" id="loginPass" type="password" ' +
    'autocomplete="current-password" placeholder="Masukkan password" required>' +
    '<button type="button" class="affix-btn" onclick="togglePassword(\'loginPass\', this)" ' +
    'aria-label="Tampilkan password"><span class="mi">visibility</span></button></div>' +
    '<div class="field-error" id="errPass"></div></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg" id="btnLogin">' +
    '<span class="mi">login</span> Masuk</button></form>' +
    '</div><p class="auth-footer">&copy; ' + new Date().getFullYear() + ' ' + esc(nama) + '</p></div>';
}

async function navigateTo(halaman, opsi = {}) {
if (!halaman) return;
tandaiMenuAktif(halaman);
hentikanKamera();
hentikanPantauLokasi();
hancurkanGrafik();
lupakanPelukisGrafik();
hentikanJam();
tutupModal();
tutupMenuProfil();
AppState.tabel = {};
const wadah = $('app-container');
if (halaman === 'login') {
// Kerangka halaman login sudah ikut terkirim bersama halaman lain saat masuk,
// jadi keluar dari aplikasi tidak perlu menunggu server sama sekali.
//
// Yang dahulu berbahaya adalah jalur sebaliknya: pada kunjungan pertama
// setelah peramban ditutup, kerangka ini belum ada di memori sehingga harus
// diminta ke server — dan bila permintaan itu gagal, blok catch lama menulis
// `wadah.innerHTML = ''`. Itulah layar putih tanpa pesan apa pun. Sekarang
// kerangkanya disimpan juga di localStorage dan masih ada cadangan bawaan,
// jadi form login SELALU ada sesuatu untuk digambar.
AppState.halamanAktif = 'login';
const tersimpan = AppState.htmlLogin || Simpanan.ambil(kunciHtmlLogin());
if (tersimpan) {
AppState.htmlLogin = tersimpan;
wadah.innerHTML = tersimpan;
segarkanHtmlLogin();                       // perbarui diam-diam, jangan ditunggu
return;
}
try {
const res = await panggil('getPageContent', 'login', {});
if (res && res.success && res.html) { simpanHtmlLogin(res.html); wadah.innerHTML = res.html; }
else wadah.innerHTML = loginCadangan();
} catch (e) {
console.warn('Kerangka login tidak dapat diambil:', e && e.message);
wadah.innerHTML = loginCadangan();
}
return;
}
const html = AppState.htmlHalaman && AppState.htmlHalaman[halaman];
if (html && !opsi.paksaMuatUlang) {
AppState.dataAwal = (AppState.paketData && AppState.paketData[halaman]) || null;
if (opsi.dataSegar) AppState.dataAwal = null;
AppState.dataSiap = AppState.dataSiap || {};
AppState.dataSiap[halaman] = true;
AppState.__kerangkaTampil = html;
wadah.innerHTML = html;
mainkanMasuk(wadah);
selesaikanNavigasi(halaman);
return;
}
wadah.innerHTML = memuatInline('Menyiapkan halaman…');
try {
const res = await panggil('getPageContent', halaman, { sessionToken: AppState.sessionToken });
if (!res.success) {
if (res.redirect === 'login') { toast(res.message || 'Sesi berakhir.', 'warning'); keluarPaksa(); return; }
wadah.innerHTML = emptyState('block', 'Tidak dapat membuka halaman', res.message || 'Terjadi kesalahan.');
return;
}
if (!AppState.htmlHalaman) AppState.htmlHalaman = {};
AppState.htmlHalaman[halaman] = res.html;
AppState.__kerangkaTampil = res.html;
AppState.dataAwal = res.dataAwal || null;
wadah.innerHTML = res.html;
mainkanMasuk(wadah);
selesaikanNavigasi(halaman);
} catch (err) {
wadah.innerHTML = emptyState('wifi_off', 'Gagal memuat halaman',
err.message + ' Periksa koneksi internet Anda.',
`<button class="btn btn-primary" onclick="navigateTo('${halaman}', {paksaMuatUlang:true})">Coba Lagi</button>`);
}
}
function segarkanPaketData() {
if (!AppState.sessionToken) return Promise.resolve(false);
return panggil('paketDataAwal', AppState.sessionToken)
.then(function (res) {
if (res && res.success) { AppState.paketData = res.data; return true; }
return false;
})
.catch(function () { return false; });
}
/**
 * Membatalkan data yang sudah tidak berlaku sesudah pengguna mengubah sesuatu.
 *
 * Dahulu fungsi ini selalu membuang SELURUH singgahan. Akibatnya setiap simpan,
 * ubah, atau hapus berbiaya dua perjalanan server berturut-turut: satu untuk
 * menulis, satu lagi untuk mengambil ulang tabel yang baru saja dikosongkan —
 * dan di antara keduanya tabel berkedip menjadi kosong dengan pemutar. Pada
 * Apps Script, perjalanan kedua itu saja sudah satu sampai dua detik.
 *
 * Sekarang bawaannya LUNAK: datanya tetap disimpan supaya layar bisa langsung
 * tergambar, tetapi seluruh singgahan ditandai wajib diperiksa ulang, sehingga
 * pembacaan berikutnya menggambar seketika lalu diam-diam menyusulkan data
 * terbaru. Pembuangan sungguhan hanya untuk perubahan yang mengubah identitas
 * sesi — masuk, keluar, atau tombol segarkan.
 */
function batalkanPaketData(keras) {
AppState.dataAwal = null;
AppState.paketData = null;
AppState.dataSiap = {};
if (keras) { SinggahData.bersihkan(); return; }
Object.keys(SinggahData.isi).forEach(function (k) {
const e = SinggahData.isi[k];
if (e) e.barusanSegar = false;                 // wajib diperiksa lagi
});
SinggahData.tunda = {};
}

/**
 * Menyunting isi singgahan sebuah pembacaan tanpa menghubungi server.
 *
 * Dipakai sesudah mutasi berhasil: jawaban server sudah memuat baris yang baru
 * disimpan, jadi tabel dapat langsung benar tanpa mengambil ulang seluruh
 * daftarnya. Penyegaran senyap tetap berjalan sesudahnya, jadi bila server
 * ternyata menormalkan sesuatu, layar akan menyusul sendiri.
 */
function suntikSinggahan(namaFungsi, args, ubah) {
const kunci = SinggahData.kunci(namaFungsi, args);
const lama = SinggahData.ambil(kunci);
if (!lama) return false;
let baru;
try { baru = ubah(lama.data); } catch (e) { baru = undefined; }
if (baru === undefined) return false;
SinggahData.simpan(kunci, baru);
return true;
}

/** Membuang satu entri singgahan tertentu, tepat pada argumennya. */
function lupakanKunci(namaFungsi, args) {
delete SinggahData.isi[SinggahData.kunci(namaFungsi, args)];
}

/** Membuang singgahan HANYA untuk pembacaan yang disebutkan namanya. */
function lupakanSinggahan(namaFungsi) {
const daftar = [].concat(namaFungsi || []);
Object.keys(SinggahData.isi).forEach(function (k) {
if (daftar.some(function (n) { return k.indexOf(n + '|') === 0; })) delete SinggahData.isi[k];
});
}

/**
 * Menyisipkan, mengganti, atau membuang satu baris di dalam jawaban tersinggah
 * sebuah pembacaan yang berbentuk { success, data: [ … ] }.
 */
function suntikBaris(namaFungsi, args, baris, idHapus, kunciId) {
const kid = kunciId || 'ID';
return suntikSinggahan(namaFungsi, args, function (jawaban) {
if (!jawaban || !jawaban.success || !Array.isArray(jawaban.data)) return undefined;
let daftar = jawaban.data.slice();
if (idHapus) {
const buang = [].concat(idHapus);
daftar = daftar.filter(function (r) { return buang.indexOf(r[kid]) === -1; });
} else if (baris && baris[kid]) {
const i = daftar.findIndex(function (r) { return r[kid] === baris[kid]; });
if (i >= 0) daftar[i] = Object.assign({}, daftar[i], baris);
else daftar = daftar.concat([baris]);
} else return undefined;
return Object.assign({}, jawaban, { data: daftar });
});
}
function muatHalamanUlang() {
if (!AppState.halamanAktif) return;
batalkanPaketData(true);            // tombol segarkan = benar-benar ambil ulang
tampilkanSibuk('Menyegarkan data…');
segarkanPaketData().then(function () {
sembunyikanSibuk();
navigateTo(AppState.halamanAktif, { dataSegar: !AppState.paketData });
});
}
/**
 * Menyalakan ulang animasi masuk TANPA memaksa tata letak dihitung serentak.
 *
 * Pola sebelumnya `void wadah.offsetWidth` adalah trik baku untuk me-restart
 * animasi CSS, dan trik itu bekerja justru KARENA ia memaksa peramban menghitung
 * tata letak saat itu juga. Persoalannya, yang dihitung adalah seluruh halaman
 * yang baru saja disuntikkan, dan penghitungan itu terjadi di dalam penangan
 * klik. Ongkosnya masuk utuh ke INP: satu ketukan terukur 640 md dengan 527 md
 * di antaranya berupa penundaan presentasi — waktu ketika layar belum berubah
 * sama sekali padahal jari sudah diangkat.
 *
 * Menunda penambahan kelas ke bingkai berikutnya menghasilkan animasi yang sama
 * (penghitungan gaya tetap terjadi di antara dua bingkai) tanpa menahan bingkai
 * yang sedang berjalan.
 */
function mainkanMasuk(wadah) {
if (!wadah) return;
wadah.classList.remove('halaman-masuk');
requestAnimationFrame(function () { wadah.classList.add('halaman-masuk'); });
}
function selesaikanNavigasi(halaman) {
AppState.halamanAktif = halaman;
perbaruiNavAktif(halaman);
perbaruiTopbar(halaman);
window.scrollTo({ top: 0, behavior: 'instant' });
jalankanInit(halaman);
}
function jalankanInit(halaman) {
let fn = null;
try { fn = INIT_HALAMAN[halaman]; }
catch (e) {
console.error('Registri halaman belum siap:', e);
toast('Aplikasi belum sepenuhnya dimuat. Muat ulang halaman.', 'error', 7000);
return;
}
if (typeof fn !== 'function') return;
try { fn(); }
catch (e) {
console.error('Gagal menyiapkan halaman "' + halaman + '":', e);
toast('Gagal menyiapkan halaman: ' + e.message, 'error');
}
}
function perbaruiNavAktif(halaman) {
$$('.nav-link[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === halaman));
$$('.bn-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === halaman));
}
function perbaruiTopbar(halaman) {
const diBeranda = (halaman === 'beranda');
$('btnKembali').hidden = diBeranda;
$('topbarTitle').textContent = diBeranda ? 'Beranda' : (JUDUL_HALAMAN[halaman] || 'Halaman');
tutupDrawer();
}
function toggleDrawer() {
const sb = $('sidebar'), scrim = $('drawerScrim'), btn = $('btnDrawer');
if (!sb) return;
const buka = !sb.classList.contains('laci-buka');
sb.classList.toggle('laci-buka', buka);
if (scrim) scrim.hidden = !buka;
if (btn) btn.setAttribute('aria-expanded', String(buka));
document.body.style.overflow = buka ? 'hidden' : '';
}
function tutupDrawer() {
const sb = $('sidebar'), scrim = $('drawerScrim'), btn = $('btnDrawer');
if (sb) sb.classList.remove('laci-buka');
if (scrim) scrim.hidden = true;
if (btn) btn.setAttribute('aria-expanded', 'false');
document.body.style.overflow = '';
}
function kembaliKeBeranda() { navigateTo('beranda'); }
let PRAMUAT_TIMER = null;
function pramuatHalaman(halaman) {
// Ditunda sebentar supaya kursor yang hanya menyapu daftar menu tidak
// memicu belasan permintaan sekaligus.
clearTimeout(PRAMUAT_TIMER);
if (!halaman || !AppState.sessionToken) return;
PRAMUAT_TIMER = setTimeout(function () { jalankanPramuat(halaman); }, 170);
}
function jalankanPramuat(halaman) {
if (!halaman || !AppState.sessionToken) return;
if (!AppState.htmlHalaman) AppState.htmlHalaman = {};
AppState.paketData = AppState.paketData || {};
AppState.dataSiap = AppState.dataSiap || {};
// Seluruh kerangka halaman memang sudah dikirim saat masuk, jadi yang masih
// berharga untuk diambil lebih dulu adalah datanya. Berhenti hanya bila
// keduanya benar-benar sudah siap.
if (AppState.htmlHalaman[halaman] &&
(AppState.paketData[halaman] || AppState.dataSiap[halaman])) return;
AppState.sedangPramuat = AppState.sedangPramuat || {};
if (AppState.sedangPramuat[halaman]) return;
AppState.sedangPramuat[halaman] = true;
panggil('getPageContent', halaman, { sessionToken: AppState.sessionToken, __pramuat: true })
.then(function (res) {
if (res && res.success) {
AppState.htmlHalaman[halaman] = res.html;
if (res.dataAwal) {
AppState.paketData = AppState.paketData || {};
AppState.paketData[halaman] = res.dataAwal;
}
}
})
.catch(function () {})
.then(function () { delete AppState.sedangPramuat[halaman]; });
}
function tandaiMenuAktif(halaman) {
$$('.nav-link[data-page]').forEach(b =>
b.classList.toggle('active', b.dataset.page === halaman));
$$('.bn-item[data-page]').forEach(b =>
b.classList.toggle('active', b.dataset.page === halaman));
}
function renderNavigation() {
const menu = MENU[AppState.user.role] || [];
$('sidebarNav').innerHTML = menu.map(m => `
<li>
<button class="nav-link" data-page="${m.id}" onclick="navigateTo('${m.id}')"
onmouseenter="pramuatHalaman('${m.id}')" onfocus="pramuatHalaman('${m.id}')"
ontouchstart="pramuatHalaman('${m.id}')">
<span class="mi">${m.ikon}</span>
<span class="nav-label">${esc(m.label)}</span>
<span class="nav-count" id="count-${m.id}" hidden>0</span>
</button>
</li>`).join('');
const utama = menu.filter(m => m.bottom).slice(0, 5);
$('bottomNav').innerHTML = utama.map(m => `
<button class="bn-item" data-page="${m.id}"
${m.bottom === 'Lainnya' ? '' : `ontouchstart="pramuatHalaman('${m.id}')"`}
onclick="${m.bottom === 'Lainnya' ? 'bukaMenuLainnya()' : `navigateTo('${m.id}')`}">
<span class="mi">${m.ikon}</span><span>${esc(m.bottom)}</span>
</button>`).join('');
}
function bukaMenuLainnya() { toggleDrawer(); }
function toggleMenuProfil(event) {
if (event) event.stopPropagation();
const pop = $('avatarPop');
const tampil = pop.hidden;
pop.hidden = !tampil;
$('avatarBtn').setAttribute('aria-expanded', tampil ? 'true' : 'false');
}
function tutupMenuProfil() {
const pop = $('avatarPop');
if (pop && !pop.hidden) {
pop.hidden = true;
const btn = $('avatarBtn');
if (btn) btn.setAttribute('aria-expanded', 'false');
}
}
function setelSibukCmdk(sibuk) {
const el = $('cmdkSibuk');
if (el) el.hidden = !sibuk;
}
function setelJumlahCmdk(n, q) {
const el = $('cmdkJumlah');
if (!el) return;
el.textContent = (q && n) ? n + ' hasil' : '';
}
function bukaPencarianGlobal() {
if (!AppState.sessionToken) return;
$('cmdk').hidden = false;
document.body.style.overflow = 'hidden';
const inp = $('cmdkInput');
inp.value = '';
AppState.cmdkIndex = -1;
AppState.cmdkHasil = [];
setelSibukCmdk(false);
renderHasilPencarian(halamanTerjangkau().slice(0, 6), '');
setTimeout(() => inp.focus(), 30);
}
function tutupPencarianGlobal() {
clearTimeout(AppState.cmdkTimer);
setelSibukCmdk(false);
$('cmdk').hidden = true;
document.body.style.overflow = '';
}
function halamanTerjangkau() {
return (MENU[AppState.user.role] || []).map(m => ({
tipe: 'Halaman', ikon: m.ikon, judul: m.label, sub: 'Buka halaman ' + m.label, aksi: m.id
}));
}
function cariGlobalDebounce(kata) {
clearTimeout(AppState.cmdkTimer);
const q = String(kata || '').trim();
const halaman = q
? halamanTerjangkau().filter(h => h.judul.toLowerCase().indexOf(q.toLowerCase()) >= 0)
: halamanTerjangkau().slice(0, 6);
if (q.length < 2) { setelSibukCmdk(false); renderHasilPencarian(halaman, q); return; }
setelSibukCmdk(true);
renderHasilPencarian(halaman, q, true);
AppState.cmdkTimer = setTimeout(async () => {
try {
const res = await panggilDiam('pencarianGlobal', [AppState.sessionToken, q]);
const data = (res && res.success && Array.isArray(res.data)) ? res.data : [];
// Pengguna mungkin sudah mengetik lagi selama menunggu — jangan menimpa.
if (String(($('cmdkInput') || {}).value || '').trim() !== q) return;
setelSibukCmdk(false);
renderHasilPencarian(halaman.concat(data), q);
} catch (e) {
setelSibukCmdk(false);
renderHasilPencarian(halaman, q);
}
}, 240);
}
function renderHasilPencarian(hasil, q, memuat) {
const box = $('cmdkResults');
if (!box) return;
AppState.cmdkHasil = hasil;
AppState.cmdkIndex = hasil.length ? 0 : -1;
setelJumlahCmdk(hasil.length, q);
if (!hasil.length) {
box.innerHTML = memuat
? memuatInline('Mencari "' + q + '"…', true)
: `<div class="cmdk-kosong"><span class="mi">${q ? 'search_off' : 'search'}</span>
<p>${q ? 'Tidak ada hasil untuk "' + esc(q) + '".'
: 'Ketik untuk mencari siswa, guru, tempat PKL, atau halaman.'}</p></div>`;
return;
}
const grup = {};
hasil.forEach((h, i) => { (grup[h.tipe] = grup[h.tipe] || []).push({ h, i }); });
box.innerHTML = Object.keys(grup).map(tipe => `
<div class="cmdk-group">${esc(tipe)}</div>
${grup[tipe].map(({ h, i }) => `
<button class="cmdk-item ${i === AppState.cmdkIndex ? 'aktif' : ''}" data-idx="${i}"
role="option" aria-selected="${i === AppState.cmdkIndex}"
onclick="pilihHasilPencarian(${i})" onmouseenter="sorotHasilPencarian(${i})">
<span class="mi">${h.ikon || 'chevron_right'}</span>
<span class="cmdk-item-main">
<span class="cmdk-item-judul">${esc(h.judul)}</span>
<span class="cmdk-item-sub">${esc(h.sub || '')}</span>
</span>
<span class="cmdk-item-enter">&crarr;</span>
</button>`).join('')}`).join('') +
(memuat ? memuatInline('Mencari data…', true) : '');
}
function pilihHasilPencarian(i) {
const h = AppState.cmdkHasil[i];
if (!h) return;
tutupPencarianGlobal();
navigateTo(h.aksi);
}
function sorotHasilPencarian(i) {
if (i === AppState.cmdkIndex) return;
AppState.cmdkIndex = i;
$$('.cmdk-item').forEach(el => {
const aktif = Number(el.dataset.idx) === i;
el.classList.toggle('aktif', aktif);
el.setAttribute('aria-selected', String(aktif));
});
}
function navigasiPencarian(arah) {
if (!AppState.cmdkHasil.length) return;
AppState.cmdkIndex = (AppState.cmdkIndex + arah + AppState.cmdkHasil.length) % AppState.cmdkHasil.length;
$$('.cmdk-item').forEach(el => {
const aktif = Number(el.dataset.idx) === AppState.cmdkIndex;
el.classList.toggle('aktif', aktif);
el.setAttribute('aria-selected', String(aktif));
});
const aktif = document.querySelector('.cmdk-item.aktif');
if (aktif) aktif.scrollIntoView({ block: 'nearest' });
}
function togglePassword(idInput, tombol) {
const inp = $(idInput);
const sembunyi = inp.type === 'password';
inp.type = sembunyi ? 'text' : 'password';
tombol.querySelector('.mi').textContent = sembunyi ? 'visibility_off' : 'visibility';
tombol.setAttribute('aria-label', sembunyi ? 'Sembunyikan password' : 'Tampilkan password');
}
async function handleLogin(event) {
event.preventDefault();
const user = $('loginUser').value.trim(), pass = $('loginPass').value;
$('errUser').textContent = ''; $('errPass').textContent = '';
$('loginUser').classList.remove('invalid'); $('loginPass').classList.remove('invalid');
let valid = true;
if (!user) { $('errUser').textContent = 'NIS/NIP wajib diisi.'; $('loginUser').classList.add('invalid'); valid = false; }
if (!pass) { $('errPass').textContent = 'Password wajib diisi.'; $('loginPass').classList.add('invalid'); valid = false; }
if (!valid) return;
const btn = $('btnLogin');
btn.disabled = true;
btn.innerHTML = '<span class="spinner spinner-sm"></span> Memeriksa…';
try {
const res = await panggil('masukKilat', user, pass);
if (!res.success) {
$('errPass').textContent = res.message;
$('loginPass').classList.add('invalid');
btn.disabled = false;
btn.innerHTML = '<span class="mi">login</span> Masuk';
return;
}
await mulaiSesi(res.data.token, res.data);
} catch (err) {
toast(err.message, 'error');
btn.disabled = false;
btn.innerHTML = '<span class="mi">login</span> Masuk';
}
}
async function handleLoginGoogle() {
tampilkanSibuk('Memeriksa akun Google…');
try {
const res = await panggil('doLoginGoogle');
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'warning', 6500); return; }
await mulaiSesi(res.data.token);
} catch (err) {
sembunyikanSibuk();
toast(err.message, 'error');
}
}
// Layar peralihan saat masuk. Bukan sekadar hiasan: sebelumnya form login tetap
// terpampang di balik lapisan gelap "Menyiapkan aplikasi…" sampai dashboard siap,
// sehingga pengguna melihat kolom NIS dan password-nya sendiri masih di layar
// dan mengira loginnya gagal. Form dibuang lebih dulu, baru kita menunggu.
function tampilkanTiraiMasuk(pesan) {
const wadah = $('app-container');
if (!wadah) return;
wadah.classList.add('plain');
wadah.innerHTML = '<div class="tirai-peralihan"><span class="boot-spin"></span>' +
'<p>' + esc(pesan || 'Menyiapkan aplikasi…') + '</p></div>';
}
async function mulaiSesi(token, awal) {
SinggahData.bersihkan();
AppState.sessionToken = token;
Simpanan.simpan('sesi', token);
tampilkanTiraiMasuk();
try {
await muatBootstrap(awal);
await navigateTo('beranda');
toast('Selamat datang, ' + AppState.user.nama + '!', 'success');
} catch (err) {
toast(err.message, 'error');
keluarPaksa();
}
}
/**
 * @param {Object} [awal] Hasil masukLengkap() bila datang dari login. Bila kosong
 *   — misalnya saat memulihkan sesi tersimpan — kedua permintaan dikirim
 *   BERSAMAAN, bukan berurutan, sehingga tetap satu kali waktu tunggu.
 */
async function muatBootstrap(awal) {
let res, halaman, sebagian = false;
if (awal && awal.bootstrap) {
res = awal.bootstrap;
halaman = awal.halaman;
sebagian = !!awal.sebagian;
// Data beranda ikut terbawa dalam jawaban masuk. Menaruhnya di paketData
// membuat navigateTo('beranda') menyerahkannya ke panggilCepat sebagai
// dataAwal, sehingga dashboard tergambar TANPA satu pun permintaan tambahan.
if (awal.dataBeranda) AppState.paketData = { beranda: awal.dataBeranda };
} else {
// Memulihkan sesi tersimpan — SATU perjalanan, bukan dua.
//
// Dahulu jalur ini mengirim getBootstrapData, menunggunya selesai, lalu
// membiarkan dashboard meminta datanya sendiri. Pada rekaman jaringan yang
// dilaporkan pengguna kedua permintaan itu berdurasi 8,80 dan 1,99 detik.
// Selisihnya bukan kebetulan: eksekusi pertama menanggung biaya "bangun"
// Apps Script, yang kedua menumpang instans yang sudah hangat. Karena Apps
// Script mengantrekan eksekusi milik pengguna yang sama, dua perjalanan
// berbiaya satu kali bangun ditambah dua kali antre.
//
// pulihKilat() membawa keduanya sekaligus, persis seperti masukKilat() untuk
// login. Kerangka halaman yang tersinggah dari sesi sebelumnya tetap dipakai
// lebih dulu; bila sudah ada, server tidak perlu merakitnya lagi.
const tersinggah = kerangkaTersinggah();
let kilat;
try {
kilat = await panggil('pulihKilat', AppState.sessionToken, !!tersinggah);
} catch (e) {
// Berkas web/ bisa ter-deploy lebih dulu daripada Kode.gs — persis kejadian
// yang membuat halaman Jadwal Shift tampil separuh. Bila Apps Script belum
// mengenal pulihKilat, sesi pengguna TIDAK boleh dianggap batal; jalur lama
// masih ada dan tetap bekerja, hanya dengan satu perjalanan tambahan.
if (!/tidak tersedia/i.test(e && e.message || '')) throw e;
console.warn('Kode.gs belum mengenal pulihKilat. Memakai jalur lama.');
const bootLama = await panggil('getBootstrapData', AppState.sessionToken);
kilat = { success: bootLama.success, message: bootLama.message,
  data: { bootstrap: bootLama, halaman: null, berandaHtml: null, dataBeranda: null } };
}
if (!kilat.success) throw new Error(kilat.message || 'Sesi tidak valid.');
res = kilat.data.bootstrap;
// Data beranda ikut terbawa, jadi navigateTo('beranda') menyerahkannya sebagai
// dataAwal dan dashboard tergambar tanpa satu pun permintaan tambahan.
if (kilat.data.dataBeranda) AppState.paketData = { beranda: kilat.data.dataBeranda };

// Kerangka tersinggah hanya boleh dipakai bila peran sesi ini benar-benar sama
// dengan peran yang menyimpannya. Bila peran seseorang diubah di Pengaturan,
// kerangka lamanya harus dibuang, bukan dipakai sekejap lalu diperbaiki.
const peranKini = res && res.success && res.data && res.data.user && res.data.user.role;
if (tersinggah && peranKini && peranKini === Simpanan.ambil('peranTerakhir')) {
// Beranda diambil dari jawaban baru, bukan dari singgahan: sapaan dan label
// periodenya dirakit di server dan akan salah bila dipakai dari sesi kemarin.
const peta = Object.assign({}, tersinggah);
if (kilat.data.berandaHtml) peta.beranda = kilat.data.berandaHtml;
halaman = { success: true, data: peta };
sebagian = true;
} else {
halaman = kilat.data.halaman ||
  await panggil('semuaHalamanHtml', AppState.sessionToken);
}
}
if (!res.success) throw new Error(res.message || 'Sesi tidak valid.');
AppState.user = res.data.user;
AppState.config = res.data.config;
AppState.periode = res.data.periode;
AppState.penempatan = res.data.penempatan;
if (res.data.skema) SKEMA_MASTER = res.data.skema;
if (res.data.menu) MENU = res.data.menu;
if (res.data.judulHalaman) JUDUL_HALAMAN = res.data.judulHalaman;
const c = AppState.config;
$('brandName').textContent = c.appName || 'SIM PKL';
$('brandDesc').textContent = c.appDesc || 'Manajemen Praktik Kerja';
$('footerBrand').textContent = c.appName || 'SIM PKL';
$('footerSekolah').textContent = c.namaSekolah || '';
$('footerYear').textContent = new Date().getFullYear();
const logoHtml = c.logoUrl
? `<img src="${esc(c.logoUrl)}" alt="Logo">`
: '<span class="mi">school</span>';
$('brandLogo').innerHTML = logoHtml;
document.title = c.appName || 'SIM PKL';
pasangFaviconSekolah(c.logoUrl);
const u = AppState.user;
const peran = u.role === 'admin' ? 'Pokja PKL' : u.role === 'guru' ? 'Guru Pembimbing' : 'Siswa PKL';
const inisial = (u.nama || '?').trim().charAt(0).toUpperCase();
const avatarIsi = u.foto ? `<img src="${esc(u.foto)}" alt="Foto profil ${esc(u.nama)}">` : esc(inisial);
['headerAvatar', 'popAvatar'].forEach(id => {
const el = $(id);
if (el) el.innerHTML = avatarIsi;
});
$('headerNama').textContent = u.nama;
$('headerPeran').textContent = peran;
$('popNama').textContent = u.nama;
$('popSub').textContent = u.username + ' · ' + peran;
$('popPengaturan').hidden = (u.role !== 'admin');
renderNavigation();
tampilkanKerangkaAplikasi(true);
try {
Simpanan.simpan('identitas', JSON.stringify({
appName: c.appName || 'SIM PKL', appTagline: c.appTagline || '',
namaSekolah: c.namaSekolah || '', logoUrl: c.logoUrl || ''
}));
} catch (e) {}
AppState.htmlHalaman = (halaman && halaman.success) ? halaman.data : {};
if (AppState.htmlHalaman.login) simpanHtmlLogin(AppState.htmlHalaman.login);
if (!sebagian) simpanKerangka(AppState.htmlHalaman);
// Pekerjaan latar dijalankan BERURUTAN, tidak berbarengan.
//
// Dulu keduanya dilepas bersamaan tepat saat dashboard sedang menggambar.
// Apps Script mengantrekan eksekusi milik pengguna yang sama, jadi tiga
// permintaan berat sekaligus bukan tiga kali lebih cepat — ketiganya justru
// sama-sama molor sampai kehabisan waktu.
jadwalkanTugasLatar(sebagian);
if (!AppState.periode) toast('Belum ada periode PKL aktif. Presensi dan jurnal terkunci.', 'warning', 7000);
}
// ── SINGGAHAN KERANGKA HALAMAN ─────────────────────────────────────────────
//
// Kerangka setiap menu dirakit di server dan tidak berubah dari menit ke menit.
// Menyimpannya di localStorage membuat pembukaan aplikasi berikutnya menggambar
// menu apa pun seketika, dan permintaan `semuaHalamanHtml` yang paling mahal itu
// pindah ke latar belakang tempat waktunya tidak lagi dirasakan siapa pun.
//
// Kuncinya memuat peran: kerangka milik Pokja PKL tidak boleh sampai terpakai
// oleh siswa yang kebetulan memakai ponsel yang sama.
function kunciKerangka() {
const peran = (AppState.user && AppState.user.role) ||
  String(Simpanan.ambil('peranTerakhir') || '');
// Versi ikut masuk kunci. Kerangka halaman dirakit oleh Kode.gs, jadi setelah
// rilis baru kerangka lama bukan sekadar usang — ia bisa memakai kelas CSS dan
// memanggil fungsi yang sudah tidak ada. Dengan versi di kunci, kerangka lama
// tidak pernah terbaca lagi, tanpa perlu daftar pembatalan yang harus dirawat.
return peran ? 'kerangka_' + peran + '_' + String(window.SIMPKL_VERSI || '0') : '';
}
/**
 * Membuang kerangka milik versi lama. Tanpa ini localStorage menumpuk satu
 * salinan per rilis, dan tiap salinan berukuran ratusan kilobyte.
 */
function bersihkanKerangkaLama() {
const kini = '_' + String(window.SIMPKL_VERSI || '0');
try {
for (let i = localStorage.length - 1; i >= 0; i--) {
const k = localStorage.key(i);
if (!k) continue;
const kerangka = k.indexOf('kerangka_') === 0;
const login = k.indexOf('htmlLogin') === 0;
if (!kerangka && !login) continue;
if (k.slice(-kini.length) !== kini) localStorage.removeItem(k);
}
} catch (e) {}
}
function simpanKerangka(peta) {
if (!peta || !AppState.user) return;
Simpanan.simpan('peranTerakhir', AppState.user.role);
try { Simpanan.simpan(kunciKerangka(), JSON.stringify(peta)); } catch (e) {}
}
function kerangkaTersinggah() {
const k = kunciKerangka();
if (!k) return null;
try {
const isi = JSON.parse(Simpanan.ambil(k) || 'null');
return (isi && typeof isi === 'object' && isi.beranda) ? isi : null;
} catch (e) { return null; }
}

/**
 * Antrean pekerjaan latar sesudah masuk: kerangka halaman dulu, baru paket data.
 *
 * Keduanya berat, dan keduanya boleh terlambat — yang tidak boleh adalah
 * mengganggu layar pertama. Karena itu keduanya menunggu satu detik lebih dulu
 * (cukup bagi dashboard untuk selesai menggambar), lalu berjalan satu per satu.
 */
function jadwalkanTugasLatar(perluKerangka) {
setTimeout(function () {
const langkah = perluKerangka ? lengkapiKerangkaHalaman() : Promise.resolve();
langkah.then(function () { return segarkanPaketData(); })
       .catch(function () {});
}, 1000);
}

/**
 * Menyusulkan kerangka halaman yang belum ada, tanpa membuat siapa pun menunggu.
 * Hanya halaman yang benar-benar belum dipegang klien yang diminta, sehingga
 * pada pembukaan kedua dan seterusnya permintaan ini nyaris tidak berbiaya.
 */
function lengkapiKerangkaHalaman() {
if (AppState.__lengkapiJalan) return Promise.resolve();
AppState.__lengkapiJalan = true;
const sudahAda = Object.keys(AppState.htmlHalaman || {});
const kurang = (MENU[AppState.user.role] || []).map(function (m) { return m.id; })
  .concat(['login', 'profil'])
  .filter(function (n) { return sudahAda.indexOf(n) === -1; });
if (!kurang.length) { AppState.__lengkapiJalan = false; return Promise.resolve(); }
// Dikirim lewat kirimKeServer supaya tetap mendapat percobaan ulang: bila
// pengisian ini gagal diam-diam, setiap perpindahan menu sesudahnya berbiaya
// satu perjalanan server tambahan tanpa pengguna tahu sebabnya.
return kirimKeServer('semuaHalamanHtml', [AppState.sessionToken, kurang])
.then(function (res) {
AppState.__lengkapiJalan = false;
if (!res || !res.success || !res.data) return;
AppState.htmlHalaman = Object.assign({}, AppState.htmlHalaman, res.data);
if (res.data.login) simpanHtmlLogin(res.data.login);
simpanKerangka(AppState.htmlHalaman);
// Bila kerangka halaman yang sedang dibuka ternyata berbeda dari yang
// tergambar dari singgahan, gambar ulang — tetapi tidak pernah di tengah
// pengguna mengetik atau saat ada modal terbuka, karena itu akan menghapus
// isian yang sedang dikerjakannya.
const kini = AppState.halamanAktif;
const sedangMengetik = document.activeElement &&
  /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
const modalTerbuka = $('modal') && !$('modal').hidden;
if (kini && kini !== 'login' && res.data[kini] && !sedangMengetik && !modalTerbuka &&
    res.data[kini] !== AppState.__kerangkaTampil) {
AppState.__kerangkaTampil = res.data[kini];
navigateTo(kini);
}
})
.catch(function () { AppState.__lengkapiJalan = false; });
}

function tampilkanKerangkaAplikasi(masuk) {
$('sidebar').hidden = !masuk;
$('appHeader').hidden = !masuk;
$('topbar').hidden = !masuk;
$('bottomNav').hidden = !masuk;
$('appFooter').hidden = !masuk;
$('mainContent').classList.toggle('with-sidebar', masuk);
$('mainContent').classList.toggle('logged-in', masuk);
$('app-container').classList.toggle('plain', !masuk);
terapkanTema(Simpanan.ambil('tema') || 'light');
}
async function handleLogout() {
const ya = await konfirmasi('Keluar dari aplikasi',
'Anda akan keluar dari SIM PKL. Data yang belum tersimpan akan hilang.', 'Ya, keluar');
if (!ya) return;
const token = AppState.sessionToken;
// Keluar dikerjakan optimistis: layar dibersihkan SEKARANG, penghapusan sesi di
// server menyusul di latar belakang. Menunggu jawaban server lebih dulu membuat
// dashboard tetap terpampang satu dua detik setelah tombol ditekan — terasa
// seperti tombolnya tidak berfungsi. Sesi lokal sudah dibuang, jadi tidak ada
// yang bisa dilakukan meski permintaan itu gagal di jalan.
keluarPaksa();
toast('Anda telah keluar.', 'info');
if (token) panggil('doLogout', token).catch(function () {});
}
function keluarPaksa() {
hentikanKamera();
hentikanPantauLokasi();
hancurkanGrafik();
lupakanPelukisGrafik();
hentikanJam();
tutupPencarianGlobal();
// Kerangka halaman peran ini ikut dibuang. Di ponsel yang dipakai bergantian —
// hal biasa di sekolah — menyisakannya berarti pengguna berikutnya berpeluang
// melihat sekilas menu milik peran sebelumnya.
const kunciLama = kunciKerangka();
if (kunciLama) Simpanan.hapus(kunciLama);
Simpanan.hapus('peranTerakhir');
Simpanan.hapus('sesi');
AppState.sessionToken = null;
AppState.user = null;
batalkanPaketData(true);            // keluar = tidak boleh menyisakan data siapa pun
AppState.penempatan = null;
AppState.tabel = {};
// Kerangka halaman peran sebelumnya dibuang seluruhnya — hanya halaman login yang
// disimpan. Tanpa ini, pengguna berikutnya di perangkat yang sama berpeluang
// melihat sekilas halaman milik peran sebelumnya.
AppState.htmlHalaman = {};
tampilkanKerangkaAplikasi(false);
navigateTo('login');
}
// ── Balon keterangan untuk tombol beriko ───────────────────
//
// Seluruh tombol aksi di aplikasi ini sudah memiliki aria-label demi pembaca
// layar, jadi teksnya dipinjam saja — tidak ada markup yang perlu diubah.
// Balonnya ditempel ke <body> dan diposisikan fixed, sebab tabel dibungkus
// .table-wrap yang ber-overflow dan akan memotong elemen di dalamnya.
let TIP_EL = null, TIP_TIMER = null, TIP_SASARAN = null;
const TIP_PEMILIH = '.btn-icon[aria-label],.icon-btn[aria-label],.btn-ghost[aria-label],[data-tip]';

function tipTeks(el) {
  return (el.getAttribute('data-tip') || el.getAttribute('aria-label') || '').trim();
}
function tipSiapkan() {
  if (TIP_EL) return TIP_EL;
  TIP_EL = document.createElement('div');
  TIP_EL.className = 'tip-balon';
  TIP_EL.setAttribute('role', 'presentation');
  TIP_EL.hidden = true;
  document.body.appendChild(TIP_EL);
  return TIP_EL;
}
function tipTampilkan(el) {
  const teks = tipTeks(el);
  if (!teks) return;
  const balon = tipSiapkan();
  balon.textContent = teks;
  balon.hidden = false;
  balon.classList.remove('tampil');

  const r = el.getBoundingClientRect();
  const b = balon.getBoundingClientRect();
  const sela = 8;
  let kiri = r.left + r.width / 2 - b.width / 2;
  kiri = Math.max(8, Math.min(kiri, window.innerWidth - b.width - 8));
  // Muncul di atas tombol; pindah ke bawah bila ruang atasnya tidak cukup.
  let atas = r.top - b.height - sela;
  if (atas < 8) atas = r.bottom + sela;
  balon.style.left = Math.round(kiri) + 'px';
  balon.style.top = Math.round(atas) + 'px';
  requestAnimationFrame(() => balon.classList.add('tampil'));
}
function tipSembunyikan() {
  clearTimeout(TIP_TIMER);
  TIP_SASARAN = null;
  if (!TIP_EL) return;
  TIP_EL.classList.remove('tampil');
  TIP_EL.hidden = true;
}
function tipPasang() {
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;          // di layar sentuh justru mengganggu
    const el = e.target.closest && e.target.closest(TIP_PEMILIH);
    if (!el || el === TIP_SASARAN) return;
    if (el.disabled) return;
    TIP_SASARAN = el;
    clearTimeout(TIP_TIMER);
    TIP_TIMER = setTimeout(() => { if (TIP_SASARAN === el) tipTampilkan(el); }, 320);
  });
  document.addEventListener('pointerout', e => {
    const el = e.target.closest && e.target.closest(TIP_PEMILIH);
    if (el && el === TIP_SASARAN) tipSembunyikan();
  });
  // Keyboard tetap dilayani, dan balon tidak boleh tertinggal saat layar bergeser.
  document.addEventListener('focusin', e => {
    const el = e.target.closest && e.target.closest(TIP_PEMILIH);
    if (el) { TIP_SASARAN = el; tipTampilkan(el); }
  });
  document.addEventListener('focusout', tipSembunyikan);
  document.addEventListener('click', tipSembunyikan, true);
  window.addEventListener('scroll', tipSembunyikan, true);
  window.addEventListener('resize', tipSembunyikan);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') tipSembunyikan(); });
}

// ── Singgahan data: halaman yang pernah dibuka tampil seketika ─────
//
// Prinsip stale-while-revalidate. Kunjungan kedua ke sebuah menu langsung
// menggambar data yang tersimpan — tanpa kerangka abu-abu, tanpa menunggu
// server — lalu diam-diam mengambil data terbaru di latar. Bila ternyata
// berbeda, halaman digambar ulang sekali. Mutasi apa pun tetap membuang
// singgahan lewat batalkanPaketData(), jadi tidak pernah ada data basi
// setelah pengguna sendiri mengubah sesuatu.
const SinggahData = {
  isi: {},
  tunda: {},
  kunci(nama, args) {
    // Argumen pertama selalu token sesi — tidak ikut menentukan identitas data.
    let ekor = '';
    try { ekor = JSON.stringify(args.slice(1)); } catch (e) { ekor = ''; }
    return nama + '|' + ekor;
  },
  ambil(k) { return Object.prototype.hasOwnProperty.call(this.isi, k) ? this.isi[k] : null; },
  simpan(k, data) {
    try { this.isi[k] = { data: data, sidik: JSON.stringify(data), waktu: Date.now() }; }
    catch (e) { delete this.isi[k]; }        // data tak dapat dibandingkan — jangan disimpan
    const semua = Object.keys(this.isi);
    if (semua.length > 24) delete this.isi[semua[0]];
  },
  bersihkan() { this.isi = {}; this.tunda = {}; }
};

function segarkanDiLatar(kunci, namaFungsi, args) {
  if (SinggahData.tunda[kunci]) return;
  SinggahData.tunda[kunci] = true;
  const halamanSaat = AppState.halamanAktif;
  panggilDiam(namaFungsi, args)
    .then(hasil => {
      delete SinggahData.tunda[kunci];
      const lama = SinggahData.ambil(kunci);
      let sidik = '';
      try { sidik = JSON.stringify(hasil); } catch (e) { return; }
      if (lama && lama.sidik === sidik) return;         // tidak berubah, biarkan
      SinggahData.simpan(kunci, hasil);
      // Gambar ulang hanya bila pengguna masih berada di halaman yang sama.
      if (AppState.halamanAktif !== halamanSaat) return;
      const baru = SinggahData.ambil(kunci);
      if (baru) baru.barusanSegar = true;
      const init = INIT_HALAMAN[halamanSaat];
      if (typeof init !== 'function') return;
      try { init(); } catch (e) {}
    })
    .catch(() => { delete SinggahData.tunda[kunci]; });
}

/**
 * Sama seperti panggil(), tetapi tanpa bilah kemajuan — dipakai di latar.
 * Penyegaran senyap tidak boleh berisik: satu kali gagal sudah cukup, karena
 * layar pengguna sudah terisi data dari singgahan dan tidak ada yang menunggu.
 */
function panggilDiam(namaFungsi, args) {
  return kirimKeServer(namaFungsi, args, { ulang: false });
}

tipPasang();
window.__blok = 1;

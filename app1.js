// ── SPLASH ─────────────────────────────────────────────────────────────────
//
// Satu layar peralihan untuk dua saat yang dulu terlihat berbeda: membuka
// aplikasi, dan menunggu dashboard sesudah menekan Masuk.
//
// Aturannya satu: SPLASH MENGIKUTI KESIAPAN, BUKAN DURASI. Ia tidak pernah
// menahan aplikasi. Satu-satunya penundaan adalah ambang minimum 400 md, dan itu
// pun bukan hiasan — sesudah singgahan sheet, pemulihan sesi bisa selesai dalam
// dua ratusan milidetik, dan layar yang muncul lalu hilang secepat itu terbaca
// sebagai kedipan yang rusak, bukan sebagai kecepatan.
const AMBANG_SPLASH_MS = 400;
const RAGAM_KELUAR_MS = 260;
let SPLASH_MULAI = Date.now();
let SPLASH_TUTUP = false;
let PEWAKTU_SPLASH = null;

/** Mengisi logo dan nama dari identitas tersimpan. Aman dipanggil berulang. */
function isiSplash(identitas) {
const kotak = document.getElementById('splashLogo');
const nama = document.getElementById('splashNama');
if (!kotak || !nama) return;
let id = identitas;
if (!id) {
try { id = JSON.parse(Simpanan.ambil('identitas') || 'null'); } catch (e) { id = null; }
}
if (!id) return;
// Setiap baris hanya ditimpa bila identitasnya memang punya isinya; teks
// bawaan di index.html tetap dipakai bila tidak. Menuliskan string kosong
// akan mengosongkan barisnya dan splash kehilangan satu barisnya diam-diam.
const tulis = function (idEl, teks) {
if (!teks) return;
const el = document.getElementById(idEl);
if (el) el.textContent = teks;
};
tulis('splashNama', id.appName);
tulis('splashSub', id.appDesc);
tulis('splashSekolah', id.namaSekolah);
tulis('splashTagline', id.appTagline);
if (id.logoUrl && !kotak.querySelector('img')) {
const img = document.createElement('img');
img.src = id.logoUrl;
img.alt = '';
kotak.textContent = '';
kotak.appendChild(img);
}
}

function tampilkanSplash() {
const el = document.getElementById('bootLoader');
if (!el) return;
// Hitungan ambang hanya dimulai bila splash memang baru muncul. Memanggil ini
// dua kali dalam satu proses masuk — sekali oleh handleLogin, sekali lagi oleh
// mulaiSesi — tidak boleh memperpanjang tampilnya.
const baruMuncul = el.hidden || SPLASH_TUTUP;
if (PEWAKTU_SPLASH) { clearTimeout(PEWAKTU_SPLASH); PEWAKTU_SPLASH = null; }
isiSplash();
el.classList.remove('tutup');
el.hidden = false;
if (baruMuncul) SPLASH_MULAI = Date.now();
SPLASH_TUTUP = false;
}

function sembunyikanSplash() {
const el = document.getElementById('bootLoader');
if (!el || SPLASH_TUTUP) return;
// Ditandai tertutup SEKETIKA, meski peredupannya masih berjalan. Penjaga boot
// memakai splashMasihTampil() untuk memutuskan apakah aplikasi tersangkut;
// menunda penandanya akan membuatnya salah menuduh.
SPLASH_TUTUP = true;
const sisa = Math.max(0, AMBANG_SPLASH_MS - (Date.now() - SPLASH_MULAI));
if (PEWAKTU_SPLASH) clearTimeout(PEWAKTU_SPLASH);
PEWAKTU_SPLASH = setTimeout(function () {
el.classList.add('tutup');
PEWAKTU_SPLASH = setTimeout(function () {
el.hidden = true;
el.classList.remove('tutup');
PEWAKTU_SPLASH = null;
}, RAGAM_KELUAR_MS);
}, sisa);
}

function splashMasihTampil() {
const el = document.getElementById('bootLoader');
return !!(el && !el.hidden && !SPLASH_TUTUP);
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
// ── Menandai bidang isian yang salah (v8.0) ────────────────────────────────
//
// Menulis pesan ke dalam <div class="field-error"> saja TIDAK CUKUP, dan
// itulah akar dari laporan "formulir Hari Libur gagal disimpan tanpa pesan
// apa pun". Isi modal punya kotak gulirnya sendiri (.modal-body) sedangkan
// tombol Simpan duduk di kaki yang selalu terlihat. Pada layar laptop yang
// pendek — 1366x768 setelah dipotong bilah peramban dan taskbar, atau layar
// mana pun pada zoom 125% — bidang terakhir formulir berada DI BAWAH area
// yang terlihat. Pengguna menekan Simpan, pesan galat tertulis rapi di tempat
// yang tidak bisa ia lihat, dan dari kursinya aplikasi tampak diam saja.
//
// Karena itu di sini dikerjakan empat hal sekaligus, sesuai praktik baku
// penanganan galat formulir (WCAG 3.3.1 Error Identification):
//   1. pesannya ditulis di sebelah bidangnya  — konteks,
//   2. bidangnya digulirkan ke tengah pandangan — supaya pesan itu terlihat,
//   3. fokus dipindahkan ke bidangnya — pembaca layar ikut mengumumkannya,
//      dan pengguna papan ketik langsung berada di tempat yang harus dibetulkan,
//   4. satu toast di puncak layar sebagai jaring pengaman — ia melayang di
//      atas modal, jadi ia terlihat bahkan bila penggulirannya gagal.
// Menggulirkan sebuah elemen ke tengah wadah gulirnya, dengan menghitung
// sendiri, bukan menyerahkannya kepada scrollIntoView().
//
// scrollIntoView({block:'center'}) TIDAK dapat diandalkan di dalam wadah gulir
// bersarang seperti isi modal: pada sebagian keadaan ia tidak menggulir sama
// sekali — terbukti pada panel setinggi 309 px yang isinya 472 px, scrollTop
// tetap 0 dan pesan galatnya tertinggal terpotong di tepi bawah. Perhitungan
// di sini deterministik: cari wadah gulir terdekat, hitung selisihnya, selesai.
function wadahGulir(el) {
let n = el.parentElement;
while (n && n !== document.body) {
const g = getComputedStyle(n).overflowY;
if ((g === 'auto' || g === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
n = n.parentElement;
}
return null;
}
function gulirKeTengah(el) {
if (!el) return;
const wadah = wadahGulir(el);
if (!wadah) {
try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
return;
}
const re = el.getBoundingClientRect(), rw = wadah.getBoundingClientRect();
const tujuan = wadah.scrollTop + (re.top - rw.top) - (wadah.clientHeight - re.height) / 2;
const batas = Math.max(0, Math.min(tujuan, wadah.scrollHeight - wadah.clientHeight));
try { wadah.scrollTo({ top: batas, behavior: 'smooth' }); }
catch (e) { wadah.scrollTop = batas; }
}
function tandaiBidangGalat(idBidang, idPesan, pesan) {
const kotak = $(idPesan);
if (kotak) kotak.textContent = pesan;
toast(pesan, 'warning', 5000);
const bidang = $(idBidang);
if (!bidang) return;
bidang.classList.add('field-invalid');
bidang.setAttribute('aria-invalid', 'true');
// Yang digulirkan adalah SELURUH kelompok bidangnya (.field), bukan kolom
// isiannya saja. Pesan galat duduk DI BAWAH kolom isian; menengahkan kolom
// isian bisa meninggalkan pesannya tepat di luar tepi bawah — kolomnya
// terlihat, tetapi kalimat yang harus dibaca tidak. Itu mengulang persis
// kegagalan yang sedang diperbaiki, hanya beberapa piksel lebih sedikit.
// URUTANNYA PENTING: fokus dulu, baru digulirkan.
//
// focus() membatalkan penggulliran halus yang sedang berjalan — bahkan dengan
// preventScroll, yang hanya berjanji tidak MEMULAI penggulirannya sendiri,
// bukan tidak menghentikan yang sudah jalan. Menggulir lebih dulu lalu
// memfokus membuat penggulirannya mati di tengah jalan dan scrollTop tetap
// nol; pesannya kembali tertinggal di luar pandangan, persis seperti semula.
try { bidang.focus({ preventScroll: true }); } catch (e) { try { bidang.focus(); } catch (e2) {} }
gulirKeTengah((bidang.closest && bidang.closest('.field')) || bidang);
}
function bersihkanBidangGalat(pasangan) {
(pasangan || []).forEach(function (q) {
const kotak = $(q[1]);
if (kotak) kotak.textContent = '';
const bidang = $(q[0]);
if (!bidang) return;
bidang.classList.remove('field-invalid');
bidang.removeAttribute('aria-invalid');
});
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
// Kolom FotoUrl/LogoUrl menyimpan DUA bentuk yang berbeda, tergantung dari mana
// isinya datang: berkas yang diunggah lewat halaman Profil tersimpan sebagai ID
// berkas Drive, sedangkan logo instansi diketik admin sebagai alamat web biasa.
// Keduanya sah, dan pemakainya tidak perlu tahu bedanya — fungsi ini yang
// membedakannya. Kembaran urlPratinjau() di sisi server, dengan tambahan: yang
// sudah berupa alamat lengkap dibiarkan apa adanya.
function urlGambar(nilai, lebar) {
const v = String(nilai || '').trim();
if (!v) return '';
if (/^(https?:)?\/\//i.test(v) || v.indexOf('data:') === 0) return v;
return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(v) + '&sz=w' + (lebar || 400);
}
/**
 * Kepala modal detail: gambar besar, nama, dan satu baris keterangan.
 *
 * Bentuk gambarnya sengaja tidak seragam. Wajah dipotong lingkaran dan diisi
 * penuh (cover) karena itulah bahasa avatar yang dipakai di seluruh aplikasi.
 * Logo instansi TIDAK boleh diperlakukan begitu: memotongnya jadi lingkaran
 * akan memakan huruf di tepi lambang, jadi ia diberi bingkai persegi membulat
 * dan dimuat utuh (contain) di atas permukaan terang.
 */
function kepalaDetail(opsi) {
const bentuk = opsi.bentuk === 'kotak' ? 'kotak' : 'bulat';
const src = urlGambar(opsi.gambar, 400);
const alt = bentuk === 'kotak' ? 'Logo ' + (opsi.nama || '') : 'Foto ' + (opsi.nama || '');
const cadangan = bentuk === 'kotak'
? `<span class="mi">${esc(opsi.ikon || 'domain')}</span>`
: esc(String(opsi.nama || '?').trim().charAt(0).toUpperCase() || '?');
// Gambar dan cadangannya sama-sama ditulis, lalu salah satunya disembunyikan
// lewat kelas 'ada-gambar'. Kalau alamatnya ternyata mati, onerror mencabut
// kelas itu dan huruf/ikon cadangannya muncul menggantikan — tidak ada kotak
// gambar rusak yang tertinggal di kepala modal.
//
// onerror dilucuti sendiri pada baris pertama. Peramban bisa memunculkan galat
// untuk satu gambar LEBIH DARI SEKALI, dan pada panggilan kedua elemennya sudah
// tercabut dari induknya — parentNode-nya null, dan penanganan yang tidak
// berjaga akan melempar TypeError dari dalam penangan galat.
return `<div class="detail-kepala">
<div class="detail-gambar detail-gambar-${bentuk}${src ? ' ada-gambar' : ''}">
${src ? `<img src="${esc(src)}" alt="${esc(alt)}"
onerror="this.onerror=null;if(this.parentNode)this.parentNode.classList.remove('ada-gambar');this.remove()">` : ''}
<span class="detail-gambar-cadangan" aria-hidden="true">${cadangan}</span>
</div>
<div class="detail-identitas">
<p class="detail-nama">${esc(opsi.nama || '—')}</p>
${opsi.sub ? `<p class="detail-sub">${esc(opsi.sub)}</p>` : ''}
${opsi.chip || ''}
</div>
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
// tglSingkat tanpa nama hari: "5 Mei 2026", bukan "Sel, 5 Mei 2026". Dipakai di
// tempat sempit — kotak Mulai/Selesai dan label tonggak progres — yang nama
// harinya justru memaksa teks membungkus tanpa menambah keterangan apa pun.
// Sengaja dibangun DI ATAS tglSingkat, bukan menyalin logikanya, supaya
// penanganan zona waktu di sana tidak perlu dijaga di dua tempat.
function tglRingkas(iso) {
return tglSingkat(iso).replace(/^[A-Za-z]{3}, /, '');
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

// ── PROXY VERCEL SEBAGAI JALUR UTAMA ───────────────────────────────────────
//
// Apps Script tidak menjawab POST secara langsung. `/exec` membalas 302 ke
// `script.googleusercontent.com/macros/echo?user_content_key=…`, dan lompatan
// KEDUA itulah titik lemahnya. Kuncinya sekali pakai dan berumur pendek; bila
// lompatan itu gagal, hasil eksekusi yang sudah selesai tidak pernah sampai.
//
// Kegagalan itu terjadi sungguhan dan bentuknya menyesatkan: di Apps Script
// seluruh eksekusi tercatat "Selesai" dalam 1,4–7,4 detik — tidak satu pun
// merah — sementara di peramban empat percobaan masukKilat berturut-turut gagal
// dengan "blocked by CORS policy" dan satu 404 pada alamat googleusercontent.
// Empat eksekusi berhasil, nol yang sampai. Sebabnya juga tidak bisa dibaca dari
// klien: halaman galat Google tidak membawa header CORS, jadi apa pun yang
// sebenarnya terjadi hanya tampak sebagai tembok CORS.
//
// Proxy `/api/gas` menempuh lompatan kedua itu DARI SISI SERVER. Peramban tidak
// pernah menyentuh script.googleusercontent.com, tidak pernah berurusan dengan
// kunci sekali pakai, dan tidak pernah kena CORS — /api/gas satu domain dengan
// halamannya. Karena itu sejak v4.4 ia menjadi jalur UTAMA, bukan cadangan.
//
// Jalur langsung tetap ada dan otomatis dipakai bila proxy gagal, lalu kembali
// ke proxy setengah jam kemudian. Keduanya saling menjadi cadangan.
const ALAMAT_PROXY = '/api/gas';
const UMUR_LANGSUNG_MS = 30 * 60 * 1000;

/** Proxy hanya masuk akal bila halaman disajikan Vercel, bukan dari /exec. */
function proxyTersedia() {
  return String(window.SIMPKL_API || '').indexOf('http') === 0 &&
    location.protocol.indexOf('http') === 0;
}
/** Benar selama proxy sedang dihindari karena terbukti gagal. */
function langsungSedangDipakai() {
  const sampai = Number(Simpanan.ambil('langsungSampai') || 0);
  if (!sampai) return false;
  if (Date.now() > sampai) { Simpanan.hapus('langsungSampai'); return false; }
  return true;
}
function pakaiJalurLangsung() {
  Simpanan.simpan('langsungSampai', String(Date.now() + UMUR_LANGSUNG_MS));
  console.warn('Proxy ' + ALAMAT_PROXY + ' gagal. Memakai jalur langsung untuk sementara.');
}
/**
 * Kembali ke proxy sebelum setengah jamnya habis.
 *
 * Tanpa ini aplikasi bisa TERKUNCI pada jalur yang terbukti gagal — persis yang
 * dulu terjadi dengan arah sebaliknya: proxy sempat berhasil sekali, penandanya
 * menyala tiga puluh menit, lalu setiap permintaan sesudahnya gagal tanpa satu
 * pun kesempatan mencoba jalur yang lain.
 */
function kembaliKeProxy() {
  Simpanan.hapus('langsungSampai');
  console.warn('Jalur langsung ikut gagal. Kembali memakai ' + ALAMAT_PROXY + '.');
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
/**
 * Kunci penggabung permintaan yang sedang terbang.
 *
 * Versi lama memakai `args.slice(1)` — argumen PERTAMA dibuang, dengan asumsi
 * argumen itu selalu token sesi yang tidak boleh ikut masuk kunci. Untuk hampir
 * semua panggilan asumsi itu benar.
 *
 * getPageContent(namaHalaman, params) berbentuk LAIN: argumen pertamanya adalah
 * NAMA HALAMAN. Membuangnya membuat SELURUH permintaan halaman punya kunci yang
 * sama persis, jadi dua permintaan yang berangkat berdekatan digabungkan dan
 * pemanggil kedua menerima HTML halaman milik pemanggil pertama. Di layar: menu
 * yang disorot benar, isinya milik halaman lain, pemutarnya berputar selamanya —
 * dan hasil yang salah itu ikut tersimpan di AppState.htmlHalaman di bawah nama
 * yang benar, sehingga halaman itu tetap salah sampai aplikasi dimuat ulang.
 *
 * Ironisnya `slice(1)` juga GAGAL pada tujuannya sendiri di sini: token sesi
 * milik getPageContent ada di DALAM argumen kedua, jadi ia tetap ikut masuk
 * kunci sementara nama halamannya justru yang terbuang.
 *
 * Sekarang seluruh argumen dipertahankan — itulah yang membedakan satu panggilan
 * dari yang lain — dan tokennya disamarkan di mana pun ia muncul, termasuk saat
 * bersarang di dalam objek. Dua tujuan yang dulu saling bertabrakan kini
 * dikerjakan masing-masing oleh mekanisme yang tepat.
 */
function kunciTerbang(namaFungsi, args) {
  try {
    let teks = JSON.stringify(args || []);
    const tok = (typeof AppState !== 'undefined') && AppState.sessionToken;
    if (tok) teks = teks.split(JSON.stringify(tok)).join('"@sesi"');
    return namaFungsi + '|' + teks;
  } catch (e) { return ''; }
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
        // Isi jawabannya dibaca DULU, baru dijadikan galat.
        //
        // Proxy /api/gas sengaja menaruh sebab yang sudah diterjemahkan di dalam
        // badan jawaban 502-nya — kuota Apps Script habis, otorisasi diminta
        // ulang, penerapan tidak bisa dibuka. Dulu blok ini melempar galat
        // sebelum membaca badan itu, sehingga satu-satunya komponen yang tahu
        // sebabnya justru dibungkam, dan yang sampai ke pengguna hanya "Server
        // menjawab kode 502." Di jalur langsung sebab itu memang tidak pernah
        // terlihat — halaman galat Google tidak membawa header CORS — jadi
        // jawaban proxy inilah satu-satunya keterangan yang ada.
        return r.text().then(teks => {
          let pesan = r.status === 404
            ? 'Alamat layanan tidak menjawab (404).'
            : 'Server menjawab kode ' + r.status + '.';
          let dariServer = false;
          try {
            const isi = JSON.parse(teks);
            if (isi && isi.__galat) { pesan = String(isi.__galat); dariServer = true; }
          } catch (x) {}
          const e = new Error(pesan);
          // Ditandai supaya keterangan yang benar-benar berisi tidak kalah oleh
          // galat transport yang hanya berkata "tidak dapat menghubungi server".
          if (dariServer) e.dariServer = true;
          if (r.status >= 500 || r.status === 429 || r.status === 404 || r.status === 403) {
            e.jenis = GALAT_JARINGAN;
          }
          throw e;
        });
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

  const alamatUtama = (proxyTersedia() && !langsungSedangDipakai())
    ? ALAMAT_PROXY : window.SIMPKL_API;

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
      // Jalur yang sedang dipakai habis percobaannya: beri jalur satunya satu
      // kesempatan, lalu ingat pilihan itu untuk permintaan berikutnya. Bertahan
      // pada jalur yang terbukti gagal tidak pernah menolong siapa pun.
      if (alamatUtama === ALAMAT_PROXY) {
        return sekali(window.SIMPKL_API).then(
          paket => { pakaiJalurLangsung(); return paket; },
          // Bila proxy sempat MENJAWAB dan membawa sebabnya, itulah yang
          // dilaporkan. Galat jalur langsung hanya berkata "tidak dapat
          // menghubungi server" — akibat, bukan sebab.
          errLangsung => { throw (err && err.dariServer) ? err : errLangsung; });
      }
      if (!proxyTersedia()) throw err;
      return sekali(ALAMAT_PROXY).then(
        paket => { kembaliKeProxy(); return paket; },
        errProxy => { throw (errProxy && errProxy.dariServer) ? errProxy : err; });
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
// Hasil ukur sesudah Libur masuk (v5.0): mode terang ΔE buta warna 10,7 dan mata
// normal 17,3; mode gelap 8,9 dan 19,0 (ambang 8 dan 15). Seluruh warna kategori
// ≥3:1 terhadap permukaannya.
// Mode gelap DIPILIH ULANG untuk permukaan gelap, bukan hasil pembalikan otomatis.
function warnaGrafik() {
const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
return {
sukses:  gelap ? '#49A97E' : '#4CA37D',  // Hadir
warning: gelap ? '#BC8B33' : '#C2891A',  // Telat
primary: gelap ? '#3273AE' : '#2F6DA8',  // Izin
ungu:    gelap ? '#9E7ED2' : '#A87FD9',  // Sakit
error:   gelap ? '#B0414F' : '#B0353F',  // Alpha
// Libur: mawar cerah. Rona ini dipilih bukan karena selera, melainkan karena
// ia satu-satunya yang masih lapang — lima status sudah memakai hijau, kuning,
// biru, violet, dan merah, dan mawar adalah celah terlebar yang tersisa di
// lingkaran rona sesudah keenamnya diletakkan.
//
// Ia diukur terhadap enam warna lain pada mata normal DAN tiga jenis buta warna:
// pasangan terlemahnya Telat/deuteranopia ΔE 10,7 di mode terang dan
// Telat/tritanopia ΔE 12,5 di mode gelap — keduanya di atas ambang 8, dan Libur
// tidak pernah menjadi pasangan terlemah palet ini.
//
// Nada gelapnya jauh lebih muda, bukan versi tergelapkan dari nada terangnya:
// di atas permukaan gelap, mawar pekat justru meredup, dan mawar muda yang
// menyala. Kroma di mode gelap sengaja ditahan (~45) karena di atas itu ia mulai
// berdempetan dengan Sakit(violet) pada penglihatan protanopia.
libur:   gelap ? '#FE97C2' : '#FF3369',
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
// Bawaannya 10 sejak v7.5. Angka 25 membuat tabel siswa satu kelas hampir
// selalu muat dalam satu halaman — dan halaman yang tidak pernah berganti
// membuat pengguna tidak pernah tahu ada yang bisa disaring.
perHal: st.cfg && st.cfg.id === cfg.id ? (st.perHal || PER_HAL_BAWAAN) : PER_HAL_BAWAAN,
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
if (perHal) pasangPerHal(cfg, perHal);
}
// Nilai bawaan jumlah entri, satu tempat untuk seluruh tabel di semua modul.
const PER_HAL_BAWAAN = 10;
const PER_HAL_SIAP = [10, 25, 50, 100, 0];
/**
 * Menyambungkan pemilih "Tampilkan" beserta kotak angka bebasnya.
 *
 * Angka yang tidak ada di daftar siap pakai TIDAK dipaksa kembali ke 10:
 * pemilihnya berpindah ke "Kustom…" dan kotak angkanya terbuka membawa angka
 * itu. Kalau tidak, tabel yang digambar ulang — sesudah menyimpan data, atau
 * saat penyegaran senyap — diam-diam mengembalikan pilihan penggunanya.
 */
function pasangPerHal(cfg, sel) {
const st = AppState.tabel[cfg.id];
const kotak = $(cfg.idPrefix + 'KustomWrap');
const isian = $(cfg.idPrefix + 'PerHalKustom');
const kustom = PER_HAL_SIAP.indexOf(Number(st.perHal)) === -1;
sel.value = kustom ? 'kustom' : String(st.perHal);
if (kotak) kotak.hidden = !kustom;
if (isian) isian.value = kustom ? String(st.perHal) : '';
const terapkan = (n) => {
st.perHal = n;
st.halaman = 1;
renderTabel(cfg.id);
};
sel.onchange = () => {
if (sel.value === 'kustom') {
if (kotak) kotak.hidden = false;
const n = Number(isian && isian.value) || 0;
if (isian) { isian.focus(); isian.select(); }
if (n > 0) terapkan(n);
return;
}
if (kotak) kotak.hidden = true;
terapkan(Number(sel.value) || 0);
};
if (isian) {
// Diterapkan saat mengetik, bukan hanya saat kehilangan fokus — mengetik
// lalu langsung menggulir tabel adalah urutan yang wajar, dan angka yang
// baru berlaku sesudah klik di tempat lain terasa seperti tidak berfungsi.
isian.oninput = () => {
const n = Math.floor(Number(isian.value));
if (!(n > 0)) return;
terapkan(Math.min(n, 9999));
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
// ── Penyaring untuk halaman yang bukan tabel ──────────────────────────
// Panelnya sama persis dengan milik modul admin & guru; yang berbeda hanya
// tempat nilainya disimpan. Filter tabel hidup di AppState.tabel[id] bersama
// data, urutan, dan halamannya; halaman seperti Riwayat Presensi dan Jurnal
// tidak punya keadaan tabel sama sekali, jadi nilainya ditaruh terpisah.
//
// Fungsi yang MENERAPKAN saringan didaftarkan per awalan, bukan dipanggil
// langsung dari sini: dengan begitu komponen ini tidak perlu tahu apa pun
// tentang halaman yang memakainya, dan halaman baru cukup mendaftar.
const SARING_TERAPKAN = {};
function daftarkanSaring(pfx, fn) { SARING_TERAPKAN[pfx] = fn; }
function nilaiSaring(pfx, kunci) {
return (((AppState.saring || {})[pfx]) || {})[kunci] || '';
}
function ubahSaring(pfx, kunci, nilai) {
AppState.saring = AppState.saring || {};
AppState.saring[pfx] = AppState.saring[pfx] || {};
if (nilai) AppState.saring[pfx][kunci] = nilai;
else delete AppState.saring[pfx][kunci];
perbaruiLencanaSaring(pfx);
if (typeof SARING_TERAPKAN[pfx] === 'function') SARING_TERAPKAN[pfx]();
}
function resetSaring(pfx) {
AppState.saring = AppState.saring || {};
AppState.saring[pfx] = {};
// Kontrolnya ikut dikembalikan; kalau hanya nilainya yang dihapus, panelnya
// tetap memperlihatkan pilihan lama dan berbohong tentang keadaan saringan.
$$('#' + pfx + 'FilterPanel select').forEach(function (s) { s.value = ''; });
perbaruiLencanaSaring(pfx);
if (typeof SARING_TERAPKAN[pfx] === 'function') SARING_TERAPKAN[pfx]();
}
// Mengisi pilihan sebuah parameter saringan dari data yang sedang dimuat —
// untuk parameter yang isinya tidak bisa diketahui saat halaman dibangun,
// misalnya daftar tempat PKL atau kelas.
function isiOpsiSaring(pfx, kunci, opsi) {
const sel = $(pfx + '_s_' + kunci);
if (!sel) return;
const terpilih = nilaiSaring(pfx, kunci);
sel.innerHTML = '<option value="">Semua</option>' +
(opsi || []).map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
// Pilihan lama dipertahankan bila masih ada. Bila tidak — datanya berubah,
// tempatnya dihapus — saringannya ikut dilepas: lencana yang menghitung
// pilihan yang tidak terlihat di panel adalah lencana yang berbohong.
if (terpilih && (opsi || []).indexOf(terpilih) !== -1) { sel.value = terpilih; return; }
if (terpilih) {
AppState.saring = AppState.saring || {};
if (AppState.saring[pfx]) delete AppState.saring[pfx][kunci];
}
perbaruiLencanaSaring(pfx);
}
function perbaruiLencanaSaring(pfx) {
const nilai = (AppState.saring || {})[pfx] || {};
let n = 0;
Object.keys(nilai).forEach(function (k) { if (nilai[k]) n++; });
const lencana = $(pfx + 'FilterBadge'), tombol = $(pfx + 'FilterBtn');
if (lencana) { lencana.textContent = String(n); lencana.hidden = (n === 0); }
if (tombol) tombol.classList.toggle('filter-aktif', n > 0);
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
${/* Judul kolom aksi bersifat OPSIONAL dan bawaannya tetap kosong: tabel
     yang sudah ada tidak berubah kecuali memang diminta lewat cfg.labelAksi.
     Kolom tanpa judul membuat pembaca menebak isinya dari ikonnya sendiri,
     jadi tabel yang aksinya lebih dari satu sebaiknya memberinya nama. */''}
${cfg.aksi ? `<th class="col-aksi">${esc(cfg.labelAksi || '')}</th>` : ''}
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
${cfg.aksi ? `<td class="col-aksi"><div class="td-actions">${cfg.aksi(row)}</div></td>` : ''}
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
      if (wadah) { wadah.innerHTML = res.html; siapkanFormLogin(); }
    })
    .catch(() => {});
}

// ── Halaman login: ikon dan perakit ────────────────────────────────────────
//
// DUA BERKAS memuat kedua fungsi di bawah ini dalam bentuk yang SAMA PERSIS:
// Kode.gs (dipakai buildLogin(), jalur biasa — halaman login dirakit server)
// dan web/app1.js (dipakai loginCadangan(), jalur luring saat server tidak
// dapat dihubungi). Kalau keduanya menyimpang, pengguna yang jaringannya
// putus akan melihat halaman login versi lain — cacat yang hanya muncul
// justru pada keadaan yang paling sulit ditiru. uji-login.js bagian 1
// mengambil keduanya lalu membandingkannya, dan gagal bila berbeda.
//
// IKONNYA SVG SEBARIS, bukan font ikon. Alasannya sama dengan di layar
// sambutan: halaman ini adalah gambaran PERTAMA aplikasi, sedangkan font
// Material Symbols baru tiba beberapa ratus milidetik kemudian. Memakai
// <span class="mi"> di sini berarti pengguna melihat tulisan "person",
// "lock", dan "visibility" dulu, baru ikonnya menyusul — tepat di layar yang
// tugasnya membentuk kesan pertama.

function ikonLogin(nama) {
  var peta = {
    logo: '<svg viewBox="0 0 64 64" width="64" height="64" role="img" aria-hidden="true"><path d="M32 6 55 19v26L32 58 9 45V19Z" fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><g fill="none" stroke="var(--on-primary)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 30 11-7.5L43 30"/><path d="M24.5 30.5v12M32 30.5v12M39.5 30.5v12"/><path d="M19 42.5h26"/></g></svg>',
    sekolah: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 14V6l4-2v10M6.5 14V2.6L11 5v9M2.5 14h11"/></svg>',
    orang: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M4.8 20c0-3.5 3.2-5.8 7.2-5.8s7.2 2.3 7.2 5.8"/></svg>',
    mata: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.2 12S6 5.6 12 5.6 21.8 12 21.8 12 18 18.4 12 18.4 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    mataTutup: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.2 12S6 5.6 12 5.6 21.8 12 21.8 12 18 18.4 12 18.4 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="3"/><path d="m4 4 16 16"/></svg>',
    centang: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3.5 8.4 3 3 6-6.4"/></svg>',
    panah: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="#25D366" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.17h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.4c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.25-8.24 8.25Z"/><path fill="#25D366" d="M16.56 14.28c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.1-.5.11-.11.25-.29.37-.44.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.47-.01c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.11-.22-.17-.47-.29Z"/></svg>',
    google: '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
  };
  return peta[nama] || '';
}

/**
 * Merakit seluruh HTML halaman login.
 *
 * @param {Object} o  nama, tagline, sekolah, kontak, wa, clientId, logoUrl, tahun,
 *                    peringatan
 *
 * PEMILIH PERAN BUKAN PENYARING. Server tetap membaca peran dari akunnya, dan
 * salah pilih tidak pernah menolak login — nilainya bahkan tidak ikut terkirim.
 * Tugasnya hanya membuat kolom pertama menyebut dirinya dengan benar: "NIS"
 * bagi siswa, "NIP" bagi guru, "Username" bagi admin. Label lama,
 * "NIS / NIP / Username", memaksa setiap orang membaca dua pilihan yang bukan
 * miliknya. Karena itu tombolnya <button type="button">, bukan <input>.
 *
 * data-app / data-tagline / data-sekolah / data-kontak pada .auth-identity
 * adalah KONTRAK, bukan hiasan. Layar sambutan membaca nilai-nilai itu dari
 * halaman login yang baru digambar di baliknya — satu-satunya sumber yang
 * tersedia pada pembukaan pertama, sebab `identitas` di localStorage baru
 * terisi sesudah seseorang berhasil masuk. Dulu ia mengorek teks yang tampil
 * (.auth-app, .auth-tagline), dan itu pecah begitu judulnya berubah menjadi
 * "Masuk ke <nama>". Atribut data tidak ikut berubah ketika tampilannya
 * berubah — itulah gunanya.
 */
function rakitLogin(o) {
  var nama = o.nama || 'SIM PKL';
  var logo = o.logoUrl
    ? '<img src="' + esc(o.logoUrl) + '" alt="Logo ' + esc(o.sekolah || '') + '" class="auth-logo-img">'
    : '<div class="auth-logo">' + ikonLogin('logo') + '</div>';
  var pilSekolah = o.sekolah
    ? '<div class="auth-sekolah-pill">' + ikonLogin('sekolah') +
      '<span>' + esc(o.sekolah) + '</span></div>'
    : '';
  var daftarPeran = [['siswa', 'Siswa'], ['guru', 'Guru'], ['admin', 'Admin']];
  // Pil yang meluncur digambar SATU KALI sebagai elemen tersendiri, bukan
  // sebagai latar tiap tombol. Yang berpindah hanya --peran-ke, jadi peralihan
  // rasanya satu benda yang bergeser — bukan satu warna padam dan satu lagi
  // menyala di tempat lain.
  var peran = '<span class="auth-peran-pil" aria-hidden="true"></span>';
  // Tombol Google hanya dirakit bila Client ID sudah diisi admin di Pengaturan.
  // Tanpa Client ID ia DIPASTIKAN gagal, dan tombol yang dipastikan gagal lebih
  // buruk daripada tidak ada tombol — itu aturan yang dipegang halaman ini sejak
  // awal. Begitu Client ID diisi, tombolnya muncul sendiri.
  var blokGoogle = o.clientId
    ? '<div class="auth-divider"><span>atau masuk dengan</span></div>' +
      '<button type="button" class="auth-merek" id="btnGoogle" onclick="handleLoginGoogle()">' +
        ikonLogin('google') + '<span>Google Account</span></button>'
    : '';
  for (var i = 0; i < daftarPeran.length; i++) {
    peran += '<button type="button" class="auth-peran-opsi" data-peran="' + daftarPeran[i][0] +
      '" aria-pressed="' + (i === 0 ? 'true' : 'false') +
      '" onclick="pilihPeranLogin(this)">' + daftarPeran[i][1] + '</button>';
  }
  return '<div class="auth-wrap">' +
    '<div class="auth-card">' +
      '<button type="button" class="auth-kembali" id="btnKembaliSambutan" ' +
        'onclick="bukaSambutanDariLogin()" ' +
        'aria-label="Kembali ke layar perkenalan">' + ikonLogin('panah') + '</button>' +
      '<div class="auth-identity" data-app="' + esc(nama) + '" data-tagline="' +
        esc(o.tagline || '') + '" data-sekolah="' + esc(o.sekolah || '') +
        '" data-kontak="' + esc(o.kontak || '') +
        '" data-wa="' + esc(o.wa || '') +
        '" data-google="' + esc(o.clientId || '') + '">' +
        logo +
        '<h1 class="auth-app">Masuk ke <span class="auth-app-nama">' + esc(nama) + '</span></h1>' +
        '<p class="auth-tagline">Gunakan akun yang diberikan oleh sekolah Anda.</p>' +
        pilSekolah +
      '</div>' +
      (o.peringatan || '') +
      '<div class="auth-peran" role="group" aria-label="Jenis akun">' + peran + '</div>' +
      '<form id="formLogin" onsubmit="handleLogin(event)" novalidate>' +
        '<div class="field">' +
          '<label class="field-label" for="loginUser" id="labelLoginUser">NIS</label>' +
          '<div class="input-affix">' +
            '<span class="affix-lead">' + ikonLogin('orang') + '</span>' +
            '<input class="field-input has-lead" id="loginUser" type="text" ' +
              'autocomplete="username" placeholder="Contoh: 12345678" required>' +
          '</div><div class="field-error" id="errUser"></div>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label" for="loginPass">Password</label>' +
          '<div class="input-affix">' +
            '<input class="field-input" id="loginPass" type="password" ' +
              'autocomplete="current-password" placeholder="Masukkan password" required>' +
            '<button type="button" class="affix-btn" onclick="togglePassword(\'loginPass\', this)" ' +
              'aria-label="Tampilkan password">' + ikonLogin('mata') + '</button>' +
          '</div><div class="field-error" id="errPass"></div>' +
        '</div>' +
        '<div class="auth-baris">' +
          '<label class="auth-ingat" for="loginIngat">' +
            '<input type="checkbox" id="loginIngat" checked>' +
            '<span class="auth-kotak">' + ikonLogin('centang') + '</span>' +
            '<span>Ingat saya</span></label>' +
          '<button type="button" class="auth-tautan" onclick="bukaLupaPassword()">' +
            'Lupa Password?</button>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary btn-block btn-lg" id="btnLogin">Masuk</button>' +
      '</form>' +
      blokGoogle +
      '<p class="auth-kaki">Belum punya akun? ' +
        '<button type="button" class="auth-tautan" onclick="bukaHubungiAdmin()">' +
        'Hubungi Admin</button></p>' +
    '</div>' +
    '<p class="auth-footer">&copy; ' + o.tahun + ' ' + esc(nama) +
      (o.sekolah ? ' &middot; ' + esc(o.sekolah) : '') + '</p>' +
  '</div>';
}

/**
 * Halaman login untuk jalur LURING — dipakai hanya saat kerangka dari server
 * tidak dapat diambil. Strukturnya sama persis dengan buildLogin() di Kode.gs
 * sebab keduanya memanggil rakitLogin() yang sama; bedanya cuma satu pita
 * peringatan di atas pemilih peran, dan identitas yang diambil dari localStorage
 * karena server memang sedang tidak bisa ditanya.
 */
function loginCadangan() {
  let ident = {};
  try { ident = JSON.parse(Simpanan.ambil('identitas') || '{}') || {}; } catch (e) { ident = {}; }
  return rakitLogin({
    nama:    ident.appName || 'SIM PKL',
    tagline: ident.appTagline || '',
    sekolah: ident.namaSekolah || '',
    kontak:  ident.kontakAdmin || '',
    wa:      ident.waAdmin || '',
    clientId: ident.googleClientId || '',
    logoUrl: ident.logoUrl || '',
    tahun:   new Date().getFullYear(),
    peringatan:
      '<div class="alert alert-warning" style="margin-bottom:16px">' +
      '<span class="mi">cloud_off</span><div>' +
      '<strong>Server sedang tidak dapat dihubungi</strong>' +
      '<p>Silakan tetap masuk seperti biasa \u2014 aplikasi akan mencoba menyambung ulang ' +
      'secara otomatis. Bila tetap gagal, periksa koneksi internet Anda.</p></div></div>'
  });
}

// ── Perilaku halaman login ─────────────────────────────────────────────────

const LABEL_PERAN_LOGIN = {
  siswa: { label: 'NIS',      contoh: 'Contoh: 12345678' },
  guru:  { label: 'NIP',      contoh: 'Contoh: 198504122010011008' },
  admin: { label: 'Username', contoh: 'Masukkan username admin' }
};

/**
 * Pemilih peran. Sekali lagi, dengan tegas: ini TIDAK menyaring apa pun.
 * Nilainya tidak ikut terkirim ke server, dan salah pilih tidak pernah membuat
 * login ditolak — server tetap membaca peran dari akunnya sendiri. Yang berubah
 * hanya nama kolom pertama, supaya siswa tidak perlu membaca "NIS / NIP /
 * Username" dan memilah bagian mana yang miliknya.
 */
function pilihPeranLogin(tombol) {
  if (!tombol) return;
  const peran = tombol.getAttribute('data-peran') || 'siswa';
  const semua = document.querySelectorAll('.auth-peran-opsi');
  for (let i = 0; i < semua.length; i++) {
    semua[i].setAttribute('aria-pressed', semua[i] === tombol ? 'true' : 'false');
  }
  // Pil yang meluncur digeser lewat satu angka. Kalau raknya belum ada —
  // kerangka login lama yang masih tersinggah — sisanya tetap berjalan.
  const rak = document.querySelector('.auth-peran');
  const ke = ['siswa', 'guru', 'admin'].indexOf(peran);
  if (rak && ke >= 0) rak.style.setProperty('--peran-ke', String(ke));
  const t = LABEL_PERAN_LOGIN[peran] || LABEL_PERAN_LOGIN.siswa;
  const label = $('labelLoginUser'), kolom = $('loginUser');
  if (label) label.textContent = t.label;
  if (kolom) kolom.placeholder = t.contoh;
  Simpanan.simpan('peranLogin', peran);
}

/**
 * Memulihkan pilihan pengguna sesudah form login digambar.
 *
 * Sengaja hanya memulihkan PREFERENSI, tidak memasang satu pun perilaku:
 * seluruh tombolnya sudah membawa onclick sendiri dari rakitLogin(). Jadi bila
 * pemanggilan ini terlewat di salah satu jalur penggambaran — dan ada lima —
 * halamannya tetap bekerja penuh dengan nilai bawaan, bukan mati separuh.
 */
function siapkanFormLogin() {
  const kotak = $('loginIngat');
  if (kotak) kotak.checked = Simpanan.ambil('ingatSaya') !== '0';
  const peran = Simpanan.ambil('peranLogin');
  if (peran && peran !== 'siswa') {
    pilihPeranLogin(document.querySelector('.auth-peran-opsi[data-peran="' + peran + '"]'));
  }
}

/**
 * Dibaca SEBELUM tirai masuk naik. tampilkanTiraiMasuk() membuang form dari
 * DOM, jadi sesudah itu kotak centangnya sudah tidak ada lagi untuk ditanya.
 * Tanpa kotaknya — misalnya pada kerangka login lama yang masih tersinggah —
 * jawabannya "ya", yaitu perilaku aplikasi ini sebelum v6.4.
 */
function ingatSayaDipilih() {
  const kotak = $('loginIngat');
  const ingat = kotak ? !!kotak.checked : true;
  Simpanan.simpan('ingatSaya', ingat ? '1' : '0');
  return ingat;
}

/** Identitas untuk kedua dialog. DOM lebih dulu, localStorage sebagai cadangan. */
function identitasLogin() {
  const el = document.querySelector('.auth-identity');
  if (el && el.getAttribute('data-sekolah') !== null) {
    return { app:     el.getAttribute('data-app') || 'SIM PKL',
             sekolah: el.getAttribute('data-sekolah') || '',
             kontak:  el.getAttribute('data-kontak') || '',
             wa:      el.getAttribute('data-wa') || '' };
  }
  let id = {};
  try { id = JSON.parse(Simpanan.ambil('identitas') || '{}') || {}; } catch (e) { id = {}; }
  return { app: id.appName || 'SIM PKL', sekolah: id.namaSekolah || '',
           kontak: id.kontakAdmin || '', wa: id.waAdmin || '' };
}

/**
 * Menormalkan nomor WhatsApp menjadi bentuk yang diterima wa.me.
 *
 * Admin akan mengetiknya dengan cara apa pun — 0812-3456-7890,
 * +62 812 3456 7890, (0812) 34567890 — dan ketiganya harus sampai ke
 * percakapan yang sama. Yang bukan angka dibuang, awalan 0 dan 8 diangkat ke
 * 62, dan hasilnya diperiksa panjangnya.
 *
 * Mengembalikan '' bila sisanya tidak masuk akal sebagai nomor. Itu disengaja:
 * lebih baik tombolnya TIDAK MUNCUL daripada muncul lalu mengantar siswa ke
 * percakapan yang tidak ada — persis jenis tombol mati yang dihindari halaman
 * ini sejak awal.
 */
function nomorWa(teks) {
  let d = String(teks == null ? '' : teks).replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.indexOf('62') === 0) { /* sudah internasional */ }
  else if (d.indexOf('0') === 0) d = '62' + d.slice(1);
  else if (d.indexOf('8') === 0) d = '62' + d;
  return /^62[0-9]{8,13}$/.test(d) ? d : '';
}

/** wa.me membuka aplikasi WhatsApp bila terpasang, dan WhatsApp Web bila tidak. */
function tautanWa(nomor, pesan) {
  return 'https://wa.me/' + nomor + '?text=' + encodeURIComponent(pesan);
}

/**
 * Blok kontak di kaki kedua dialog: label kontak (bila diisi) dan tombol chat
 * WhatsApp (bila nomornya sah).
 *
 * Pesannya dibuat SETENGAH JADI, dengan baris kosong untuk diisi siswa. Itu
 * bukan hiasan: pesan "Halo, saya lupa password" tanpa nama dan NIS memaksa
 * Pokja PKL membalas menanyakan keduanya, dan satu percakapan yang seharusnya
 * selesai sekali jalan menjadi tiga.
 */
function blokKontakLogin(id, pesan) {
  let out = '';
  if (id.kontak) out += '<div class="auth-kontak"><b>Kontak</b>' + esc(id.kontak) + '</div>';
  const no = nomorWa(id.wa);
  if (no) {
    out += '<a class="auth-merek auth-wa" href="' + esc(tautanWa(no, pesan)) + '" ' +
      'target="_blank" rel="noopener noreferrer">' + ikonLogin('whatsapp') +
      '<span>Chat WhatsApp Pokja PKL</span></a>';
  }
  return out;
}

/**
 * Panah kembali → layar perkenalan.
 *
 * NOL permintaan jaringan, dan itu keharusan, bukan kebetulan: pasangSambutan()
 * menggambar seluruhnya dari kode yang sudah termuat, dan identitasnya dibaca
 * dari DOM halaman login yang sedang tampil di belakangnya. Menekan panah ini
 * terasa seketika karena memang seketika — tidak ada satu pun perjalanan ke
 * server di dalamnya.
 *
 * Penjaga typeof-nya bukan basa-basi. rakitLogin() juga dipakai jalur luring,
 * yang justru berjalan ketika ada yang tidak beres dengan pemuatan berkas.
 */
function bukaSambutanDariLogin() {
  if (typeof pasangSambutan !== 'function') return;
  pasangSambutan();
}

/**
 * "Lupa Password?".
 *
 * Aplikasi ini TIDAK punya pengaturan ulang password mandiri, dan dialog ini
 * mengatakannya apa adanya alih-alih berpura-pura mengirim surel yang tidak
 * pernah berangkat. resetPassword() di server hanya dapat dipanggil admin dari
 * tabel data, jadi jalan satu-satunya bagi siswa memang menghubungi Pokja PKL.
 */
function bukaLupaPassword() {
  const id = identitasLogin();
  bukaModal('Lupa Password',
    '<div class="auth-dialog">' +
    '<p>Password akun PKL hanya dapat diatur ulang oleh <b>Pokja PKL</b> atau admin ' +
    (id.sekolah ? esc(id.sekolah) : 'sekolah Anda') + '. Aplikasi ini sengaja tidak ' +
    'menyediakan pengaturan ulang sendiri.</p>' +
    '<p>Hubungi mereka dengan menyebut NIS/NIP Anda. Password baru akan diberikan ' +
    'langsung, dan sebaiknya segera Anda ganti lewat menu <b>Profil Saya</b> setelah ' +
    'berhasil masuk.</p>' +
    blokKontakLogin(id,
      'Halo Pokja PKL' + (id.sekolah ? ' ' + id.sekolah : '') +
      ', saya lupa password akun ' + id.app + '.\n\nNama: \nNIS/NIP: \n\n' +
      'Mohon dibantu pengaturan ulang password saya. Terima kasih.') +
    '</div>',
    [{ label: 'Mengerti', kelas: 'btn-primary' }]);
}

/** "Belum punya akun? Hubungi Admin". */
function bukaHubungiAdmin() {
  const id = identitasLogin();
  bukaModal('Belum punya akun',
    '<div class="auth-dialog">' +
    '<p>Akun PKL tidak dapat didaftarkan sendiri. Seluruh akun siswa dan guru ' +
    'pembimbing dibuatkan oleh <b>Pokja PKL</b>' +
    (id.sekolah ? ' ' + esc(id.sekolah) : '') + ' dari data sekolah.</p>' +
    '<p>Bila Anda sudah terdaftar sebagai peserta PKL tetapi belum menerima akun, ' +
    'hubungi Pokja PKL atau guru pembimbing Anda.</p>' +
    blokKontakLogin(id,
      'Halo Pokja PKL' + (id.sekolah ? ' ' + id.sekolah : '') +
      ', saya belum menerima akun ' + id.app + '.\n\nNama: \nKelas/Jurusan: \n\n' +
      'Mohon dibantu pendaftaran akun saya. Terima kasih.') +
    '</div>',
    [{ label: 'Mengerti', kelas: 'btn-primary' }]);
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
siapkanFormLogin();
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
siapkanFormLogin();
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
const judul = $('topbarTitle');
if (judul) judul.textContent = diBeranda ? 'Beranda' : (JUDUL_HALAMAN[halaman] || 'Halaman');
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
// ── Menyembunyikan sidebar di layar lebar (v7.6) ───────────────────────────
//
// Berbeda dari toggleDrawer() yang melayani ponsel: di sana sidebar memang
// selalu tersembunyi dan tombolnya membuka laci sesaat. Di layar lebar sidebar
// selalu tampak, dan yang diminta adalah MELIPATNYA supaya isi halaman —
// tabel lebar, grafik, kalender shift — mendapat 280 piksel tambahan.
//
// Pilihannya disimpan supaya tidak perlu diulang setiap kali aplikasi dibuka.
const KUNCI_SIDEBAR = 'sidebarTutup';
function toggleSidebar() {
// Gerakannya baru dihidupkan di sini — bukan di CSS secara permanen. Bila
// transisinya selalu melekat, isi halaman ikut meluncur dari tepi kiri setiap
// kali pengguna masuk, sebab saat itulah kelas .with-sidebar dipasang.
document.body.classList.add('sidebar-animasi');
pasangSidebar(!document.body.classList.contains('sidebar-tutup'), true);
}
/**
 * @param {boolean} tutup
 * @param {boolean} [simpan] Bila benar, pilihannya diingat untuk pembukaan berikutnya.
 */
function pasangSidebar(tutup, simpan) {
document.body.classList.toggle('sidebar-tutup', !!tutup);
// Label menu dipindah ke tooltip HANYA saat relnya menyempit. Memasangnya
// permanen berarti balon penjelasan muncul di atas teks yang sudah terbaca
// jelas di sebelahnya — penjelasan yang menjelaskan dirinya sendiri.
$$('#sidebarNav .nav-link, .sidebar-foot .nav-link').forEach(function (el) {
const label = el.querySelector('.nav-label');
if (!label) return;
if (tutup) {
el.setAttribute('data-tip', label.textContent.trim());
el.setAttribute('data-tip-arah', 'kanan');
} else {
el.removeAttribute('data-tip');
el.removeAttribute('data-tip-arah');
}
});
const merek = $$('.sidebar-brand')[0];
if (merek) {
const nama = $('brandName');
if (tutup && nama) { merek.setAttribute('data-tip', nama.textContent.trim()); merek.setAttribute('data-tip-arah', 'kanan'); }
else { merek.removeAttribute('data-tip'); merek.removeAttribute('data-tip-arah'); }
}
const btn = $('btnSidebar');
if (btn) {
// aria-expanded menerangkan SIDEBAR-nya, bukan tombolnya — jadi nilainya
// kebalikan dari "tutup". Tertukar sedikit saja, pembaca layar mengumumkan
// keadaan yang persis berlawanan dengan yang terlihat.
btn.setAttribute('aria-expanded', String(!tutup));
btn.setAttribute('aria-label', tutup ? 'Tampilkan menu samping' : 'Sembunyikan menu samping');
}
if (simpan) { try { Simpanan.simpan(KUNCI_SIDEBAR, tutup ? '1' : '0'); } catch (e) {} }
}
function pulihkanSidebar() {
let tutup = false;
try { tutup = Simpanan.ambil(KUNCI_SIDEBAR) === '1'; } catch (e) {}
pasangSidebar(tutup, false);
pasangGulirHalus();
}
/**
 * Menampilkan bilah gulir sidebar hanya SELAMA digulir.
 *
 * Warna bilahnya diatur CSS lewat kelas .menggulir; di sini hanya kelasnya yang
 * dipasang lalu dilepas sesudah sesaat diam. Tempatnya sudah dipesan permanen
 * oleh scrollbar-width:thin, jadi memunculkannya tidak menggeser apa pun.
 */
const GULIR_PEMILIH = '.gulir-halus,.sidebar-nav,.table-wrap,.js-gulir,.ds-riwayat,' +
'.rp-jejak,.modal-body,.filter-panel-isi,.pilih-box,.cmdk-results';
const GULIR_PEWAKTU = new WeakMap();
/**
 * Satu pendengar untuk SELURUH wadah gulir, dipasang sekali di dokumen.
 *
 * Peristiwa scroll tidak menggelembung, jadi ia ditangkap pada fase CAPTURE —
 * hanya di sanalah dokumen bisa melihat gulungan yang terjadi di dalam sebuah
 * anaknya. Cara ini juga melayani tabel yang baru digambar belakangan tanpa
 * perlu memasang pendengar baru setiap kali daftar dimuat ulang.
 */
function pasangGulirHalus() {
if (document.body.dataset.gulirTerpasang) return;
document.body.dataset.gulirTerpasang = '1';
document.addEventListener('scroll', function (e) {
const el = e.target;
if (!el || !el.classList || typeof el.matches !== 'function') return;
if (!el.matches(GULIR_PEMILIH)) return;
el.classList.add('menggulir');
clearTimeout(GULIR_PEWAKTU.get(el));
GULIR_PEWAKTU.set(el, setTimeout(function () { el.classList.remove('menggulir'); }, 900));
}, { capture: true, passive: true });
}
function tutupDrawer() {
const sb = $('sidebar'), scrim = $('drawerScrim'), btn = $('btnDrawer');
if (sb) sb.classList.remove('laci-buka');
if (scrim) scrim.hidden = true;
if (btn) btn.setAttribute('aria-expanded', 'false');
document.body.style.overflow = '';
}
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
// Halaman yang tidak punya butir menunya sendiri, tetapi tetap "milik" sebuah
// menu. Tanpa peta ini, membuka detail seorang siswa memadamkan seluruh sorotan
// di sidebar — dan pengguna kehilangan jejak di mana ia sebenarnya berada.
const MENU_INDUK = { 'detail-siswa': 'monitoring' };
function tandaiMenuAktif(halaman) {
const sorot = MENU_INDUK[halaman] || halaman;
$$('.nav-link[data-page]').forEach(b =>
b.classList.toggle('active', b.dataset.page === sorot));
$$('.bn-item[data-page]').forEach(b =>
b.classList.toggle('active', b.dataset.page === sorot));
}
function renderNavigation() {
// Menggambar ulang daftar menu membuang seluruh atribut data-tip yang
// dipasang mode rel, jadi keadaannya disetel ulang di ujung fungsi ini —
// bukan diserahkan pada urutan pemanggilan di tempat lain.
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
// Urutan bilah bawah ditentukan bottomUrut, BUKAN urutan menu di sidebar.
// Keduanya memang tidak harus sama: sidebar disusun menurut alur kerja,
// sedangkan bilah bawah menurut seberapa sering sebuah menu disentuh di
// ponsel. Tanpa pemisahan ini, menata ulang bilah bawah berarti ikut menata
// ulang sidebar — dua hal berbeda yang kebetulan memakai satu daftar.
const utama = menu.filter(m => m.bottom)
.sort((a, b) => (a.bottomUrut || 99) - (b.bottomUrut || 99))
.slice(0, 5);
$('bottomNav').innerHTML = utama.map(m => `
<button class="bn-item" data-page="${m.id}"
${m.bottom === 'Lainnya' ? '' : `ontouchstart="pramuatHalaman('${m.id}')"`}
onclick="${m.bottom === 'Lainnya' ? 'bukaMenuLainnya()' : `navigateTo('${m.id}')`}">
<span class="mi">${m.ikon}</span><span>${esc(m.bottom)}</span>
</button>`).join('');
pasangSidebar(document.body.classList.contains('sidebar-tutup'), false);
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
// Hasil pencarian yang membawa id siswa membuka detail siswanya langsung.
// Sebelum v7.5 ia hanya melempar ke daftar, dan penggunanya harus mencari
// sekali lagi nama yang barusan ia ketik.
if (h.id && h.aksi === 'monitoring' && typeof bukaHalamanSiswa === 'function') {
bukaHalamanSiswa(h.id);
return;
}
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
// Ikonnya bisa berupa glif font (form lain) atau SVG sebaris (halaman login).
const glif = tombol.querySelector('.mi');
if (glif) glif.textContent = sembunyi ? 'visibility_off' : 'visibility';
else tombol.innerHTML = ikonLogin(sembunyi ? 'mataTutup' : 'mata');
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
// Dibaca SEKARANG, selagi formnya masih ada: tampilkanTiraiMasuk() di bawah
// membuang form dari DOM berikut kotak centangnya.
const ingat = ingatSayaDipilih();
// Splash dinaikkan SEBELUM permintaan berangkat, bukan sesudahnya.
//
// Dahulu urutannya terbalik: tombol berputar "Memeriksa…" selama masukKilat
// berjalan — bagian yang memakan 1–3 detik — dan splash baru muncul sesudah
// jawabannya tiba, untuk menemani sisa pekerjaan yang justru sudah cepat.
// Akibatnya persis kebalikan dari maksudnya: yang lama diperlihatkan sebagai
// form yang menggantung, yang cepat dihias splash yang berkelebat.
//
// Sekarang splash menutupi SELURUH proses masuk. Ia tampil lebih lama tanpa satu
// milidetik pun ditambahkan — yang berubah hanya bagian mana yang ditemaninya.
tampilkanTiraiMasuk();
try {
const res = await panggil('masukKilat', user, pass);
if (!res.success) { await kembalikanFormLogin(user, res.message); return; }
await mulaiSesi(res.data.token, res.data, ingat);
} catch (err) {
await kembalikanFormLogin(user, err.message);
}
}

/**
 * Mengembalikan form login sesudah percobaan yang gagal.
 *
 * Karena form sudah dibuang dari DOM saat splash naik, kolom dan kotak galatnya
 * tidak lagi ada — pesannya harus dipasang pada form yang baru digambar. Form
 * itu digambar LEBIH DULU, di balik splash, baru splash-nya diredupkan; jadi
 * yang terlihat pengguna adalah form beserta pesan galatnya sekaligus, bukan
 * form kosong yang menyusul pesan sepersekian detik kemudian.
 *
 * NIS/NIP yang sudah diketik dikembalikan; hanya password yang dikosongkan.
 */
async function kembalikanFormLogin(user, pesan) {
await navigateTo('login');
sembunyikanSplash();
const kolomUser = $('loginUser'), kolomPass = $('loginPass'), kotakGalat = $('errPass');
if (kolomUser) kolomUser.value = user || '';
if (kotakGalat) kotakGalat.textContent = pesan || 'Gagal masuk.';
else toast(pesan || 'Gagal masuk.', 'error', 6000);
if (kolomPass) { kolomPass.value = ''; kolomPass.classList.add('invalid'); kolomPass.focus(); }
}
/**
 * Memuat pustaka Google Identity Services — SATU KALI, dan hanya saat diperlukan.
 *
 * Halaman login ini dirancang tanpa satu pun permintaan jaringan saat dibuka.
 * Menaruh gsi/client di <head> akan melanggarnya untuk SETIAP pengunjung,
 * padahal yang menekan tombol Google hanya sebagian kecil. Jadi pustakanya baru
 * diunduh pada klik pertama: gambaran pertama tetap bersih, dan yang menunggu
 * sepersekian detik hanyalah orang yang memang memintanya.
 */
function muatGis() {
if (window.__gisSiap) return window.__gisSiap;
window.__gisSiap = new Promise(function (selesai, gagal) {
if (window.google && google.accounts && google.accounts.oauth2) return selesai();
const s = document.createElement('script');
s.src = 'https://accounts.google.com/gsi/client';
s.async = true; s.defer = true;
s.onload = function () {
if (window.google && google.accounts && google.accounts.oauth2) selesai();
else gagal(new Error('Pustaka Google termuat tetapi tidak lengkap.'));
};
s.onerror = function () {
// Sebab paling sering: jaringan sekolah memblokir accounts.google.com.
gagal(new Error('Pustaka Google tidak dapat dimuat. Periksa koneksi Anda, ' +
'atau masuk memakai NIS/NIP dan password.'));
};
document.head.appendChild(s);
});
return window.__gisSiap;
}

/**
 * Masuk dengan Akun Google.
 *
 * URUTANNYA BEDA dengan handleLogin, dan itu disengaja. Bagian yang lama di
 * sini adalah pengguna MEMILIH AKUN di jendela Google — itu interaksi, bukan
 * penantian, dan menutupinya dengan tirai justru menyembunyikan jendela yang
 * harus ia lihat. Tirai baru naik sesudah token di tangan, menemani satu-satunya
 * bagian yang benar-benar menunggu: perjalanan ke server.
 *
 * Token yang didapat di sini TIDAK dipercaya klien sedikit pun — ia hanya
 * diteruskan. Yang memutuskan sah atau tidak adalah doLoginGoogle() di server,
 * yang memverifikasinya ke Google dan memeriksa bahwa `aud`-nya memang milik
 * aplikasi ini.
 */
async function handleLoginGoogle() {
const kepala = document.querySelector('.auth-identity');
const clientId = kepala ? (kepala.getAttribute('data-google') || '') : '';
if (!clientId) {
toast('Login Google belum disiapkan admin.', 'warning', 5000);
return;
}
const ingat = ingatSayaDipilih();
const tombol = $('btnGoogle');
if (tombol) { tombol.disabled = true; tombol.setAttribute('aria-busy', 'true'); }
let tiraiNaik = false;
try {
await muatGis();
const token = await new Promise(function (selesai, gagal) {
const klien = google.accounts.oauth2.initTokenClient({
client_id: clientId,
scope: 'openid email profile',
callback: function (r) {
if (r && r.access_token) selesai(r.access_token);
else gagal(new Error('Google tidak memberikan izin yang diperlukan.'));
},
error_callback: function (e) {
const tipe = e && e.type;
gagal(new Error(tipe === 'popup_closed'
? 'Jendela Google ditutup sebelum selesai.'
: tipe === 'popup_failed_to_open'
? 'Jendela Google diblokir peramban. Izinkan pop-up untuk situs ini.'
: 'Google menolak permintaan masuk.'));
}
});
klien.requestAccessToken();
});
if (tombol) { tombol.disabled = false; tombol.removeAttribute('aria-busy'); }
tampilkanTiraiMasuk();
tiraiNaik = true;
const res = await panggil('doLoginGoogle', token);
if (!res.success) { await kembalikanFormLogin('', res.message); return; }
await mulaiSesi(res.data.token, null, ingat);
} catch (err) {
if (tombol) { tombol.disabled = false; tombol.removeAttribute('aria-busy'); }
// Bila tirai belum naik, form login masih utuh di layar — cukup toast, tidak
// perlu menggambar ulang halaman yang tidak ke mana-mana.
if (tiraiNaik) await kembalikanFormLogin('', err.message);
else toast(err.message || 'Gagal masuk dengan Google.', 'error', 6000);
}
}
// Layar peralihan saat masuk. Bukan sekadar hiasan: sebelumnya form login tetap
// terpampang di balik lapisan gelap "Menyiapkan aplikasi…" sampai dashboard siap,
// sehingga pengguna melihat kolom NIS dan password-nya sendiri masih di layar
// dan mengira loginnya gagal. Form dibuang lebih dulu, baru kita menunggu.
function tampilkanTiraiMasuk() {
// Form login tetap dibuang dari DOM, bukan sekadar ditutupi: selama peredupan
// splash nanti, apa pun yang tersisa di baliknya akan terlihat sekilas.
const wadah = $('app-container');
if (wadah) { wadah.classList.add('plain'); wadah.innerHTML = ''; }
tampilkanSplash();
}
async function mulaiSesi(token, awal, ingat) {
SinggahData.bersihkan();
AppState.sessionToken = token;
// "Ingat saya" mengendalikan apakah token DITULIS ke perangkat — bukan berapa
// lama ia sah. Masa berlakunya 6 jam, ditentukan SESSION_TTL di server, dan
// tidak disentuh dari sini sama sekali.
//
// Tanpa centang, token hanya hidup di memori: menutup tab berarti harus masuk
// lagi. Itu perlindungan yang nyata di komputer lab sekolah yang dipakai
// bergantian, tempat perangkatnya memang bukan milik siapa pun. Nilai
// `undefined` — dari pemanggil lama — tetap berarti "ingat", supaya tidak ada
// pengguna yang tiba-tiba terlempar keluar hanya karena aplikasinya diperbarui.
if (ingat === false) Simpanan.hapus('sesi');
else Simpanan.simpan('sesi', token);
pantauAktivitas();
tampilkanTiraiMasuk();
try {
await muatBootstrap(awal);
await navigateTo('beranda');
// Baru sesudah dashboard benar-benar tergambar. Menutupnya lebih awal
// memperlihatkan wadah kosong sekejap — persis kesan yang ingin dihindari.
sembunyikanSplash();
toast('Selamat datang, ' + AppState.user.nama + '!', 'success');
} catch (err) {
sembunyikanSplash();
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
const identitas = {
appName: c.appName || 'SIM PKL', appTagline: c.appTagline || '',
// appDesc ikut disimpan sejak v7.5: subjudul inilah yang dibaca splash pada
// pembukaan berikutnya, sebelum satu pun permintaan server berangkat.
appDesc: c.appDesc || '',
namaSekolah: c.namaSekolah || '', logoUrl: c.logoUrl || '',
kontakAdmin: c.kontakAdmin || '', waAdmin: c.waAdmin || '',
googleClientId: c.googleClientId || ''
};
try { Simpanan.simpan('identitas', JSON.stringify(identitas)); } catch (e) {}
// Masuk pertama kali di perangkat ini: localStorage masih kosong saat splash
// tergambar, jadi identitasnya disusulkan sekarang — sebelum splash meredup.
isiSplash(identitas);
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
// Sisa dari masa ketika proxy masih berupa jalur cadangan. Sejak v4.4 penanda
// itu tidak lagi dibaca siapa pun; membuangnya sekali menghindarkan kebingungan
// bagi siapa saja yang membuka localStorage untuk menelusuri masalah.
try { localStorage.removeItem('proxySampai'); } catch (e) {}
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
// Halaman login tidak punya sidebar sama sekali, jadi lipatannya selalu
// dilepas saat keluar — kalau tidak, kelasnya tertinggal di <body> dan
// mengubah tata letak halaman yang tidak ada sangkut pautnya.
if (masuk) pulihkanSidebar(); else pasangSidebar(false, false);
// Dipasang di kedua jalur: modal dan panel di halaman login pun punya
// wadah yang bisa digulir.
pasangGulirHalus();
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

// ── Sesi berakhir karena tidak ada aktivitas ───────────────────────────────
//
// APA YANG MEMBUAT INI KEAMANAN, BUKAN SEKADAR TAMPILAN.
//
// Pewaktu di klien saja hanya menghias: token yang "berakhir" tetap sah di
// server, dan siapa pun yang sempat menyalinnya masih bisa memakainya. Karena
// itu ketika waktunya habis, token DICABUT di server lewat doLogout() — yang
// menghapus singgahan sesi DAN barisnya di sheet Sesi. Sesudah itu token
// tersebut mati di mana pun ia berada.
//
// Servernya pun tidak menggantungkan diri pada klien: validateSession()
// menegakkan jendela geser 60 menit sendiri, dihitung dari permintaan
// TERAKHIR. Jadi ada dua lapis yang saling menutupi — klien yang tahu soal
// gerakan tetikus dan papan ketik, server yang tidak bisa dibohongi.
//
// Yang TIDAK ditutup oleh keduanya, dan sebaiknya dikatakan apa adanya:
// seseorang yang sudah menyalin token lalu tabnya ditutup paksa sebelum
// pewaktu sempat berjalan. Untuk itulah pemeriksaan saat boot di app6.js ada,
// dan di atas semuanya masih ada batas mutlak enam jam dari server.
const SESI_IDLE_MS = 60 * 60 * 1000;
const KUNCI_AKTIF = 'aktifPada';
let SESI_HABIS_DITAMPILKAN = false;

/**
 * Mencatat bahwa pengguna baru saja melakukan sesuatu.
 *
 * Ditulis paling sering sekali per 30 detik. Menulis di setiap gerakan berarti
 * ratusan penulisan localStorage per menit hanya untuk menggeser angka yang
 * dibandingkan dengan ambang 60 menit — ketelitian yang tidak ada gunanya
 * dengan biaya yang nyata.
 */
function catatAktivitas() {
const t = Date.now();
if (t - (AppState.__aktifTerakhir || 0) < 30000) return;
AppState.__aktifTerakhir = t;
Simpanan.simpan(KUNCI_AKTIF, String(t));
}

/**
 * Yang dihitung sebagai aktivitas adalah perbuatan PENGGUNA, bukan kesibukan
 * aplikasi. Pewaktu jam, penyegaran latar, dan animasi sengaja tidak masuk
 * daftar ini: kalau mereka ikut dihitung, sesi tidak akan pernah berakhir
 * walaupun tidak ada seorang pun di depan layar.
 */
function pantauAktivitas() {
if (AppState.__pantauAktif) return;
AppState.__pantauAktif = true;
catatAktivitas();
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (nama) {
document.addEventListener(nama, catatAktivitas, { passive: true });
});
// Ponsel membekukan pewaktu pada tab yang tersembunyi. Tanpa pemeriksaan saat
// tab kembali terlihat, aplikasi yang ditinggal semalam di latar belakang baru
// menyadari sesinya berakhir satu menit SETELAH dibuka lagi.
document.addEventListener('visibilitychange', function () {
if (document.visibilityState === 'visible') periksaSesiIdle();
});
AppState.__pewaktuIdle = setInterval(periksaSesiIdle, 60000);
}

function jedaSejakAktif() {
const t = Number(Simpanan.ambil(KUNCI_AKTIF) || 0);
return t ? (Date.now() - t) : 0;
}

function periksaSesiIdle() {
if (!AppState.sessionToken || SESI_HABIS_DITAMPILKAN) return;
if (!Simpanan.ambil(KUNCI_AKTIF)) { catatAktivitas(); return; }
if (jedaSejakAktif() > SESI_IDLE_MS) akhiriSesiIdle();
}

function akhiriSesiIdle() {
if (SESI_HABIS_DITAMPILKAN) return;
SESI_HABIS_DITAMPILKAN = true;
const token = AppState.sessionToken;
// Dicabut lebih dulu, dan tidak ditunggu: layarnya harus bersih SEKARANG,
// bukan satu sampai tiga detik lagi ketika server selesai menjawab.
if (token) panggil('doLogout', token).catch(function () {});
if (AppState.__pewaktuIdle) { clearInterval(AppState.__pewaktuIdle); AppState.__pewaktuIdle = null; }
Simpanan.hapus(KUNCI_AKTIF);
keluarPaksa();
tampilkanSesiBerakhir();
}

/** Jam pasir geometris, sebangun dengan ilustrasi lain di aplikasi ini. */
function ilustrasiSesiHabis() {
return '<svg viewBox="0 0 132 104" role="img" aria-label="Sesi berakhir">' +
'<rect x="6" y="20" width="34" height="24" rx="6" fill="var(--il-kartu)" ' +
'stroke="var(--il-kartu-tepi)" stroke-width="1.5"/>' +
'<rect x="13" y="28" width="20" height="3.4" rx="1.7" fill="var(--il-kartu-tepi)"/>' +
'<rect x="13" y="35" width="13" height="3.4" rx="1.7" fill="var(--il-kartu-tepi)"/>' +
'<rect x="92" y="58" width="34" height="24" rx="6" fill="var(--il-kartu)" ' +
'stroke="var(--il-kartu-tepi)" stroke-width="1.5"/>' +
'<rect x="99" y="66" width="20" height="3.4" rx="1.7" fill="var(--il-kartu-tepi)"/>' +
'<rect x="99" y="73" width="13" height="3.4" rx="1.7" fill="var(--il-kartu-tepi)"/>' +
'<circle cx="66" cy="52" r="33" fill="var(--il-halo)" opacity=".55"/>' +
'<circle cx="66" cy="52" r="26" fill="var(--il-kartu)" stroke="var(--primary)" stroke-width="3"/>' +
'<path d="M66 36v17l11 7" fill="none" stroke="var(--primary)" stroke-width="3.4" ' +
'stroke-linecap="round" stroke-linejoin="round"/>' +
'<circle cx="66" cy="52" r="2.6" fill="var(--primary)"/></svg>';
}

/**
 * Dialognya sengaja hanya punya SATU tombol.
 *
 * Rancangan yang dilampirkan memuat dua: "Masuk Kembali" dan "Kembali ke
 * Beranda". Tetapi begitu sesi berakhir, Beranda tidak bisa dibuka tanpa masuk
 * lagi — kedua tombol itu akan bermuara ke tempat yang sama persis. Dua tombol
 * yang mengerjakan satu hal adalah tombol mati yang menyamar, dan halaman ini
 * memegang aturan yang sama dengan halaman login: lebih baik tidak ada tombol
 * daripada tombol yang tidak ke mana-mana.
 */
function tampilkanSesiBerakhir() {
if (document.getElementById('sesiHabis')) return;
const bungkus = document.createElement('div');
bungkus.innerHTML =
'<div class="sesi-habis" id="sesiHabis" role="alertdialog" aria-modal="true" ' +
'aria-labelledby="sesiHabisJudul" aria-describedby="sesiHabisTeks">' +
'<div class="sesi-habis-kartu">' +
'<div class="sesi-habis-art">' + ilustrasiSesiHabis() + '</div>' +
'<h2 id="sesiHabisJudul">Sesi Berakhir</h2>' +
'<p id="sesiHabisTeks">Untuk keamanan akun Anda, sesi telah berakhir karena ' +
'tidak ada aktivitas selama 60 menit. Silakan masuk kembali untuk melanjutkan.</p>' +
'<button class="btn btn-primary btn-block btn-lg" id="sesiHabisMasuk" ' +
'onclick="tutupSesiBerakhir()">Masuk Kembali</button>' +
'</div></div>';
const layar = bungkus.firstChild;
document.body.appendChild(layar);
const tombol = document.getElementById('sesiHabisMasuk');
if (tombol && tombol.focus) tombol.focus();
}

function tutupSesiBerakhir() {
const layar = document.getElementById('sesiHabis');
if (layar && layar.parentNode) layar.parentNode.removeChild(layar);
SESI_HABIS_DITAMPILKAN = false;
const kolom = document.getElementById('loginUser');
if (kolom && kolom.focus) kolom.focus();
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
  // Balon menu rel muncul di SAMPING KANAN, bukan di atas: butir menu tersusun
  // menumpuk rapat, jadi balon yang muncul di atas justru menutupi butir
  // tetangganya — persis butir yang sedang dibandingkan penggunanya.
  if (el.getAttribute('data-tip-arah') === 'kanan') {
    balon.style.left = Math.round(Math.min(r.right + sela, window.innerWidth - b.width - 8)) + 'px';
    balon.style.top = Math.round(Math.max(8,
      Math.min(r.top + r.height / 2 - b.height / 2, window.innerHeight - b.height - 8))) + 'px';
    requestAnimationFrame(() => balon.classList.add('tampil'));
    return;
  }
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
    // Token sesi tidak ikut menentukan identitas data, jadi ia dibuang —
    // tetapi hanya bila argumen pertamanya MEMANG token sesi.
    //
    // Versi lama menganggap argumen pertama SELALU token. Anggapan itu benar
    // untuk setiap pemanggil panggilCepat() hari ini, tetapi anggapan yang sama
    // di kunciTerbang() sudah pernah menukar halaman antar-menu: getPageContent
    // berargumen pertama nama halaman, dan membuangnya membuat semua halaman
    // berbagi satu kunci. Perangkap yang sama tidak dibiarkan menunggu di sini.
    let daftar = args || [];
    if (daftar.length && AppState.sessionToken && daftar[0] === AppState.sessionToken) {
      daftar = daftar.slice(1);
    }
    let ekor = '';
    try { ekor = JSON.stringify(daftar); } catch (e) { ekor = ''; }
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

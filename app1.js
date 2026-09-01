function sembunyikanSplash() {
const el = document.getElementById('bootLoader');
if (el) el.hidden = true;
}
function splashMasihTampil() {
const el = document.getElementById('bootLoader');
return !!(el && !el.hidden);
}
function tampilkanGalatFatal(pesan) {
sembunyikanSplash();
try { tampilkanKerangkaAplikasi(false); } catch (e) {}
const wadah = document.getElementById('app-container');
if (!wadah) return;
const aman = String(pesan || 'Terjadi kesalahan tak terduga.')
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blokTermuat = (typeof window.__blok === 'number') ? window.__blok : 0;
wadah.innerHTML =
'<div class="auth-wrap"><div class="auth-card">' +
'<div class="alert alert-error" style="margin-bottom:16px">' +
'<span class="mi">error</span>' +
'<div><strong>Aplikasi gagal dimuat</strong><p>' + aman + '</p></div></div>' +
'<div class="info-tonal" style="margin-bottom:16px"><span class="mi">bug_report</span>' +
'<div><div class="info-eyebrow">Diagnosis</div>' +
'<div class="info-strong">Blok kode termuat: ' + blokTermuat + ' dari 6</div>' +
'<div class="info-sub">' + (blokTermuat === 6
? 'Seluruh kode termuat — galat berasal dari sumber lain.'
: 'Blok ke-' + (blokTermuat + 1) + ' gagal diurai. Sebutkan angka ini saat melapor.') +
'</div></div></div>' +
'<p class="field-help" style="margin-bottom:16px">Pastikan berkas <code>Index</code>, ' +
'<code>Stylesheet</code>, dan <code>JavaScript</code> tersalin lengkap di Apps Script, ' +
'lalu deploy versi baru. Detail teknis tersedia di Console browser.</p>' +
'<button class="btn btn-primary btn-block" onclick="mulaiAplikasi()">' +
'<span class="mi">refresh</span> Coba Lagi</button>' +
'</div></div>';
}
window.addEventListener('error', e => {
console.error('Galat tak tertangkap:', e.error || e.message);
if (window.__pulihSedangJalan) return;
if (splashMasihTampil()) {
tampilkanGalatFatal((e.message || 'Terjadi kesalahan tak terduga.') +
' Periksa Console browser untuk detailnya.');
}
});
window.addEventListener('unhandledrejection', e => {
console.error('Promise gagal tanpa penanganan:', e.reason);
if (window.__pulihSedangJalan) return;
if (splashMasihTampil()) {
tampilkanGalatFatal((e.reason && e.reason.message) || 'Gagal menghubungi server.');
}
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
function memuatInline(pesan) {
return `<div class="muat-inline"><span class="muat-spin"></span>
<span>${esc(pesan || 'Memuat data…')}</span></div>`;
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
if (!iso) return '-';
const d = new Date(String(iso) + 'T00:00:00');
if (isNaN(d)) return esc(iso);
const h = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
return `${h[d.getDay()]}, ${d.getDate()} ${b[d.getMonth()]} ${d.getFullYear()}`;
}
function jamTampil(nilai) {
const s = String(nilai == null ? '' : nilai).trim();
if (!s) return '-';
const m = s.match(/([0-9]{1,2}):([0-9]{2})/);
return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : s;
}
function panggilCepat(namaFungsi, ...args) {
const awal = AppState.dataAwal;
if (awal && Object.prototype.hasOwnProperty.call(awal, namaFungsi)) {
const hasil = awal[namaFungsi];
delete awal[namaFungsi];
return Promise.resolve(hasil);
}
return panggil(namaFungsi, ...args);
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
function panggil(namaFungsi, ...args) {
const diam = (namaFungsi === 'getPageContent' && args[1] && args[1].__pramuat);
if (!diam) mulaiSibukGlobal();
const tuntas = () => { if (!diam) selesaiSibukGlobal(); };
if (!window.SIMPKL_API) {
tuntas();
return Promise.reject(new Error('Alamat API belum disetel. Periksa window.SIMPKL_API di index.html.'));
}
return fetch(window.SIMPKL_API, {
method: 'POST',
credentials: 'omit',
headers: { 'Content-Type': 'text/plain;charset=utf-8' },
body: JSON.stringify({ fn: namaFungsi, args: args })
})
.then(r => {
if (!r.ok) throw new Error('Server menjawab kode ' + r.status + '.');
return r.json();
})
.then(paket => {
tuntas();
if (paket && paket.__galat) throw new Error(paket.__galat);
return paket ? paket.hasil : null;
}, err => {
tuntas();
throw new Error(err && err.message ? err.message : 'Gagal menghubungi server.');
});
}
const SLASH2 = '/' + '/';
const HTTPS = 'https:' + SLASH2;
const CDN = {
chart: [
HTTPS + 'cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js',
HTTPS + 'cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
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
function warnaGrafik() {
const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
return {
primary: gelap ? '#87D0F4' : '#1C7293',
sukses:  gelap ? '#7BD5A6' : '#2D6A4F',
warning: gelap ? '#FBBA6B' : '#FFB703',
error:   gelap ? '#FFB4AB' : '#D90429',
ungu:    gelap ? '#C7B0F0' : '#6D4AA8',
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
halaman: 1,
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
Object.keys(aktif).forEach(kk => {
if (!aktif[kk]) return;
data = data.filter(r => String(r[kk] == null ? '' : r[kk]).trim() === aktif[kk]);
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
const kandidat = bangunKandidatFilter(st);
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
async function eksporTabel(prefix, format) {
const menu = $(prefix + 'EksporMenu');
if (menu) menu.hidden = true;
const paket = barisUntukEkspor(prefix);
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
if (AppState.gayaCetak) { tulis(AppState.gayaCetak); return; }
panggil('gayaCetakTabel', AppState.sessionToken)
.then(res => { AppState.gayaCetak = (res && res.success) ? res.data : ''; tulis(AppState.gayaCetak); })
.catch(() => tulis(''));
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
if (Object.keys(AppState.grafik).length && AppState.halamanAktif) {
hancurkanGrafik();
jalankanInit(AppState.halamanAktif);
}
}
async function navigateTo(halaman, opsi = {}) {
if (!halaman) return;
tandaiMenuAktif(halaman);
hentikanKamera();
hentikanPantauLokasi();
hancurkanGrafik();
hentikanJam();
tutupModal();
tutupMenuProfil();
AppState.tabel = {};
const wadah = $('app-container');
if (halaman === 'login') {
try {
const res = await panggil('getPageContent', 'login', {});
wadah.innerHTML = res.success ? res.html : '';
} catch (e) { wadah.innerHTML = ''; }
AppState.halamanAktif = 'login';
return;
}
const html = AppState.htmlHalaman && AppState.htmlHalaman[halaman];
if (html && !opsi.paksaMuatUlang) {
AppState.dataAwal = (AppState.paketData && AppState.paketData[halaman]) || null;
if (opsi.dataSegar) AppState.dataAwal = null;
wadah.innerHTML = html;
wadah.classList.remove('halaman-masuk');
void wadah.offsetWidth;
wadah.classList.add('halaman-masuk');
selesaikanNavigasi(halaman);
return;
}
wadah.innerHTML = `<div class="skeleton" style="height:56px"></div>
<div class="skeleton" style="height:180px"></div>
${memuatInline('Menyiapkan halaman…')}`;
try {
const res = await panggil('getPageContent', halaman, { sessionToken: AppState.sessionToken });
if (!res.success) {
if (res.redirect === 'login') { toast(res.message || 'Sesi berakhir.', 'warning'); keluarPaksa(); return; }
wadah.innerHTML = emptyState('block', 'Tidak dapat membuka halaman', res.message || 'Terjadi kesalahan.');
return;
}
if (!AppState.htmlHalaman) AppState.htmlHalaman = {};
AppState.htmlHalaman[halaman] = res.html;
AppState.dataAwal = res.dataAwal || null;
wadah.innerHTML = res.html;
wadah.classList.remove('halaman-masuk');
void wadah.offsetWidth;
wadah.classList.add('halaman-masuk');
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
function batalkanPaketData() {
AppState.paketData = null;
AppState.dataAwal = null;
}
function muatHalamanUlang() {
if (!AppState.halamanAktif) return;
batalkanPaketData();
tampilkanSibuk('Menyegarkan data…');
segarkanPaketData().then(function () {
sembunyikanSibuk();
navigateTo(AppState.halamanAktif, { dataSegar: !AppState.paketData });
});
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
function pramuatHalaman(halaman) {
if (!halaman || !AppState.sessionToken) return;
if (!AppState.htmlHalaman) AppState.htmlHalaman = {};
if (AppState.htmlHalaman[halaman]) return;
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
function pramuatSemuaHalaman() {
const menu = MENU[AppState.user.role] || [];
let ke = 0;
const berikutnya = function () {
if (ke >= menu.length) return;
const m = menu[ke++];
if (m && m.id && m.id !== AppState.halamanAktif) pramuatHalaman(m.id);
setTimeout(berikutnya, 700);
};
setTimeout(berikutnya, 1500);
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
function bukaPencarianGlobal() {
if (!AppState.sessionToken) return;
$('cmdk').hidden = false;
document.body.style.overflow = 'hidden';
const inp = $('cmdkInput');
inp.value = '';
AppState.cmdkIndex = -1;
AppState.cmdkHasil = [];
renderHasilPencarian([], '');
setTimeout(() => inp.focus(), 30);
}
function tutupPencarianGlobal() {
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
if (q.length < 2) { renderHasilPencarian(halaman, q); return; }
renderHasilPencarian(halaman, q, true);
AppState.cmdkTimer = setTimeout(async () => {
try {
const res = await panggil('pencarianGlobal', AppState.sessionToken, q);
const data = (res.success && Array.isArray(res.data)) ? res.data : [];
renderHasilPencarian(halaman.concat(data), q);
} catch (e) {
renderHasilPencarian(halaman, q);
}
}, 260);
}
function renderHasilPencarian(hasil, q, memuat) {
const box = $('cmdkResults');
if (!box) return;
AppState.cmdkHasil = hasil;
AppState.cmdkIndex = hasil.length ? 0 : -1;
if (!hasil.length) {
box.innerHTML = `<p class="cmdk-kosong">${q ? 'Tidak ada hasil untuk "' + esc(q) + '".'
: 'Ketik untuk mencari siswa, guru, tempat PKL, atau halaman.'}</p>`;
return;
}
const grup = {};
hasil.forEach((h, i) => { (grup[h.tipe] = grup[h.tipe] || []).push({ h, i }); });
box.innerHTML = Object.keys(grup).map(tipe => `
<div class="cmdk-group">${esc(tipe)}</div>
${grup[tipe].map(({ h, i }) => `
<button class="cmdk-item ${i === AppState.cmdkIndex ? 'aktif' : ''}" data-idx="${i}"
onclick="pilihHasilPencarian(${i})">
<span class="mi">${h.ikon || 'chevron_right'}</span>
<span class="cmdk-item-main">
<span class="cmdk-item-judul">${esc(h.judul)}</span>
<span class="cmdk-item-sub">${esc(h.sub || '')}</span>
</span>
</button>`).join('')}`).join('') +
(memuat ? '<p class="cmdk-kosong">Mencari data…</p>' : '');
}
function pilihHasilPencarian(i) {
const h = AppState.cmdkHasil[i];
if (!h) return;
tutupPencarianGlobal();
navigateTo(h.aksi);
}
function navigasiPencarian(arah) {
if (!AppState.cmdkHasil.length) return;
AppState.cmdkIndex = (AppState.cmdkIndex + arah + AppState.cmdkHasil.length) % AppState.cmdkHasil.length;
$$('.cmdk-item').forEach(el =>
el.classList.toggle('aktif', Number(el.dataset.idx) === AppState.cmdkIndex));
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
const res = await panggil('doLogin', user, pass);
if (!res.success) {
$('errPass').textContent = res.message;
$('loginPass').classList.add('invalid');
btn.disabled = false;
btn.innerHTML = '<span class="mi">login</span> Masuk';
return;
}
await mulaiSesi(res.data.token);
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
async function mulaiSesi(token) {
AppState.sessionToken = token;
Simpanan.simpan('sesi', token);
tampilkanSibuk('Menyiapkan aplikasi…');
try {
await muatBootstrap();
sembunyikanSibuk();
await navigateTo('beranda');
toast('Selamat datang, ' + AppState.user.nama + '!', 'success');
} catch (err) {
sembunyikanSibuk();
toast(err.message, 'error');
keluarPaksa();
}
}
async function muatBootstrap() {
const res = await panggil('getBootstrapData', AppState.sessionToken);
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
pramuatSemuaHalaman();
try {
Simpanan.simpan('identitas', JSON.stringify({
appName: c.appName || 'SIM PKL', appTagline: c.appTagline || '',
namaSekolah: c.namaSekolah || '', logoUrl: c.logoUrl || ''
}));
} catch (e) {}
const halaman = await panggil('semuaHalamanHtml', AppState.sessionToken);
AppState.htmlHalaman = (halaman && halaman.success) ? halaman.data : {};
segarkanPaketData();
if (!AppState.periode) toast('Belum ada periode PKL aktif. Presensi dan jurnal terkunci.', 'warning', 7000);
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
tampilkanSibuk('Keluar…');
try { await panggil('doLogout', AppState.sessionToken); } catch (e) {}
sembunyikanSibuk();
keluarPaksa();
toast('Anda telah keluar.', 'info');
}
function keluarPaksa() {
hentikanKamera();
hentikanPantauLokasi();
hancurkanGrafik();
hentikanJam();
tutupPencarianGlobal();
Simpanan.hapus('sesi');
AppState.sessionToken = null;
AppState.user = null;
batalkanPaketData();
AppState.penempatan = null;
AppState.tabel = {};
tampilkanKerangkaAplikasi(false);
navigateTo('login');
}
window.__blok = 1;

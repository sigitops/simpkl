function pasangTanggalDefault() {
const now = new Date(), awal = new Date(now.getFullYear(), now.getMonth(), 1);
const fmt = d => d.toISOString().slice(0, 10);
if ($('filterDari')) $('filterDari').value = fmt(awal);
if ($('filterSampai')) $('filterSampai').value = fmt(now);
AppState.modeFilter = 'bulanan';
}
function setModeFilter(mode, tombol, fnMuat) {
AppState.modeFilter = mode;
$$('.seg-btn[data-mode]').forEach(b => b.classList.toggle('active', b === tombol));
const custom = $('filterCustom');
if (custom) custom.hidden = (mode !== 'custom');
if (mode !== 'custom' && typeof fnMuat === 'function') fnMuat();
}
function ambilFilterAktif() {
const f = { mode: AppState.modeFilter };
if (f.mode === 'custom') {
f.dari = $('filterDari') ? $('filterDari').value : '';
f.sampai = $('filterSampai') ? $('filterSampai').value : '';
if (!f.dari || !f.sampai) { toast('Tentukan tanggal mulai dan akhir.', 'warning'); return null; }
if (f.dari > f.sampai) { toast('Tanggal mulai tidak boleh melewati tanggal akhir.', 'warning'); return null; }
}
return f;
}
async function muatRiwayatPresensi() {
const filter = ambilFilterAktif();
if (!filter) return;
const list = $('listRiwayatPresensi');
if (list) list.innerHTML = memuatInline('Mengambil riwayat presensi…');
try {
const res = await panggilCepat('getRiwayatPresensi', AppState.sessionToken, filter);
if (!res.success) { toast(res.message, 'error'); return; }
const d = res.data;
renderRekapPresensi(d.rekap);
renderJejakPresensi(d.items, d.rentang);
} catch (err) {
list.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
function renderRekapPresensi(rekap) {
const box = $('rwRingkas');
if (!box) return;
const kartu = [
{ nama: 'Hadir', angka: rekap.Hadir || 0, ikon: 'check_circle', nada: 'var(--success)' },
{ nama: 'Telat', angka: rekap.Telat || 0, ikon: 'schedule', nada: 'var(--warning)' },
{ nama: 'Izin / Sakit', angka: (rekap.Izin || 0) + (rekap.Sakit || 0), ikon: 'event_busy', nada: 'var(--primary)' },
{ nama: 'Alpha', angka: rekap.Alpha || 0, ikon: 'person_off', nada: 'var(--error)' }
];
const total = kartu.reduce((a, k) => a + k.angka, 0);
const hadirEfektif = (rekap.Hadir || 0) + (rekap.Telat || 0);
const persen = total ? Math.round(hadirEfektif / total * 100) : 0;
box.innerHTML = `
<div class="rw-skor">
<div class="rw-skor-cincin" style="--isi:${persen}">
<span class="rw-skor-angka">${persen}<small>%</small></span>
</div>
<div class="rw-skor-teks">
<div class="rw-skor-judul">Tingkat Kehadiran</div>
<div class="rw-skor-sub">${hadirEfektif} hadir dari ${total} hari kerja tercatat</div>
</div>
</div>
<div class="rw-kartu-baris">
${kartu.map(k => `
<div class="rw-kartu" style="--nada:${k.nada}">
<span class="rw-kartu-ikon"><span class="mi">${k.ikon}</span></span>
<span class="rw-kartu-angka">${k.angka}</span>
<span class="rw-kartu-nama">${esc(k.nama)}</span>
</div>`).join('')}
</div>`;
const wrap = $('rwBarWrap'), bar = $('rwBar'), leg = $('rwBarLegenda');
if (!wrap || !bar) return;
if (!total) { wrap.hidden = true; return; }
wrap.hidden = false;
const isi = kartu.filter(k => k.angka > 0);
bar.innerHTML = isi.map(k =>
`<span class="rw-seg" style="width:${(k.angka / total * 100).toFixed(1)}%;background:${k.nada}"
title="${esc(k.nama)}: ${k.angka}"></span>`).join('');
if (leg) leg.innerHTML = isi.map(k =>
`<span class="rw-leg"><i style="background:${k.nada}"></i>${esc(k.nama)}
<b>${Math.round(k.angka / total * 100)}%</b></span>`).join('');
}
function renderJejakPresensi(items, rentang) {
AppState.riwayatItems = items;
AppState.riwayatRentang = rentang;
// Panel saring memanggil balik lewat pendaftaran ini, bukan lewat onchange
// yang dipasang tangan — panelnya sendiri sama persis dengan milik modul
// admin dan guru, dan tidak perlu tahu apa pun tentang halaman ini.
daftarkanSaring('rw', gambarJejakPresensi);
perbaruiLencanaSaring('rw');
gambarJejakPresensi();
}
function gambarJejakPresensi() {
const list = $('listRiwayatPresensi');
const chip = $('chipJumlahRiwayat');
if (!list) return;
const semua = AppState.riwayatItems || [];
const rentang = AppState.riwayatRentang || { label: 'rentang ini' };
const saring = nilaiSaring('rw', 'status');
const items = saring
? semua.filter(r => String(r.status) === saring || String(r.jenis) === saring)
: semua;
if (chip) chip.textContent = items.length + ' catatan';
if (!items.length) {
list.innerHTML = emptyState('event_busy',
saring ? 'Tidak ada catatan berstatus ' + esc(saring) : 'Belum ada data presensi',
saring ? 'Coba pilih status lain atau ubah rentang tanggalnya.'
: 'Tidak ada rekaman pada rentang ' + rentang.label.toLowerCase() + '.');
return;
}
const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const kunciHariIni = new Date().toISOString().slice(0, 10);
const kemarin = new Date(); kemarin.setDate(kemarin.getDate() - 1);
const kunciKemarin = kemarin.toISOString().slice(0, 10);
const grup = {};
items.forEach(r => { (grup[r.tanggal] = grup[r.tanggal] || []).push(r); });
list.innerHTML = `<div class="rw-jejak">${Object.keys(grup).sort((a, b) => b.localeCompare(a)).map(tgl => {
const baris = grup[tgl];
const tanda = tgl === kunciHariIni ? 'Hari ini' : tgl === kunciKemarin ? 'Kemarin' : '';
const d = new Date(tgl + 'T00:00:00');
const utama = baris.find(x => x.jenis === 'Masuk') || baris[0];
const nada = utama.jenis === 'Libur' ? 'netral'
: (utama.status === 'Hadir' || utama.status === 'Disetujui') ? 'ok'
: (utama.status === 'Telat' || utama.status === 'Menunggu') ? 'warn' : 'danger';
return `<section class="rw-hari nada-${nada}">
<header class="rw-hari-kepala">
<div class="rw-hari-tgl">
<span class="rw-hari-angka">${String(d.getDate()).padStart(2, '0')}</span>
<span class="rw-hari-bulan">${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]}</span>
</div>
<div class="rw-hari-info">
<div class="rw-hari-nama">${hariNama[d.getDay()]}${tanda ? ` <span class="rw-tanda">${tanda}</span>` : ''}</div>
<div class="rw-hari-sub">${baris.length} catatan</div>
</div>
${chipStatus(utama.status)}
</header>
<div class="rw-hari-isi">
${baris.map((r, i) => jejakBaris(r, i === baris.length - 1)).join('')}
</div>
</section>`;
}).join('')}</div>`;
}
function jejakBaris(r, terakhir) {
// Libur bernada netral, bukan merah: siswa tidak melakukan kesalahan apa pun
// pada hari itu, dan warna merah akan membuatnya terbaca seperti pelanggaran.
const nada = r.jenis === 'Libur' ? 'netral'
: (r.status === 'Hadir' || r.status === 'Disetujui') ? 'ok'
: (r.status === 'Telat' || r.status === 'Menunggu') ? 'warn' : 'danger';
const ikon = r.jenis === 'Masuk' ? 'login' : r.jenis === 'Pulang' ? 'logout'
: r.jenis === 'Sakit' ? 'sick' : r.jenis === 'Alpha' ? 'person_off'
: r.jenis === 'Libur' ? 'weekend' : 'event_busy';
const detail = (r.jenis === 'Masuk' || r.jenis === 'Pulang')
? `${jamTampil(r.waktu)} WIB &middot; ${esc(r.jenis)} &middot; ${r.jarak} m dari lokasi (±${r.akurasi} m)`
: r.jenis === 'Alpha' ? 'Tidak hadir tanpa keterangan'
: r.jenis === 'Libur' ? (r.catatan ? esc(r.catatan) : 'Hari libur') +
    (r.jenisLibur ? ' &middot; libur ' + esc(String(r.jenisLibur).toLowerCase()) : '')
: `${esc(r.jenis)} &middot; ${esc(r.catatan || '')}`;
const tombol = [];
if (r.foto) tombol.push(`<button class="btn-icon" aria-label="Lihat foto presensi"
onclick="bukaPratinjau('Foto Presensi','${esc(r.foto)}','','gambar')"><span class="mi">image</span></button>`);
if (r.bukti) tombol.push(`<button class="btn-icon" aria-label="Lihat bukti"
onclick="bukaPratinjau('Bukti ${esc(r.jenis)}','${esc(r.bukti)}','','gambar')">
<span class="mi">description</span></button>`);
return `<div class="jejak">
<div class="jejak-rel">
<div class="jejak-bulat list-lead ${nada}"><span class="mi">${ikon}</span></div>
${terakhir ? '' : '<div class="jejak-garis"></div>'}
</div>
<div class="jejak-isi">
<div class="jejak-baris">
<div style="min-width:0">
<div class="jejak-judul">${esc(r.jenis === 'Alpha' ? 'Alpha' : r.jenis)}</div>
<div class="jejak-detail">${detail}</div>
</div>
<div class="list-tail">${chipStatus(r.status)}${tombol.join('')}</div>
</div>
${r.komentar ? `<div class="jejak-catatan"><b>Catatan guru:</b> ${esc(r.komentar)}</div>` : ''}
</div>
</div>`;
}
// ══════════════════════════════════════════════════════════════════════════
// MODUL JURNAL SISWA (v8.8) — lima layar, satu alur
//
//   jurnal          Beranda: sambutan, ringkasan bulan, jurnal terbaru
//   jurnal-baru     Formulir buat/ubah, dengan lampiran menempel di dalamnya
//   jurnal-sukses   Konfirmasi tersimpan
//   jurnal-riwayat  Daftar lengkap: cari, saring, tampilkan N, paginasi
//   jurnal-detail   Satu jurnal, empat keadaan
//
// SELURUH datanya diambil SATU KALI (getRiwayatJurnal mode 'semua') lalu
// dipegang di AppState. Sesudah itu berpindah antar kelima layar — termasuk
// mengganti bulan, menyaring, mencari, dan membuka detail — tidak memanggil
// server sama sekali. Di Apps Script satu perjalanan berharga satu sampai dua
// detik; alur lima layar yang memanggil server di tiap langkah akan terasa
// seperti aplikasi yang macet, padahal datanya sudah ada di tangan.
// ══════════════════════════════════════════════════════════════════════════

const JR_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const JR_UBIN = [
  { k: 'total',     ikon: 'menu_book',     nada: '',       label: 'Total Jurnal' },
  { k: 'Disetujui', ikon: 'check_circle',  nada: 'ok',     label: 'Disetujui' },
  { k: 'Revisi',    ikon: 'edit_note',     nada: 'danger', label: 'Revisi' },
  { k: 'Menunggu',  ikon: 'hourglass_top', nada: 'warn',   label: 'Menunggu' }
];
const JR_NADA = { Disetujui: 'ok', Revisi: 'danger', Menunggu: 'warn' };

// ── Lini masa jurnal (v9.2) ───────────────────────────────────────────────
//
// Dipakai BERSAMA oleh riwayat jurnal siswa (app3) dan detail riwayat jurnal
// admin/guru (app4). Ditulis di sini karena app3.js dimuat lebih dahulu; keenam
// berkas app*.js berbagi satu lingkup global, jadi menyalinnya ke app4 berarti
// dua salinan yang saling menimpa diam-diam.
//
// Bentuknya sengaja minimalis: satu garis tipis, satu simpul per hari. Yang
// dibawa simpul itu BUKAN hiasan — warnanya keadaan jurnal hari itu, dan
// ikonnya mengulang keadaan yang sama dalam bentuk, supaya yang tidak dapat
// membedakan warna tetap membacanya.
const TL_IKON = { Disetujui: 'check', Revisi: 'edit_note', Menunggu: 'hourglass_top' };
/**
 * Satu langkah pada lini masa: simpul di kiri, kartunya di kanan.
 *
 * `urutan` hanya menunda animasi masuknya — bukan menunda datanya. Seluruh
 * daftar sudah tergambar sejak milidetik pertama.
 */
function langkahLiniMasa(status, isiHtml, urutan) {
const nada = JR_NADA[status] || 'warn';
const tunda = Math.min(Number(urutan) || 0, 12) * 45;
return `<div class="tl-pos" style="--tl-tunda:${tunda}ms">
<span class="tl-rel" aria-hidden="true">
<span class="tl-garis"></span>
<span class="tl-simpul nada-${nada}"><span class="mi">${TL_IKON[status] || 'schedule'}</span></span>
<span class="tl-garis"></span>
</span>${isiHtml}</div>`;
}
// Penanda bulan duduk DI ATAS garis yang sama, bukan memotongnya. Judul bulan
// yang memutus garisnya membuat lini masanya terbaca sebagai beberapa daftar
// terpisah, padahal ia satu perjalanan yang sama.
function penandaBulanLiniMasa(isiHtml) {
return `<div class="tl-pos tl-pos-bulan">
<span class="tl-rel" aria-hidden="true">
<span class="tl-garis"></span><span class="tl-tanda"></span><span class="tl-garis"></span>
</span>${isiHtml}</div>`;
}

/**
 * Mengambil SELURUH jurnal siswa, sekali saja.
 *
 * Dipanggil di pintu masuk kelima layar. Yang kedua dan seterusnya langsung
 * kembali tanpa menyentuh jaringan — kecuali `paksa`, yang dipakai sesudah
 * menyimpan atau menghapus.
 */
async function muatJurnalSiswa(paksa) {
if (!paksa && AppState.dataJurnal) return true;
try {
const res = await panggilCepat('getRiwayatJurnal', AppState.sessionToken, { mode: 'semua' });
if (!res.success) { toast(res.message, 'error'); return false; }
AppState.dataJurnal = res.data.items || [];
AppState.jurnalHariIni = res.data.hariIni || '';
return true;
} catch (err) { toast(err.message, 'error'); return false; }
}
function jurnalMilik(id) {
return (AppState.dataJurnal || []).filter(function (j) { return j.id === id; })[0] || null;
}
/**
 * Daftar foto dokumentasi satu jurnal, dalam dua ukuran.
 *
 * Sejak v8.7 server mengirim fotoList/fotoBesarList (satu sampai tiga).
 * Bentuk lama — satu medan `foto` — tetap dibaca sebagai daftar berisi satu,
 * supaya halaman ini tidak kehilangan gambar apa pun pada saat peralihan,
 * termasuk bila server sempat menjawab dari singgahan versi sebelumnya.
 */
function fotoJurnal(j) {
const kecil = (j.fotoList && j.fotoList.length) ? j.fotoList : (j.foto ? [j.foto] : []);
const besar = (j.fotoBesarList && j.fotoBesarList.length) ? j.fotoBesarList : kecil;
return kecil.map(function (u, i) { return { kecil: u, besar: besar[i] || u }; });
}
// Penanda relatif di samping tanggal. "Hari ini" jauh lebih cepat dikenali
// daripada "Kamis, 11 Sep 2026" — dan tanggalnya tetap ditulis di sebelahnya
// supaya tidak ada yang harus menebak tanggal berapa "kemarin" itu.
function tandaHariJurnal(tanggal) {
const kini = AppState.jurnalHariIni || '';
if (!kini || !tanggal) return '';
if (tanggal === kini) return 'Hari ini';
const d = new Date(kini + 'T00:00:00');
d.setDate(d.getDate() - 1);
const kemarin = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
                '-' + String(d.getDate()).padStart(2, '0');
return tanggal === kemarin ? 'Kemarin' : '';
}
function labelBulanJurnal(kunci) {
const th = Number(String(kunci).slice(0, 4));
const bl = Number(String(kunci).slice(5, 7)) - 1;
return (JR_BULAN[bl] || '?') + ' ' + th;
}

// ── Layar 1: Beranda Jurnal ───────────────────────────────────────────────
async function initJurnalSiswa() {
if (!await muatJurnalSiswa()) return;
gambarBerandaJurnal();
}
// Bulan yang BENAR-BENAR punya jurnal, ditambah bulan berjalan. Menawarkan
// dua belas bulan kosong membuat penggunanya menelusuri pilihan yang tidak
// satu pun berisi — dan bulan berjalan harus selalu ada supaya siswa yang
// belum mengisi apa pun bulan ini tetap melihat ringkasannya (nol).
function bulanJurnalAda() {
const ada = {};
(AppState.dataJurnal || []).forEach(function (j) { ada[String(j.tanggal).slice(0, 7)] = 1; });
const kini = (AppState.jurnalHariIni || '').slice(0, 7);
if (kini) ada[kini] = 1;
// Bulan yang baru dipilih lewat kalender ikut masuk daftar meski kosong. Tanpa
// ini gambarBerandaJurnal() akan menolaknya karena tidak ada di daftar, lalu
// diam-diam melompat kembali ke bulan berjalan — pilihannya seolah diabaikan.
if (AppState.jurnalBulan) ada[AppState.jurnalBulan] = 1;
return Object.keys(ada).sort().reverse();
}
function gambarBerandaJurnal() {
const salam = $('jbSalam');
if (salam) {
const nama = String((AppState.user || {}).nama || '').split(' ')[0] || 'Siswa';
salam.textContent = 'Halo, ' + nama + '!';
}
const sel = $('jbBulan');
if (sel) {
const daftar = bulanJurnalAda();
const kini = (AppState.jurnalHariIni || '').slice(0, 7);
if (!AppState.jurnalBulan || daftar.indexOf(AppState.jurnalBulan) === -1) {
AppState.jurnalBulan = daftar.indexOf(kini) !== -1 ? kini : (daftar[0] || kini);
}
sel.innerHTML = daftar.map(function (k) {
return '<option value="' + esc(k) + '"' +
  (k === AppState.jurnalBulan ? ' selected' : '') + '>' + esc(labelBulanJurnal(k)) + '</option>';
}).join('');
}
setelPemilihBulanJurnal();
gambarUbinJurnal();
gambarTerbaruJurnal();
}
function gantiBulanJurnal() {
const sel = $('jbBulan');
if (sel) AppState.jurnalBulan = sel.value;
setelPemilihBulanJurnal();
gambarUbinJurnal();
}

// ── Pintasan kalender untuk filter bulan (v9.0) ───────────────────────────
//
// Daftar pilihannya sengaja hanya memuat bulan yang BENAR-BENAR berisi jurnal —
// menawarkan dua belas bulan kosong membuat penggunanya menelusuri pilihan yang
// tidak satu pun berisi. Tetapi siswa yang ingin menengok bulan lain jadi tidak
// punya jalan sama sekali. Ikon kalender di sebelahnya membuka pemilih bawaan
// perangkat, yang di ponsel adalah roda bulan-tahun yang sudah dikenal semua
// orang, tanpa merusak keringkasan daftar pendek itu.
//
// Tombolnya BARU DITAMPILKAN bila peramban benar-benar punya showPicker().
// Tombol yang selalu ada tetapi di sebagian peramban tidak membuka apa pun
// lebih buruk daripada tidak ada tombolnya sama sekali.
function adaPemilihBulan() {
try { return typeof HTMLInputElement !== 'undefined' &&
             typeof HTMLInputElement.prototype.showPicker === 'function'; }
catch (e) { return false; }
}
function setelPemilihBulanJurnal() {
const tbl = $('jbBulanIkon'), inp = $('jbBulanKalender');
if (tbl) tbl.hidden = !adaPemilihBulan();
if (!inp) return;
const semua = (AppState.dataJurnal || [])
  .map(function (j) { return String(j.tanggal).slice(0, 7); })
  .filter(Boolean).sort();
const kini = (AppState.jurnalHariIni || '').slice(0, 7);
// Batas bawah: bulan jurnal paling awal. Batas atas: bulan berjalan — jurnal
// tidak bisa ada di masa depan, jadi menawarkannya hanya menyesatkan.
const paling = semua.length ? semua[0] : kini;
if (paling) inp.min = (kini && kini < paling) ? kini : paling;
if (kini) inp.max = kini;
inp.value = AppState.jurnalBulan || kini || '';
}
function bukaPemilihBulanJurnal() {
const inp = $('jbBulanKalender');
if (!inp) return;
inp.value = AppState.jurnalBulan || '';
// showPicker() melempar bila dipanggil di luar gerakan pengguna atau bila
// elemennya tidak tergambar. Kegagalannya tidak boleh membuat halaman diam:
// daftar pilihan di sebelahnya tetap jalan, jadi cukup beri tahu sekali.
try { inp.showPicker(); }
catch (e) { toast('Kalender tidak dapat dibuka. Gunakan daftar bulan di sebelahnya.', 'warning'); }
}
function terapkanBulanKalender() {
const inp = $('jbBulanKalender');
if (!inp || !inp.value) return;
AppState.jurnalBulan = inp.value;
// Digambar ulang seluruhnya, bukan hanya ubinnya: bulan yang baru dipilih
// mungkin belum ada di daftar dan harus ikut muncul di sana.
gambarBerandaJurnal();
}
function gambarUbinJurnal() {
const box = $('jbUbin');
if (!box) return;
const bulan = AppState.jurnalBulan || '';
const dalam = (AppState.dataJurnal || []).filter(function (j) {
return String(j.tanggal).slice(0, 7) === bulan;
});
const n = { total: dalam.length, Disetujui: 0, Revisi: 0, Menunggu: 0 };
dalam.forEach(function (j) { if (n[j.status] !== undefined) n[j.status]++; });
box.innerHTML = JR_UBIN.map(function (u) {
return `<div class="jb-ubin-kartu nada-${u.nada}">
<span class="jb-ubin-ikon"><span class="mi">${u.ikon}</span></span>
<div class="jb-ubin-nilai">${n[u.k]}</div>
<div class="jb-ubin-label">${u.label}</div>
</div>`;
}).join('');
}
function gambarTerbaruJurnal() {
const box = $('jbTerbaru');
if (!box) return;
const semua = AppState.dataJurnal || [];
if (!semua.length) {
box.innerHTML = emptyState('note_add', 'Belum ada jurnal',
'Mulailah mencatat kegiatan PKL Anda hari ini.',
`<button class="btn btn-primary" onclick="bukaJurnalBaru()">
 <span class="mi">add</span> Tulis Jurnal</button>`);
return;
}
// Tiga terbaru saja. Beranda yang memuat seluruh riwayat membuat tombol
// "Lihat Semua" di atasnya kehilangan arti, dan halamannya jadi dua kali
// lebih panjang tanpa satu pun informasi baru.
box.innerHTML = `<div class="jb-daftar">${semua.slice(0, 3).map(kartuRiwayatJurnal).join('')}</div>`;
}
function bukaJurnalBaru() {
AppState.jurnalUbah = null;
navigateTo('jurnal-baru');
}
function bukaJurnalDetail(id) {
AppState.jurnalPilih = id;
navigateTo('jurnal-detail');
}
function bukaUbahJurnal(id) {
AppState.jurnalUbah = id;
navigateTo('jurnal-baru');
}

/**
 * Satu baris jurnal, dipakai Beranda DAN Riwayat.
 *
 * Bentuk yang sama di dua tempat bukan kebetulan: siswa yang mengenali
 * barisnya di beranda harus mengenali baris yang sama di riwayat, dan dua
 * salinan yang mirip akan menyimpang begitu salah satunya disentuh.
 */
function kartuRiwayatJurnal(j) {
const f = fotoJurnal(j);
const tanda = tandaHariJurnal(j.tanggal);
const potong = String(j.kegiatan || '');
return `<button type="button" class="jb-baris nada-${JR_NADA[j.status] || 'warn'}"
onclick="bukaJurnalDetail('${esc(j.id)}')"
aria-label="Buka detail jurnal ${esc(tglSingkat(j.tanggal))}">
<div class="jb-baris-isi">
<div class="jb-baris-kepala">
<span class="jb-baris-tgl">${esc(tglRingkas(j.tanggal))}</span>
${tanda ? `<span class="jb-tanda">${tanda}</span>` : ''}
</div>
<p class="jb-baris-teks">${esc(potong)}</p>
<div class="jb-baris-kaki">${chipStatus(j.status)}
${f.length > 1 ? `<span class="jb-baris-foto"><span class="mi">photo_library</span>${f.length}</span>` : ''}
</div>
</div>
${f.length ? `<span class="jb-baris-gambar"><img src="${esc(f[0].kecil)}"
alt="Dokumentasi ${esc(tglSingkat(j.tanggal))}" loading="lazy" decoding="async"></span>` : ''}
<span class="jb-baris-panah"><span class="mi">chevron_right</span></span>
</button>`;
}

// ── Layar 2 & 3: Formulir + lampiran ──────────────────────────────────────
const JR_FOTO_MAKS = 3;
const JR_BATAS = { kegiatan: 1000, pembelajaran: 1000, kendala: 1000 };
async function initJurnalBaru() {
if (!await muatJurnalSiswa()) return;
gambarFormJurnal();
}
function gambarFormJurnal() {
const box = $('jnForm');
if (!box) return;
const ubah = AppState.jurnalUbah ? jurnalMilik(AppState.jurnalUbah) : null;
// Meminta mengubah jurnal yang sudah tidak ada — terhapus di tab lain,
// misalnya — tidak boleh menampilkan formulir kosong yang diam-diam membuat
// jurnal BARU pada tanggal itu.
if (AppState.jurnalUbah && !ubah) {
box.innerHTML = emptyState('search_off', 'Jurnal tidak ditemukan',
'Jurnal yang ingin diubah sudah tidak ada. Muat ulang riwayat Anda.',
`<button class="btn btn-outline" onclick="navigateTo('jurnal-riwayat')">
 <span class="mi">history_edu</span> Buka Riwayat</button>`);
return;
}
const d = ubah || {};
const hariIni = AppState.jurnalHariIni || new Date().toISOString().slice(0, 10);
const judul = $('jnJudul');
if (judul) judul.innerHTML = `<span class="mi">${ubah ? 'edit' : 'edit_note'}</span> ` +
  (ubah ? 'Ubah Jurnal Harian' : 'Buat Jurnal Harian');
// Lampiran lama dibawa sebagai PASANGAN id + url: id-nya yang dikirim kembali
// ke server sebagai "yang dipertahankan", url-nya hanya untuk digambar.
AppState.fotoJurnal = (ubah ? (d.fotoId || []) : []).map(function (id, i) {
return { id: id, url: (d.fotoList || [])[i] || '' };
}).filter(function (f) { return f.id && f.url; }).slice(0, JR_FOTO_MAKS);

box.innerHTML = `
${ubah && d.status === 'Revisi' && d.komentar ? `<div class="jn-revisi">
<span class="mi">error</span>
<div><strong>Perlu diperbaiki</strong><p>${esc(d.komentar)}</p></div>
</div>` : ''}
<div class="field">
<label class="field-label" for="jrTanggal">Tanggal Kegiatan</label>
<input class="field-input" id="jrTanggal" type="date" max="${esc(hariIni)}"
value="${esc(d.tanggal || hariIni)}" ${ubah ? 'readonly' : ''}>
<p class="field-help">${ubah ? 'Tanggal jurnal tidak dapat diubah.'
  : 'Tidak boleh melewati hari ini.'}</p>
</div>
<div class="field">
<label class="field-label" for="jrKegiatan">Kegiatan Hari Ini
<span class="field-wajib" aria-hidden="true">*</span></label>
<textarea class="field-input" id="jrKegiatan" rows="4" maxlength="${JR_BATAS.kegiatan}"
oninput="hitungKarakterJurnal()"
placeholder="Tuliskan apa yang Anda kerjakan hari ini secara ringkas dan jelas.">${esc(d.kegiatan || '')}</textarea>
<div class="field-kaki">
<p class="field-help">Minimal 10 karakter.</p>
<span class="field-hitung" id="jrHitungKegiatan" aria-live="polite"></span>
</div>
<div class="field-error" id="errJrKegiatan"></div>
</div>
<div class="field">
<label class="field-label" for="jrPembelajaran">Pembelajaran / Hal Baru
<span class="field-opsional">Opsional</span></label>
<textarea class="field-input" id="jrPembelajaran" rows="3" maxlength="${JR_BATAS.pembelajaran}"
oninput="hitungKarakterJurnal()"
placeholder="Hal baru yang Anda pelajari atau pahami hari ini.">${esc(d.pembelajaran || '')}</textarea>
<div class="field-kaki"><span></span>
<span class="field-hitung" id="jrHitungPembelajaran" aria-live="polite"></span></div>
</div>
<div class="field">
<label class="field-label" for="jrKendala">Tantangan / Kendala
<span class="field-opsional">Opsional</span></label>
<textarea class="field-input" id="jrKendala" rows="3" maxlength="${JR_BATAS.kendala}"
oninput="hitungKarakterJurnal()"
placeholder="Hambatan yang Anda temui, bila ada.">${esc(d.kendala || '')}</textarea>
<div class="field-kaki"><span></span>
<span class="field-hitung" id="jrHitungKendala" aria-live="polite"></span></div>
</div>
<div class="field">
<label class="field-label" for="jrFoto">Lampiran Dokumentasi
<span class="field-wajib" aria-hidden="true">*</span></label>
<div class="jn-tips">
<span class="mi">lightbulb</span>
<div><strong>Tips Foto Dokumentasi</strong>
<p>Pastikan foto jelas, tidak blur, dan menampilkan aktivitas atau hasil
pekerjaan Anda. Minimal 1, maksimal ${JR_FOTO_MAKS} foto.</p></div>
</div>
<div class="jr-lampiran" id="jrLampiran"></div>
<input type="file" id="jrFoto" accept="image/*,.heic,.heif" hidden multiple
onchange="pratinjauFotoJurnal(event)">
<input type="file" id="jrKamera" accept="image/*" capture="environment" hidden
onchange="pratinjauFotoJurnal(event)">
<div class="jn-ambil">
<button type="button" class="btn btn-outline btn-sm" onclick="ambilFotoJurnal(true)">
<span class="mi">photo_camera</span> Ambil Foto</button>
<button type="button" class="btn btn-outline btn-sm" onclick="ambilFotoJurnal(false)">
<span class="mi">photo_library</span> Pilih dari Galeri</button>
</div>
<div class="field-error" id="errJrFoto"></div>
</div>
<div class="jn-aksi">
<button class="btn btn-outline" onclick="navigateTo('${ubah ? 'jurnal-detail' : 'jurnal'}')">
Batal</button>
<button class="btn btn-primary" onclick="kirimJurnal()">
<span class="mi">save</span> Simpan Jurnal</button>
</div>`;
gambarLampiranJurnal();
hitungKarakterJurnal();
}
function sisaFotoJurnal() {
return JR_FOTO_MAKS - (AppState.fotoJurnal || []).length;
}
/**
 * "Ambil Foto" menyalakan kamera perangkat; "Pilih dari Galeri" membuka berkas.
 *
 * AKAR MASALAH v8.8 — keduanya membuka jendela berkas yang sama persis:
 *
 *   1. Satu <input type=file> dipakai bergantian, dan atribut `capture`
 *      dipasang-lepas tepat sebelum .click(). `capture` hanyalah SARAN bagi
 *      peramban; di peramban desktop ia diabaikan sepenuhnya menurut
 *      spesifikasi, karena di sana tidak ada "mekanisme perekam" untuk dipilih.
 *      Di laptop, tombol itu MUSTAHIL membuka kamera lewat jalur ini.
 *   2. accept-nya berisi daftar EKSTENSI (".jpg,.png,…"). Android mencocokkan
 *      niat kamera lewat jenis MIME; dengan daftar ekstensi, Chrome kerap
 *      jatuh ke pemilih dokumen. Yang benar adalah accept="image/*".
 *   3. `multiple` berdampingan dengan `capture`. Perekam menghasilkan satu
 *      berkas, jadi keduanya saling bertentangan — beberapa versi Android
 *      menyelesaikan pertentangan itu dengan MEMBUANG `capture`.
 *
 * Perbaikannya berlapis, dari yang paling sesuai keinginan ke yang paling
 * mungkin tersedia:
 *
 *   Lapis 1  getUserMedia() — kamera hidup DI DALAM aplikasi. Sama di ponsel
 *            dan di laptop, dan persis mesin yang sudah dipakai halaman
 *            Presensi selama ini.
 *   Lapis 2  <input capture> khusus — bila getUserMedia tidak ada sama sekali
 *            (WebView lama, konteks tak aman). Di ponsel ini membuka aplikasi
 *            kamera bawaan.
 *   Lapis 3  pesan jujur + jalan ke Galeri — bila perangkatnya memang tidak
 *            punya kamera. Lebih baik daripada membuka jendela berkas sambil
 *            berpura-pura itu kamera.
 */
function ambilFotoJurnal(pakaiKamera) {
if (!pakaiKamera) { const g = $('jrFoto'); if (g) g.click(); return; }
if (sisaFotoJurnal() <= 0) {
toast('Dokumentasi maksimal ' + JR_FOTO_MAKS + ' foto.', 'warning');
return;
}
bukaKameraJurnal();
}
function kameraJurnalBawaan() {
const k = $('jrKamera');
if (!k) { toast('Kamera tidak tersedia. Gunakan "Pilih dari Galeri".', 'warning'); return; }
k.click();
}
function galeriJurnalDariModal() {
tutupModal();
const g = $('jrFoto');
if (g) g.click();
}

// ── Kamera jurnal: hidup di dalam modal (v9.0) ────────────────────────────
//
// Namanya berawalan jk- seluruhnya. Halaman Presensi sudah memiliki kamera
// dengan nama aktifkanKamera/jepretFoto/hentikanKamera dan AppState.streamKamera;
// keenam berkas app*.js berbagi SATU lingkup global, jadi nama yang sama akan
// menimpa diam-diam tanpa satu pun pesan galat.
const JK_JUDUL = 'Ambil Foto Dokumentasi';
function bukaKameraJurnal() {
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
kameraJurnalBawaan();
return;
}
AppState.jurnalJepretan = null;
bukaModal(JK_JUDUL, `
<div class="jk-panggung">
<video id="jkVideo" playsinline autoplay muted></video>
<canvas id="jkCanvas" hidden></canvas>
<div class="jk-lapis" id="jkLapis">
<span class="spinner"></span>
<p class="jk-lapis-teks">Menyalakan kamera…</p>
</div>
</div>
<div class="jk-aksi" id="jkAksi">
<button type="button" class="btn btn-outline jk-btn-balik" onclick="balikKameraJurnal()"
title="Kamera depan / belakang"><span class="mi">cameraswitch</span> Balik</button>
<button type="button" class="btn btn-primary jk-btn-rana" onclick="jepretJurnal()">
<span class="mi">camera</span> Jepret</button>
</div>
<p class="jk-info"><span class="mi">lightbulb</span>
Arahkan ke aktivitas atau hasil pekerjaan Anda, pastikan tidak buram, lalu tekan Jepret.</p>`,
// Rana dan pembalik kamera duduk TEPAT DI BAWAH jendela bidiknya, bukan di
// kaki modal. Itu tempat yang dicari jempol di setiap aplikasi kamera, dan di
// layar 390 px kaki modal memaksa ketiga tombol menumpuk tiga baris — rananya
// terlempar jauh dari gambar yang sedang dibidik.
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal }]);
nyalakanKameraJurnal(AppState.arahKameraJurnal || 'environment');
}
function nyalakanKameraJurnal(arah) {
hentikanKameraJurnal();
navigator.mediaDevices.getUserMedia({
video: { facingMode: arah, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
.then(function (stream) {
const v = $('jkVideo');
// Modal sudah ditutup sementara izin ditunggu. Aliran yang terlanjur
// terbuka harus tetap dimatikan, atau lampu kameranya menyala tanpa layar.
if (!v) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
AppState.streamJurnal = stream;
AppState.arahKameraJurnal = arah;
v.srcObject = stream;
v.classList.toggle('jk-cermin', arah === 'user');
const lapis = $('jkLapis');
if (lapis) lapis.hidden = true;
v.play().catch(function () {});
})
.catch(function (e) { gagalKameraJurnal(e); });
}
function balikKameraJurnal() {
const semula = AppState.arahKameraJurnal || 'environment';
const arah = semula === 'environment' ? 'user' : 'environment';
const lapis = $('jkLapis');
if (lapis) lapis.hidden = false;
nyalakanKameraJurnal(arah);
}
/**
 * Kegagalan kamera diterangkan DI TEMPAT, bukan lewat toast yang lalu hilang.
 * Penyebab paling sering — izin pernah ditolak — hanya bisa dipulihkan lewat
 * setelan peramban, dan petunjuknya harus tetap terbaca sambil dikerjakan.
 */
function gagalKameraJurnal(e) {
const lapis = $('jkLapis');
if (!lapis) return;
const nama = e && e.name;
const takAdaKamera = nama === 'NotFoundError' || nama === 'DevicesNotFoundError';
// Rana disingkirkan bersama kegagalannya. Tombol Jepret yang tetap terpampang
// di bawah layar yang gelap hanya mengundang ketukan yang tidak berbuah apa-apa.
const aksi = $('jkAksi');
if (aksi) aksi.hidden = true;
lapis.hidden = false;
lapis.innerHTML = '<span class="mi jk-lapis-ikon">videocam_off</span>' +
'<p class="jk-lapis-judul">' +
(takAdaKamera ? 'Perangkat ini tidak punya kamera' : 'Kamera tidak dapat dinyalakan') + '</p>' +
'<p class="jk-lapis-teks">' + esc(pesanGalatKamera(e)) + '</p>' +
'<div class="jk-lapis-aksi">' +
(takAdaKamera ? '' :
'<button type="button" class="btn btn-outline btn-sm" onclick="bukaKameraJurnal()">' +
'<span class="mi">refresh</span> Coba Lagi</button>') +
'<button type="button" class="btn btn-primary btn-sm" onclick="galeriJurnalDariModal()">' +
'<span class="mi">photo_library</span> Pilih dari Galeri</button></div>';
}
function jepretJurnal() {
const v = $('jkVideo'), k = $('jkCanvas');
if (!AppState.streamJurnal || !v || !v.videoWidth || !k) {
toast('Kamera belum siap. Tunggu sebentar lalu coba lagi.', 'warning');
return;
}
// Diturunkan ke 900 px — ukuran yang sama dengan foto dari galeri, supaya
// dokumentasi dari kedua jalur berbobot sama dan sama cepatnya dibuka guru.
const skala = Math.min(1, 900 / v.videoWidth);
k.width = Math.round(v.videoWidth * skala);
k.height = Math.round(v.videoHeight * skala);
const c = k.getContext('2d');
// Kamera depan ditampilkan sebagai cermin agar wajar saat mengarahkan, jadi
// hasilnya ikut dicerminkan supaya sama persis dengan yang tadi dilihat.
if ((AppState.arahKameraJurnal || 'environment') === 'user') {
c.translate(k.width, 0); c.scale(-1, 1);
}
c.drawImage(v, 0, 0, k.width, k.height);
AppState.jurnalJepretan = k.toDataURL(jenisGambarTerbaik(), 0.65);
hentikanKameraJurnal();
pratinjauJepretanJurnal();
}
function pratinjauJepretanJurnal() {
bukaModal('Pratinjau Dokumentasi', `
<div class="jk-panggung">
<img class="jk-hasil" src="${esc(AppState.jurnalJepretan || '')}" alt="Pratinjau foto dokumentasi">
</div>
<div class="jk-aksi" id="jkAksi">
<button type="button" class="btn btn-outline" onclick="bukaKameraJurnal()">
<span class="mi">refresh</span> Ambil Ulang</button>
<button type="button" class="btn btn-primary jk-btn-rana" onclick="pakaiJepretanJurnal()">
<span class="mi">check</span> Gunakan Foto</button>
</div>
<p class="jk-info"><span class="mi">check_circle</span>
Sudah jelas dan terbaca? Bila belum, ambil ulang sebelum disimpan.</p>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal }]);
}
function pakaiJepretanJurnal() {
const data = AppState.jurnalJepretan;
if (!data) { tutupModal(); return; }
// Kuotanya diperiksa LAGI di sini, bukan hanya sebelum kamera dibuka: foto
// lain bisa saja masuk lewat galeri sementara modalnya terbuka.
if (sisaFotoJurnal() <= 0) {
toast('Dokumentasi maksimal ' + JR_FOTO_MAKS + ' foto.', 'warning');
tutupModal();
return;
}
AppState.fotoJurnal = AppState.fotoJurnal || [];
AppState.fotoJurnal.push({ data: data, url: data });
AppState.jurnalJepretan = null;
tutupModal();
gambarLampiranJurnal();
toast('Dokumentasi ditambahkan.', 'success');
}
function hentikanKameraJurnal() {
const s = AppState.streamJurnal;
if (s) { try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
AppState.streamJurnal = null;
const v = $('jkVideo');
if (v) v.srcObject = null;
}
function gambarLampiranJurnal() {
const box = $('jrLampiran');
if (!box) return;
const daftar = AppState.fotoJurnal || [];
box.innerHTML = daftar.map(function (f, i) {
return `<div class="jr-lampiran-item">
<img src="${esc(f.url)}" alt="Dokumentasi ke-${i + 1}" loading="lazy">
<button type="button" class="jr-lampiran-buang" aria-label="Hapus dokumentasi ke-${i + 1}"
onclick="buangFotoJurnal(${i})"><span class="mi">close</span></button>
</div>`;
}).join('') +
// Tombol tambah menghilang saat kuotanya habis, bukan dipadamkan: tombol yang
// terlihat tetapi tidak melakukan apa-apa membuat penggunanya mengetuk
// berulang kali dan menyimpulkan aplikasinya menggantung.
(daftar.length >= JR_FOTO_MAKS ? '' :
`<button type="button" class="jr-lampiran-tambah"
onclick="ambilFotoJurnal(false)"
aria-label="Tambah foto dokumentasi"><span class="mi">add</span></button>`);
const sisa = $('errJrFoto');
if (sisa && daftar.length) sisa.textContent = '';
}
function buangFotoJurnal(i) {
const daftar = AppState.fotoJurnal || [];
daftar.splice(i, 1);
AppState.fotoJurnal = daftar;
gambarLampiranJurnal();
}
// Penghitung karakter yang hanya bersuara saat mendekati batas. Menampilkan
// "12 / 1000" sejak huruf pertama hanya menambah keramaian; yang berguna
// adalah peringatan ketika ruangnya benar-benar mau habis.
function hitungKarakterJurnal() {
[['jrKegiatan', 'jrHitungKegiatan', JR_BATAS.kegiatan, true],
 ['jrPembelajaran', 'jrHitungPembelajaran', JR_BATAS.pembelajaran, false],
 ['jrKendala', 'jrHitungKendala', JR_BATAS.kendala, false]].forEach(function (b) {
const ta = $(b[0]), out = $(b[1]);
if (!ta || !out) return;
const n = ta.value.length, sisa = b[2] - n;
out.textContent = (b[3] && n < 10) ? (10 - n) + ' karakter lagi'
  : sisa <= 150 ? 'sisa ' + sisa + ' karakter' : '';
out.classList.toggle('kritis', sisa <= 50 || (b[3] && n < 10));
});
}
function pratinjauFotoJurnal(event) {
const berkas = Array.prototype.slice.call(event.target.files || []);
// Kotak berkasnya SELALU dikosongkan, bahkan saat gagal. Kalau tidak, memilih
// berkas yang sama dua kali berturut-turut tidak memicu onchange sama sekali —
// pengguna yang baru menghapus satu foto lalu memilihnya kembali akan melihat
// tidak terjadi apa-apa.
event.target.value = '';
if (!berkas.length) return;
const daftar = AppState.fotoJurnal || [];
const ruang = JR_FOTO_MAKS - daftar.length;
if (ruang <= 0) { toast('Dokumentasi maksimal ' + JR_FOTO_MAKS + ' foto.', 'warning'); return; }
if (berkas.length > ruang) toast('Hanya ' + ruang + ' foto lagi yang bisa ditambahkan.', 'warning');
const dipakai = berkas.slice(0, ruang).filter(function (f) {
if (f.type.startsWith('image/')) return true;
toast('Berkas "' + f.name + '" bukan gambar dan dilewati.', 'error');
return false;
});
if (!dipakai.length) return;
Promise.all(dipakai.map(function (f) { return kompresGambar(f, 900, 0.65); }))
.then(function (hasil) {
hasil.forEach(function (dataUrl) {
if ((AppState.fotoJurnal || []).length < JR_FOTO_MAKS) {
AppState.fotoJurnal.push({ data: dataUrl, url: dataUrl });
}
});
gambarLampiranJurnal();
})
.catch(function () { toast('Gambar tidak dapat dibaca.', 'error'); });
}
async function kirimJurnal() {
const kegiatan = $('jrKegiatan').value.trim();
bersihkanBidangGalat([['jrKegiatan', 'errJrKegiatan']]);
$('errJrFoto').textContent = '';
if (kegiatan.length < 10) {
tandaiBidangGalat('jrKegiatan', 'errJrKegiatan', 'Uraian kegiatan minimal 10 karakter.');
return;
}
// Dokumentasi wajib sejak v8.7. Diperiksa di klien DAN di server: yang di
// klien supaya penggunanya tahu sebelum menunggu unggahan, yang di server
// supaya aturannya tetap berlaku bagi permintaan yang tidak lewat layar ini.
const daftar = AppState.fotoJurnal || [];
if (!daftar.length) {
$('errJrFoto').textContent = 'Lampirkan minimal satu foto dokumentasi.';
toast('Lampirkan minimal satu foto dokumentasi.', 'warning');
const lam = $('jrLampiran');
if (lam) gulirKeTengah(lam.closest('.field') || lam);
return;
}
const tanggal = $('jrTanggal').value;
tampilkanSibuk('Menyimpan jurnal…');
try {
const res = await panggil('submitJurnal', AppState.sessionToken, {
tanggal: tanggal, kegiatan: kegiatan,
pembelajaran: $('jrPembelajaran').value.trim(),
kendala: $('jrKendala').value.trim(),
fotoTetap: daftar.filter(function (f) { return f.id; }).map(function (f) { return f.id; }),
fotoBaru: daftar.filter(function (f) { return !f.id && f.data; }).map(function (f) { return f.data; })
});
sembunyikanSibuk();
if (!res.success) {
// Server sibuk: tidak ada baris yang tertulis, dan mencoba lagi memang jalan
// keluarnya. Kuning, bukan merah — merah berarti ditolak. (v9.3)
const sibuk = !!(res.data && res.data.sibuk);
toast(res.message, sibuk ? 'warning' : 'error', sibuk ? 11000 : 6000);
return;
}
AppState.fotoJurnal = null;
batalkanPaketData();
// Layar konfirmasinya membaca keadaan ini, dan datanya disegarkan SEBELUM
// berpindah supaya ringkasan yang dilihat sesudahnya sudah memuat jurnal
// yang barusan dikirim.
AppState.jurnalSukses = { tanggal: tanggal, ubah: !!AppState.jurnalUbah };
AppState.jurnalUbah = null;
await muatJurnalSiswa(true);
navigateTo('jurnal-sukses');
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

// ── Layar 4: Jurnal tersimpan ─────────────────────────────────────────────
async function initJurnalSukses() {
// Halaman ini hanya punya arti tepat sesudah menyimpan. Dibuka langsung —
// dari tombol kembali peramban, misalnya — ia tidak punya apa pun untuk
// dikonfirmasi, jadi pembacanya dikembalikan ke berandanya.
if (!AppState.jurnalSukses) { navigateTo('jurnal'); return; }
if (!await muatJurnalSiswa()) return;
gambarSuksesJurnal();
}
function gambarSuksesJurnal() {
const box = $('jtIsi');
if (!box) return;
const s = AppState.jurnalSukses || {};
const j = (AppState.dataJurnal || []).filter(function (x) { return x.tanggal === s.tanggal; })[0];
const status = j ? j.status : 'Menunggu';
box.innerHTML = `
<section class="jt-kotak">
<div class="jt-tanda" aria-hidden="true"><span class="mi">check</span></div>
<h1 class="jt-judul">Jurnal Berhasil ${s.ubah ? 'Diperbarui' : 'Disimpan'}!</h1>
<p class="jt-tgl">${esc(tglSingkat(s.tanggal))}</p>
<div class="jt-chip">${chipStatus(status)}</div>
<p class="jt-pesan">Jurnal Anda berhasil ${s.ubah ? 'diperbarui' : 'disimpan'} dan
menunggu persetujuan guru pembimbing.</p>
<div class="jt-lanjut">
<span class="mi">tips_and_updates</span>
<div><strong>Selanjutnya</strong>
<p>Terus catat kegiatan harianmu secara rutin untuk hasil yang lebih baik.</p></div>
</div>
<div class="jt-aksi">
<button class="btn btn-primary btn-block" onclick="bukaJurnalTersimpan()">
<span class="mi">visibility</span> Lihat Jurnal Saya</button>
<button class="btn-ghost" onclick="bukaJurnalBaru()">
<span class="mi">add</span> Buat Jurnal Lagi</button>
</div>
</section>`;
}
// "Lihat Jurnal Saya" membuka jurnal yang BARUSAN disimpan, bukan daftar.
// Membuka daftar berarti penggunanya harus mencari sendiri baris yang baru
// saja ia kirim — padahal kita tahu persis yang mana.
function bukaJurnalTersimpan() {
const s = AppState.jurnalSukses || {};
const j = (AppState.dataJurnal || []).filter(function (x) { return x.tanggal === s.tanggal; })[0];
AppState.jurnalSukses = null;
if (j) bukaJurnalDetail(j.id); else navigateTo('jurnal-riwayat');
}

// ── Layar 5: Riwayat Jurnal ───────────────────────────────────────────────
const JR_TABEL = 'jurnalSiswa';
const JR_SARING = { status: 'semua', periode: 'semua', dari: '', sampai: '' };
const JR_OPSI_STATUS = [['semua', 'Semua'], ['Disetujui', 'Disetujui'],
                        ['Menunggu', 'Menunggu'], ['Revisi', 'Revisi']];
const JR_LABEL_PERIODE = { semua: 'Semua periode', harian: 'Hari ini',
  mingguan: '7 hari terakhir', bulanan: 'Bulan ini', kustom: 'Rentang pilihan' };
function stRiwayatJurnal() { return (AppState.tabel || {})[JR_TABEL]; }
function kunciCariRiwayatJurnal() {
const st = stRiwayatJurnal();
return st ? String(st.cari || '').trim().toLowerCase() : '';
}
async function initJurnalRiwayat() {
if (!await muatJurnalSiswa()) return;
JR_SARING.status = 'semua'; JR_SARING.periode = 'semua';
JR_SARING.dari = ''; JR_SARING.sampai = '';
AppState.saring = AppState.saring || {};
AppState.saring.jr = {};
AppState.tabel = AppState.tabel || {};
AppState.tabel[JR_TABEL] = {
cfg: { id: JR_TABEL, idPrefix: 'jrT', gambarSendiri: gambarRiwayatJurnal },
data: [], cari: '', sortKey: null, sortDir: 'asc',
halaman: 1, perHal: PER_HAL_BAWAAN, filterNilai: {}, terpilih: {}
};
// Panel saringnya dirakit di klien — bentuk dan id-nya sama persis dengan
// halaman Detail Presensi dan Detail Jurnal, jadi bukaPanelFilter/ubahSaring
// bawaan bekerja tanpa perlu tahu siapa yang merakitnya.
const panel = $('jrPanelSaring');
if (panel) {
panel.innerHTML = panelSaringKlien('jr', 'Saring Riwayat Jurnal', [
{ k: 'periode', label: 'Periode',
  opsi: [['', 'Semua periode'], ['harian', 'Hari ini'], ['mingguan', '7 hari terakhir'],
         ['bulanan', 'Bulan ini'], ['kustom', 'Rentang tanggal sendiri']], bawaan: '' }
], `
<div class="dj-kustom" id="jrKustom" hidden>
<div class="filter-field">
<label class="filter-label" for="jrDari">Dari Tanggal</label>
<input class="field-input" type="date" id="jrDari" onchange="ubahRentangRiwayatJurnal()">
</div>
<div class="filter-field">
<label class="filter-label" for="jrSampai">Sampai Tanggal</label>
<input class="field-input" type="date" id="jrSampai" onchange="ubahRentangRiwayatJurnal()">
</div>
<p class="dj-kustom-pesan" id="jrKustomPesan" role="status"></p>
</div>`, 'resetSaringRiwayatJurnal()');
}
const bar = $('jrStatus');
if (bar) bar.innerHTML = JR_OPSI_STATUS.map(function (o, i) {
return `<button class="seg-btn${i === 0 ? ' active' : ''}" type="button" data-status="${esc(o[0])}"
aria-pressed="${i === 0 ? 'true' : 'false'}"
onclick="saringStatusJurnal('${o[0]}', this)">${o[1]}<span class="seg-angka">0</span></button>`;
}).join('');
pasangToolbarTabel(AppState.tabel[JR_TABEL].cfg);
daftarkanSaring('jr', terapkanSaringRiwayat);
perbaruiLencanaSaring('jr');
gambarRiwayatJurnal();
}
function terapkanSaringRiwayat() {
JR_SARING.periode = nilaiSaring('jr', 'periode') || 'semua';
const kustom = $('jrKustom');
const tadinyaTertutup = kustom ? kustom.hidden : true;
if (kustom) kustom.hidden = (JR_SARING.periode !== 'kustom');
// Fokus langsung ke kolom tanggal pertama pada saat Kustom BARU dipilih.
if (JR_SARING.periode === 'kustom' && tadinyaTertutup && $('jrDari')) {
try { $('jrDari').focus({ preventScroll: true }); } catch (e) {}
}
const st = stRiwayatJurnal();
if (st) st.halaman = 1;
gambarRiwayatJurnal();
}
function ubahRentangRiwayatJurnal() {
JR_SARING.dari = $('jrDari') ? $('jrDari').value : '';
JR_SARING.sampai = $('jrSampai') ? $('jrSampai').value : '';
const pesan = $('jrKustomPesan');
if (pesan) {
pesan.textContent = (JR_SARING.dari && JR_SARING.sampai && JR_SARING.dari > JR_SARING.sampai)
  ? 'Tanggal mulai melewati tanggal akhir.' : '';
}
// Rentang terbalik tidak dipakai menyaring — ia hanya diberitahukan.
if (JR_SARING.dari && JR_SARING.sampai && JR_SARING.dari > JR_SARING.sampai) return;
const st = stRiwayatJurnal();
if (st) st.halaman = 1;
gambarRiwayatJurnal();
}
function saringStatusJurnal(nilai, el) {
JR_SARING.status = nilai;
const bar = el && el.parentNode;
if (bar) Array.prototype.forEach.call(bar.querySelectorAll('.seg-btn'), function (b) {
b.classList.toggle('active', b === el);
b.setAttribute('aria-pressed', b === el ? 'true' : 'false');
});
const st = stRiwayatJurnal();
if (st) st.halaman = 1;
gambarRiwayatJurnal();
}
function resetSaringRiwayatJurnal() {
JR_SARING.dari = ''; JR_SARING.sampai = ''; JR_SARING.status = 'semua';
if ($('jrDari')) $('jrDari').value = '';
if ($('jrSampai')) $('jrSampai').value = '';
if ($('jrKustomPesan')) $('jrKustomPesan').textContent = '';
if ($('jrTCari')) $('jrTCari').value = '';
const st = stRiwayatJurnal();
if (st) { st.cari = ''; st.halaman = 1; }
const bar = $('jrStatus');
if (bar) Array.prototype.forEach.call(bar.querySelectorAll('.seg-btn'), function (b, i) {
b.classList.toggle('active', i === 0);
b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
});
resetSaring('jr');
if (typeof SARING_TERAPKAN.jr !== 'function') {
JR_SARING.periode = 'semua';
if ($('jrKustom')) $('jrKustom').hidden = true;
gambarRiwayatJurnal();
}
}
function mundurHariJurnal(iso, n) {
const d = new Date(String(iso) + 'T00:00:00');
if (isNaN(d)) return iso;
d.setDate(d.getDate() - n);
return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
       '-' + String(d.getDate()).padStart(2, '0');
}
function rentangRiwayatJurnal() {
const kini = AppState.jurnalHariIni || '';
const p = JR_SARING.periode;
if (p === 'kustom') {
// Rentang kustom yang belum lengkap TIDAK menyaring apa pun. Menyaring
// setengah jalan membuat daftarnya berubah sebelum penggunanya selesai
// memilih, dan perubahan yang tidak diminta terbaca seperti kerusakan.
if (!JR_SARING.dari || !JR_SARING.sampai) return null;
return { dari: JR_SARING.dari, sampai: JR_SARING.sampai };
}
if (!kini || p === 'semua') return null;
if (p === 'harian') return { dari: kini, sampai: kini };
if (p === 'mingguan') return { dari: mundurHariJurnal(kini, 6), sampai: kini };
if (p === 'bulanan') {
const akhir = new Date(Number(kini.slice(0, 4)), Number(kini.slice(5, 7)), 0);
return { dari: kini.slice(0, 7) + '-01',
         sampai: kini.slice(0, 7) + '-' + String(akhir.getDate()).padStart(2, '0') };
}
return null;
}
function cocokKunciRiwayatJurnal(j, q) {
if (!q) return true;
return (String(j.kegiatan || '') + ' ' + String(j.pembelajaran || '') + ' ' +
        String(j.kendala || '') + ' ' + String(j.komentar || '') + ' ' +
        String(j.status || '') + ' ' + String(j.tanggal || '') + ' ' +
        tglSingkat(j.tanggal)).toLowerCase().indexOf(q) !== -1;
}
// Yang sudah lolos PERIODE dan KATA KUNCI, tetapi belum lolos status — dipakai
// menghitung angka pada tiap cip status. Cip bertuliskan "Menunggu 3" yang
// menyisakan daftar kosong adalah cip yang berbohong.
function dasarRiwayatJurnal() {
const r = rentangRiwayatJurnal();
const q = kunciCariRiwayatJurnal();
return (AppState.dataJurnal || []).filter(function (j) {
if (r && !(j.tanggal >= r.dari && j.tanggal <= r.sampai)) return false;
return cocokKunciRiwayatJurnal(j, q);
});
}
function saringRiwayatAktif() {
return JR_SARING.status !== 'semua' || JR_SARING.periode !== 'semua' ||
  !!kunciCariRiwayatJurnal();
}
function gambarRiwayatJurnal() {
const box = $('jrDaftar');
if (!box) return;
const semua = AppState.dataJurnal || [];
const dasar = dasarRiwayatJurnal();
const items = JR_SARING.status === 'semua' ? dasar
  : dasar.filter(function (j) { return j.status === JR_SARING.status; });

const hitung = { semua: dasar.length, Disetujui: 0, Menunggu: 0, Revisi: 0 };
dasar.forEach(function (j) { if (hitung[j.status] !== undefined) hitung[j.status]++; });
const bar = $('jrStatus');
if (bar) Array.prototype.forEach.call(bar.querySelectorAll('.seg-btn'), function (b) {
const k = b.getAttribute('data-status');
const n = b.querySelector('.seg-angka');
if (n) n.textContent = hitung[k] === undefined ? '0' : hitung[k];
// Status yang tidak ada satu pun dipadamkan, bukan disembunyikan: cip yang
// hilang-timbul membuat barisnya bergoyang dan mata kehilangan jangkar.
b.classList.toggle('seg-btn-kosong', k !== 'semua' && !hitung[k]);
});

const jml = $('jrJumlah');
if (jml) jml.textContent = items.length + ' dari ' + semua.length + ' jurnal';

// Daftar yang tidak lengkap tidak boleh terbaca seperti data yang hilang.
const ring = $('jrRingkasSaring');
if (ring) {
if (!saringRiwayatAktif()) { ring.hidden = true; ring.innerHTML = ''; }
else {
const r = rentangRiwayatJurnal();
const bagian = [];
if (JR_SARING.periode !== 'semua') {
bagian.push(JR_LABEL_PERIODE[JR_SARING.periode] +
  (JR_SARING.periode === 'kustom' && r ? ' · ' + tglRingkas(r.dari) + ' – ' + tglRingkas(r.sampai) : ''));
}
if (JR_SARING.status !== 'semua') bagian.push('Status ' + JR_SARING.status);
const q = kunciCariRiwayatJurnal();
if (q) bagian.push('Kata kunci "' + String(stRiwayatJurnal().cari).trim() + '"');
ring.hidden = false;
ring.innerHTML = `<span class="mi">filter_alt</span>
<span>Menampilkan <b>${items.length}</b> dari ${semua.length} jurnal &middot;
${esc(bagian.join(' · '))}</span>
<button class="btn-ghost btn-xs" onclick="resetSaringRiwayatJurnal()">
<span class="mi">restart_alt</span> Atur ulang</button>`;
}
}

if (!items.length) {
const q = kunciCariRiwayatJurnal();
box.innerHTML = semua.length
  ? emptyState('filter_alt_off', q ? 'Tidak ada hasil pencarian' : 'Tidak ada jurnal pada saringan ini',
      q ? 'Tidak ada jurnal yang cocok dengan kata kunci "' +
          String(stRiwayatJurnal().cari).trim() + '" pada saringan yang dipilih.'
        : 'Anda punya ' + semua.length + ' jurnal, tetapi tidak ada yang cocok dengan ' +
          'periode dan status yang dipilih.',
      `<button class="btn btn-outline btn-sm" onclick="resetSaringRiwayatJurnal()">
       <span class="mi">restart_alt</span> Tampilkan semua jurnal</button>`)
  : emptyState('note_add', 'Belum ada jurnal',
      'Mulailah mencatat kegiatan PKL Anda hari ini.',
      `<button class="btn btn-primary" onclick="bukaJurnalBaru()">
       <span class="mi">add</span> Tulis Jurnal</button>`);
return;
}

const st = stRiwayatJurnal();
const total = items.length;
const perHal = (st && st.perHal > 0) ? st.perHal : total;
const totalHal = Math.max(1, Math.ceil(total / (perHal || 1)));
if (st && st.halaman > totalHal) st.halaman = totalHal;
const mulai = st ? (st.halaman - 1) * perHal : 0;
const potong = items.slice(mulai, mulai + perHal);

// Dikelompokkan PER BULAN, sesudah dipotong per halaman — judul bulannya
// harus menerangkan baris yang benar-benar ada di halaman ini.
const urut = [], perBulan = {};
potong.forEach(function (j) {
const k = String(j.tanggal).slice(0, 7);
if (!perBulan[k]) { perBulan[k] = []; urut.push(k); }
perBulan[k].push(j);
});
// Nomor urut berjalan melintasi batas bulan supaya animasi masuknya mengalir
// sebagai satu perjalanan, bukan mulai ulang di tiap judul bulan.
let ke = 0;
box.innerHTML = `<div class="tl">` + urut.map(function (k) {
return penandaBulanLiniMasa(`<div class="dj-bulan"><span>${esc(labelBulanJurnal(k))}</span>
<span class="dj-bulan-jml">${perBulan[k].length} jurnal</span></div>`) +
perBulan[k].map(function (j) {
return langkahLiniMasa(j.status, kartuRiwayatJurnal(j), ke++);
}).join('');
}).join('') + `</div>` +
(st ? paginasiHtml(JR_TABEL, total, totalHal, mulai, potong.length) : '');
}

// ── Layar 6–9: Detail satu jurnal ─────────────────────────────────────────
async function initJurnalDetail() {
if (!AppState.jurnalPilih) { navigateTo('jurnal-riwayat'); return; }
if (!await muatJurnalSiswa()) return;
gambarDetailJurnalSiswa();
}
function gambarDetailJurnalSiswa() {
const box = $('jdIsi');
if (!box) return;
const j = jurnalMilik(AppState.jurnalPilih);
if (!j) {
box.innerHTML = emptyState('search_off', 'Jurnal tidak ditemukan',
'Jurnal ini sudah tidak ada. Mungkin sudah dihapus.',
`<button class="btn btn-outline" onclick="navigateTo('jurnal-riwayat')">
 <span class="mi">history_edu</span> Buka Riwayat</button>`);
return;
}
const f = fotoJurnal(j);
const tanda = tandaHariJurnal(j.tanggal);
const bidang = [
{ ikon: 'work_history', label: 'Kegiatan Hari Ini', nilai: j.kegiatan, wajib: true },
{ ikon: 'lightbulb', label: 'Pembelajaran / Hal Baru', nilai: j.pembelajaran },
{ ikon: 'report_problem', label: 'Tantangan / Kendala', nilai: j.kendala }
];
box.innerHTML = `
<section class="jd-kepala nada-${JR_NADA[j.status] || 'warn'}">
<div class="jd-kepala-teks">
<h1 class="jd-tgl">${esc(tglRingkas(j.tanggal))}</h1>
<p class="jd-sub">${tanda ? esc(tanda) + ' &middot; ' : ''}${j.tanggalReview
  ? 'Direview ' + esc(tglRingkas(j.tanggalReview)) : 'Menunggu review guru pembimbing'}</p>
</div>
${chipStatus(j.status)}
</section>

${j.status === 'Revisi' ? `<div class="jd-banner jd-banner-revisi">
<span class="mi">error</span>
<div><strong>Perlu Revisi</strong>
<p>${j.komentar ? esc(j.komentar) : 'Guru pembimbing meminta jurnal ini diperbaiki.'}</p>
${j.tanggalReview ? `<span class="jd-banner-waktu">${esc(tglSingkat(j.tanggalReview))}</span>` : ''}
</div></div>` : ''}

${j.status === 'Disetujui' ? `<div class="jd-banner jd-banner-setuju">
<span class="mi">verified</span>
<div><strong>Disetujui guru pembimbing</strong>
${j.tanggalReview ? `<span class="jd-banner-waktu">${esc(tglSingkat(j.tanggalReview))}</span>` : ''}
</div></div>` : ''}

<section class="card"><div class="card-body jd-bidang-wrap">
${bidang.map(function (b) {
return `<div class="jd-bidang">
<span class="jd-bidang-label"><span class="mi">${b.ikon}</span> ${b.label}</span>
<p class="jd-teks">${b.nilai ? esc(b.nilai)
  : '<span class="jd-hampa">Tidak diisi</span>'}</p>
</div>`;
}).join('')}
<div class="jd-bidang">
<span class="jd-bidang-label"><span class="mi">photo_library</span> Dokumentasi
(${f.length})</span>
${f.length ? `<div class="jd-galeri">${f.map(function (x, i) {
return `<button type="button" class="dj-foto"
aria-label="Perbesar dokumentasi ke-${i + 1}"
onclick="bukaPratinjau('Dokumentasi ${esc(tglSingkat(j.tanggal))}','${esc(x.besar)}','','gambar')">
<img src="${esc(x.kecil)}" alt="Dokumentasi ke-${i + 1}" loading="lazy" decoding="async">
<span class="dj-foto-tanda"><span class="mi">zoom_in</span></span></button>`;
}).join('')}</div>` : '<p class="jd-teks"><span class="jd-hampa">Tidak ada dokumentasi</span></p>'}
</div>
</div></section>

${/* Pada keadaan Revisi, komentarnya SUDAH berdiri di spanduk merah di atas.
     Mencetaknya dua kali membuat pembacanya mengira ada dua catatan berbeda,
     lalu membandingkan keduanya kata demi kata untuk memastikan sama. */''}
${j.komentar && j.status !== 'Revisi' ? `<section class="card"><div class="card-body">
<div class="jd-komentar">
<span class="jd-komentar-ikon"><span class="mi">rate_review</span></span>
<div>
<strong>Komentar Guru</strong>
${j.tanggalReview ? `<span class="jd-komentar-waktu">${esc(tglSingkat(j.tanggalReview))}</span>` : ''}
<p>${esc(j.komentar)}</p>
</div>
</div>
</div></section>` : ''}

${j.status === 'Disetujui' ? '' : `<div class="jd-aksi">
${j.status === 'Revisi'
  ? `<button class="btn btn-primary btn-block" onclick="bukaUbahJurnal('${esc(j.id)}')">
     <span class="mi">build</span> Perbaiki Jurnal</button>`
  : `<button class="btn btn-outline" onclick="bukaUbahJurnal('${esc(j.id)}')">
     <span class="mi">edit</span> Edit</button>
     <button class="btn btn-danger" onclick="konfirmasiHapusJurnal('${esc(j.id)}')">
     <span class="mi">delete</span> Hapus</button>`}
</div>`}`;
}
function konfirmasiHapusJurnal(id) {
const d = jurnalMilik(id);
if (!d) { toast('Data jurnal tidak ditemukan. Muat ulang halaman.', 'warning'); return; }
// Menghapus tidak bisa dibatalkan, jadi yang ditampilkan bukan sekadar
// "Anda yakin?" melainkan APA yang akan hilang — tanggal dan kutipan isinya.
const cuplik = String(d.kegiatan || '');
bukaModal('Hapus Jurnal?', `
<p>Jurnal tanggal <strong>${esc(tglSingkat(d.tanggal))}</strong> akan dihapus permanen.</p>
<div class="jr-cuplik">${esc(cuplik.length > 160 ? cuplik.slice(0, 160) + '…' : cuplik)}</div>
<p class="field-help" style="margin-top:10px">Tindakan ini tidak dapat dibatalkan.</p>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">delete</span> Hapus', kelas: 'btn-danger',
aksi: () => { tutupModal(); kirimHapusJurnal(d.id); } }]);
}
async function kirimHapusJurnal(id) {
tampilkanSibuk('Menghapus jurnal…');
try {
const res = await panggil('hapusJurnal', AppState.sessionToken, id);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (!res.success) return;
batalkanPaketData();
await muatJurnalSiswa(true);
AppState.jurnalPilih = null;
navigateTo('jurnal-riwayat');
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

async function muatTempatPKL() {
const list = $('listTempatPKL');
if (list) list.innerHTML = memuatInline('Mengambil daftar tempat PKL…');
try {
const res = await panggilCepat('getDaftarTempatPKL', AppState.sessionToken, AppState.posisi || null);
if (!res.success) { toast(res.message, 'error'); return; }
AppState.dataTempat = res.data.items;
AppState.dataTempatPenuh = res.data;
renderStatusPendaftaran(res.data.pendaftaran, res.data);
renderStatusPindah(res.data);
renderDaftarTempat(res.data.items, res.data.pendaftaran, res.data);
} catch (err) {
list.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
function renderStatusPendaftaran(p, paket) {
const box = $('boxStatusPendaftaran');
if (!box) return;
const d = paket || {};
// Siswa yang sudah ditempatkan tidak perlu lagi melihat kartu pendaftaran —
// yang relevan baginya adalah kartu tempat PKL dan pengajuan pindah.
if (d.penempatan) {
box.parentElement.hidden = true;
return;
}
if (box.parentElement) box.parentElement.hidden = false;
if (d.terkunci) {
box.innerHTML = `<div class="alert alert-warning"><span class="mi">lock</span>
<div><strong>Pendaftaran mandiri sedang ditahan</strong>
<p>Pokja PKL menahan pendaftaran mandiri Anda${d.alasanKunci ? ' dengan alasan: ' + esc(d.alasanKunci) : ''}.
Penempatan PKL Anda akan ditentukan langsung oleh Pokja PKL. Silakan hubungi Pokja PKL
bila ingin menanyakan lebih lanjut.</p></div></div>`;
return;
}
if (!p) {
box.innerHTML = `<div class="alert alert-info"><span class="mi">info</span>
<div><strong>Belum ada pendaftaran</strong>
<p>Pilih salah satu tempat PKL di bawah, atau ajukan tempat pilihan Anda sendiri
dengan melampirkan surat pengantar dari instansi.</p></div></div>`;
return;
}
const gaya = { 'Diproses': 'warning', 'Diterima': 'success', 'Ditolak': 'error', 'Dibatalkan': 'info' }[p.status] || 'info';
box.innerHTML = `
<div class="alert alert-${gaya}">
<span class="mi">${p.status === 'Diterima' ? 'check_circle' : p.status === 'Ditolak' ? 'cancel' : 'hourglass_top'}</span>
<div style="flex:1">
<strong>Pendaftaran ${esc(p.status)}</strong>
<p><strong>${esc(p.namaTempat)}</strong><br>${esc(p.alamat)}</p>
<p style="margin-top:6px;font-size:13px">Diajukan ${tglSingkat(p.tanggalAjuan)}
${p.mandiri ? ' &middot; pengajuan mandiri' : ''}</p>
${p.catatan ? `<p style="margin-top:6px"><strong>Catatan Pokja:</strong> ${esc(p.catatan)}</p>` : ''}
</div>
</div>
<div class="btn-row" style="margin-top:12px">
${p.suratUrl ? `<button class="btn btn-outline btn-sm"
onclick="bukaPratinjau('Surat Pengantar','${esc(p.suratUrl)}','','gambar')">
<span class="mi">description</span> Lihat Surat</button>` : ''}
${p.status === 'Diproses' ? `<button class="btn btn-danger btn-sm" onclick="batalkanDaftar('${esc(p.id)}')">
<span class="mi">cancel</span> Batalkan Pendaftaran</button>` : ''}
</div>`;
}
function renderDaftarTempat(items, pendaftaran, paket) {
const list = $('listTempatPKL');
if (!list) return;
if (!items.length) {
list.innerHTML = emptyState('domain_disabled', 'Belum ada tempat PKL',
'Pokja PKL belum menambahkan daftar instansi.');
return;
}
const d = paket || {};
const terkunci = (d.terkunci) ||
(pendaftaran && ['Diproses', 'Diterima'].indexOf(pendaftaran.status) >= 0);
const sudahDitempatkan = !!d.penempatan;
const pindahMenunggu = !!(d.pengajuanPindah && d.pengajuanPindah.status === 'Menunggu');
list.innerHTML = items.map(t => {
const penuh = t.sisaKuota <= 0;
const iniTempatSaya = sudahDitempatkan && t.id === d.penempatan.tempatId;
return `<article class="place-card">
<div class="place-head">
<div class="place-icon"><span class="mi">domain</span></div>
<div style="flex:1;min-width:0">
<div class="place-name">${esc(t.nama)}</div>
<div class="place-addr">${esc(t.alamat)}</div>
</div>
<span class="chip ${penuh ? 'chip-error' : 'chip-success'}">
${penuh ? 'Kuota Penuh' : t.sisaKuota + ' / ' + t.kuotaTotal + ' tersisa'}</span>
</div>
<div class="place-meta">
${t.jarakKm !== null ? `<span class="meta-pill"><span class="mi">near_me</span>${t.jarakKm} km dari Anda</span>` : ''}
<span class="meta-pill"><span class="mi">person</span>${esc(t.pic)}</span>
<span class="meta-pill"><span class="mi">call</span>${esc(t.kontak)}</span>
<span class="meta-pill"><span class="mi">schedule</span>${jamTampil(t.jamMasuk)}–${jamTampil(t.jamPulang)}</span>
<span class="meta-pill"><span class="mi">calendar_month</span>${esc(t.hariKerja)}</span>
</div>
<div class="btn-row" style="margin-top:14px">
<button class="btn btn-outline btn-sm" onclick="lihatPetaTempat('${esc(t.id)}')">
<span class="mi">map</span> Lihat Peta</button>
${sudahDitempatkan
? `<button class="btn btn-primary btn-sm" onclick="bukaFormPindah('${esc(t.id)}')"
${penuh || iniTempatSaya || pindahMenunggu ? 'disabled' : ''}>
<span class="mi">${iniTempatSaya ? 'check' : 'swap_horiz'}</span>
${iniTempatSaya ? 'Tempat PKL Anda' : pindahMenunggu ? 'Menunggu Keputusan'
: penuh ? 'Kuota Penuh' : 'Ajukan Pindah ke Sini'}</button>`
: `<button class="btn btn-primary btn-sm" onclick="daftarKeTempat('${esc(t.id)}','${esc(t.nama)}')"
${penuh || terkunci ? 'disabled' : ''}>
<span class="mi">how_to_reg</span>
${terkunci ? 'Sudah Mendaftar' : penuh ? 'Kuota Penuh' : 'Daftar di Sini'}</button>`}
</div>
</article>`;
}).join('');
}
function lihatPetaTempat(id) {
const t = (AppState.dataTempat || []).find(x => x.id === id);
if (!t) return;
bukaModal(t.nama, `
<div class="map-box" style="height:280px">
<iframe src="${HTTPS}maps.google.com/maps?q=${t.latitude},${t.longitude}&z=17&output=embed"
title="Peta ${esc(t.nama)}" loading="lazy"></iframe>
</div>
<div class="list" style="margin-top:12px">
<div class="list-item"><div class="list-main"><div class="data-label">Alamat</div>
<div class="data-value">${esc(t.alamat)}</div></div></div>
<div class="list-item"><div class="list-main"><div class="data-label">Jam Kerja</div>
<div class="data-value">${jamTampil(t.jamMasuk)} – ${jamTampil(t.jamPulang)} &middot; ${esc(t.hariKerja)}</div></div></div>
<div class="list-item"><div class="list-main"><div class="data-label">Radius Presensi</div>
<div class="data-value">${t.radius} meter</div></div></div>
<div class="list-item"><div class="list-main"><div class="data-label">Koordinat</div>
<div class="data-value">${t.latitude}, ${t.longitude}</div></div></div>
</div>`, [{ label: 'Tutup', kelas: 'btn-primary', aksi: tutupModal }]);
}
async function daftarKeTempat(id, nama) {
const ya = await konfirmasi('Konfirmasi Pendaftaran',
`Ajukan pendaftaran PKL ke "${nama}"? Anda hanya dapat memiliki satu pendaftaran aktif dalam satu waktu.`,
'Ya, daftarkan', 'btn-primary');
if (!ya) return;
tampilkanSibuk('Mengirim pendaftaran…');
try {
const res = await panggil('ajukanPendaftaran', AppState.sessionToken, { tempatId: id });
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6000);
if (res.success) { batalkanPaketData(); muatTempatPKL(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function batalkanDaftar(id) {
const ya = await konfirmasi('Batalkan Pendaftaran',
'Pendaftaran akan dibatalkan dan Anda dapat mendaftar ke tempat lain. Lanjutkan?', 'Ya, batalkan');
if (!ya) return;
tampilkanSibuk('Membatalkan…');
try {
const res = await panggil('batalkanPendaftaran', AppState.sessionToken, id);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) { batalkanPaketData(); muatTempatPKL(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function bukaFormMandiri() {
bukaModal('Ajukan Tempat PKL Sendiri', `
<div class="alert alert-warning" style="margin-bottom:16px">
<span class="mi">info</span>
<div><strong>Wajib melampirkan surat</strong>
<p>Sertakan surat pengantar atau pernyataan diterima yang ditandatangani pihak instansi.</p></div>
</div>
<div class="field">
<label class="field-label" for="mdNama">Nama Instansi</label>
<input class="field-input" id="mdNama" type="text" maxlength="120" placeholder="Contoh: CV. Karya Mandiri">
<div class="field-error" id="errMdNama"></div>
</div>
<div class="field">
<label class="field-label" for="mdAlamat">Alamat Lengkap</label>
<textarea class="field-input" id="mdAlamat" rows="2" maxlength="250"></textarea>
</div>
<div class="field">
<label class="field-label">Koordinat Lokasi (opsional)</label>
<div class="btn-row">
<input class="field-input" id="mdLat" type="text" placeholder="Latitude" style="flex:1;min-width:120px">
<input class="field-input" id="mdLng" type="text" placeholder="Longitude" style="flex:1;min-width:120px">
</div>
<button type="button" class="btn btn-outline btn-sm btn-block" style="margin-top:8px"
onclick="isiKoordinatSekarang()">
<span class="mi">my_location</span> Gunakan Lokasi Saya Sekarang</button>
</div>
<div class="field">
<label class="field-label" for="mdSurat">Surat Pengantar / Pernyataan Diterima</label>
<div class="dropzone" onclick="document.getElementById('mdSurat').click()">
<span class="mi">upload_file</span>
<p id="mdNamaSurat">Ketuk untuk memilih berkas (PDF atau foto)</p>
</div>
<input type="file" id="mdSurat" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" hidden onchange="siapkanSurat(event)">
<div class="field-error" id="errMdSurat"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">send</span> Ajukan', kelas: 'btn-primary', aksi: kirimPengajuanMandiri }]);
}
function isiKoordinatSekarang() {
if (AppState.posisi) {
$('mdLat').value = AppState.posisi.latitude.toFixed(6);
$('mdLng').value = AppState.posisi.longitude.toFixed(6);
toast('Koordinat terisi dari lokasi Anda saat ini.', 'success');
return;
}
if (!navigator.geolocation) { toast('Perangkat tidak mendukung deteksi lokasi.', 'error'); return; }
tampilkanSibuk('Mendeteksi lokasi…');
navigator.geolocation.getCurrentPosition(
pos => {
sembunyikanSibuk();
$('mdLat').value = pos.coords.latitude.toFixed(6);
$('mdLng').value = pos.coords.longitude.toFixed(6);
toast('Koordinat berhasil diisi.', 'success');
},
() => { sembunyikanSibuk(); toast('Lokasi tidak terbaca. Isi koordinat manual.', 'warning'); },
{ enableHighAccuracy: true, timeout: 15000 });
}
function siapkanSurat(event) {
const file = event.target.files && event.target.files[0];
if (!file) return;
if (file.size > 5 * 1024 * 1024) { $('errMdSurat').textContent = 'Ukuran berkas maksimal 5 MB.'; return; }
$('errMdSurat').textContent = '';
const reader = new FileReader();
reader.onload = e => {
AppState.suratMandiri = { base64: e.target.result, nama: file.name, mime: file.type };
$('mdNamaSurat').textContent = file.name;
};
reader.readAsDataURL(file);
}
async function kirimPengajuanMandiri() {
const nama = $('mdNama').value.trim();
$('errMdNama').textContent = ''; $('errMdSurat').textContent = '';
if (!nama) { $('errMdNama').textContent = 'Nama instansi wajib diisi.'; return; }
if (!AppState.suratMandiri) { $('errMdSurat').textContent = 'Surat pengantar wajib dilampirkan.'; return; }
tampilkanSibuk('Mengirim pengajuan…');
try {
const res = await panggil('ajukanPendaftaran', AppState.sessionToken, {
mandiri: true, namaTempat: nama, alamat: $('mdAlamat').value.trim(),
lat: $('mdLat').value.trim(), lng: $('mdLng').value.trim(),
suratBase64: AppState.suratMandiri.base64, namaFileSurat: AppState.suratMandiri.nama,
mimeSurat: AppState.suratMandiri.mime });
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6000);
if (res.success) { AppState.suratMandiri = null; batalkanPaketData(); tutupModal(); muatTempatPKL(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function urutkanBerdasarkanJarak() {
if (!navigator.geolocation) { toast('Perangkat tidak mendukung deteksi lokasi.', 'error'); return; }
tampilkanSibuk('Mendeteksi lokasi Anda…');
navigator.geolocation.getCurrentPosition(
pos => {
sembunyikanSibuk();
AppState.posisi = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
muatTempatPKL();
toast('Daftar diurutkan dari yang terdekat.', 'success');
},
() => { sembunyikanSibuk(); toast('Lokasi tidak terbaca. Aktifkan izin lokasi.', 'warning'); },
{ enableHighAccuracy: true, timeout: 15000 });
}
function tampilkanNamaFile(event) {
const file = event.target.files && event.target.files[0];
const err = $('errFileLaporan');
err.textContent = '';
if (!file) return;
if (file.size > 10 * 1024 * 1024) {
err.textContent = 'Ukuran berkas maksimal 10 MB. Kompres laporan Anda terlebih dahulu.';
AppState.fileLaporan = null;
return;
}
const reader = new FileReader();
reader.onload = e => {
AppState.fileLaporan = { base64: e.target.result, nama: file.name, mime: file.type };
$('namaFileLaporan').textContent = file.name + ' (' + (file.size / 1048576).toFixed(2) + ' MB)';
};
reader.readAsDataURL(file);
}
async function kirimLaporan(event) {
event.preventDefault();
const judul = $('judulLaporan').value.trim();
$('errFileLaporan').textContent = '';
if (!judul) { toast('Judul laporan wajib diisi.', 'warning'); return; }
if (!AppState.fileLaporan) { $('errFileLaporan').textContent = 'Pilih berkas laporan terlebih dahulu.'; return; }
tampilkanSibuk('Mengunggah laporan…');
try {
const res = await panggil('unggahLaporanAkhir', AppState.sessionToken, {
judul: judul, fileBase64: AppState.fileLaporan.base64,
namaFile: AppState.fileLaporan.nama, mimeType: AppState.fileLaporan.mime });
sembunyikanSibuk();
// Server sibuk: tidak ada baris yang tertulis, dan mencoba lagi memang jalan
// keluarnya. Kuning, bukan merah — merah berarti ditolak. (v9.4)
const sibuk = !!(res.data && res.data.sibuk);
toast(res.message, res.success ? 'success' : sibuk ? 'warning' : 'error', sibuk ? 11000 : 6000);
if (res.success) {
AppState.fileLaporan = null;
$('formLaporan').reset();
$('namaFileLaporan').textContent = 'Ketuk untuk memilih berkas (PDF/DOCX, maks. 10 MB)';
muatStatusLaporan();
}
} catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); }
}
async function muatStatusLaporan() {
const box = $('boxStatusLaporan');
if (!box) return;
try {
const res = await panggilCepat('getLaporanSiswa', AppState.sessionToken, null);
if (!res.success) { box.innerHTML = emptyState('error', 'Gagal memuat', res.message); return; }
const l = res.data;
if (!l) {
box.innerHTML = emptyState('description', 'Belum ada laporan',
'Unggah laporan akhir PKL Anda melalui formulir di samping.');
return;
}
box.innerHTML = `
<div style="text-align:center;margin-bottom:16px">${chipStatus(l.status)}</div>
<div class="list">
<div class="list-item"><div class="list-main"><div class="data-label">Judul Laporan</div>
<div class="data-value">${esc(l.judul)}</div></div></div>
<div class="list-item"><div class="list-main"><div class="data-label">Nama Berkas</div>
<div class="data-value">${esc(l.namaFile)}</div></div></div>
<div class="list-item"><div class="list-main"><div class="data-label">Tanggal Unggah</div>
<div class="data-value">${tglSingkat(l.tanggal)}</div></div></div>
</div>
${l.komentar ? `<div class="alert ${l.status === 'Ditolak' ? 'alert-error' : 'alert-info'}" style="margin-top:12px">
<span class="mi">comment</span><div><strong>Komentar Reviewer</strong><p>${esc(l.komentar)}</p></div></div>` : ''}
<button class="btn btn-outline btn-block" style="margin-top:16px"
onclick="bukaPratinjau('${esc(l.judul)}','${esc(l.fileUrl)}','${esc(l.unduhUrl)}','dokumen')">
<span class="mi">visibility</span> Pratinjau Laporan</button>
${l.status === 'Disetujui' ? `<div class="alert alert-success" style="margin-top:12px">
<span class="mi">check_circle</span>
<div><strong>Laporan disetujui</strong><p>Berkas tidak dapat diganti lagi.</p></div></div>` : ''}`;
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat status', err.message);
}
}
async function muatNilai() {
const box = $('boxNilai');
if (!box) return;
try {
const res = await panggilCepat('getPenilaian', AppState.sessionToken, null);
if (!res.success) { box.innerHTML = emptyState('error', 'Gagal memuat', res.message); return; }
const { nilai, sertifikat } = res.data;
if (!nilai) {
box.innerHTML = `<section class="card"><div class="card-body">` +
emptyState('grading', 'Belum dinilai',
'Nilai akhir muncul setelah guru pembimbing menyelesaikan penilaian.') + `</div></section>`;
return;
}
const warna = nilai.akhir >= 90 ? 'success' : nilai.akhir >= 80 ? 'info' : nilai.akhir >= 70 ? 'warning' : 'error';
box.innerHTML = `
<section class="card"><div class="card-body" style="text-align:center;padding:32px 16px">
<div class="info-eyebrow">Nilai Akhir PKL</div>
<div style="font-size:64px;font-weight:700;line-height:1;color:var(--${warna});margin:8px 0">${esc(nilai.akhir)}</div>
<span class="chip chip-${warna}" style="font-size:14px;padding:8px 20px">${esc(nilai.predikat)}</span>
<p class="field-help" style="margin-top:12px">Dinilai pada ${tglSingkat(nilai.tanggal)}</p>
</div></section>

<section class="card">
<div class="card-head"><h2 class="card-title"><span class="mi">analytics</span> Rincian Komponen</h2></div>
<div class="card-body">
${nilai.rincian.map(r => `
<div style="margin-bottom:14px">
<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px">
<span>${esc(r.nama)} <span style="color:var(--on-surface-muted)">(bobot ${r.bobot}%)</span></span>
<strong>${r.nilai === null ? '—' : esc(r.nilai)}</strong>
</div>
<div class="progress"><div class="progress-bar" style="width:${Math.min(100, Number(r.nilai) || 0)}%"></div></div>
</div>`).join('')}
${nilai.catatan ? `<div class="alert alert-info" style="margin-top:8px">
<span class="mi">comment</span><div><strong>Catatan Pembimbing</strong>
<p>${esc(nilai.catatan)}</p></div></div>` : ''}
</div>
</section>

<section class="card">
<div class="card-head"><h2 class="card-title"><span class="mi">workspace_premium</span> Sertifikat PKL</h2></div>
<div class="card-body">
${sertifikat ? `
<div class="alert alert-success"><span class="mi">verified</span>
<div><strong>Sertifikat telah diterbitkan</strong>
<p>Nomor: ${esc(sertifikat.nomor)}<br>Tanggal: ${tglSingkat(sertifikat.tanggal)}</p></div></div>
<div class="btn-row" style="margin-top:12px">
<button class="btn btn-outline"
onclick="bukaPratinjau('Sertifikat PKL','${esc(sertifikat.pratinjauUrl)}','${esc(sertifikat.unduhUrl)}','dokumen')">
<span class="mi">visibility</span> Lihat Sertifikat</button>
<a class="btn btn-primary" href="${esc(sertifikat.unduhUrl)}" target="_blank" rel="noopener">
<span class="mi">download</span> Unduh PDF</a>
</div>` :
emptyState('workspace_premium', 'Sertifikat belum terbit',
'Diterbitkan Pokja PKL setelah seluruh syarat terpenuhi.')}
</div>
</section>`;
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat nilai', err.message);
}
}
function muatProfil() {
const u = AppState.user;
const box = $('boxIdentitas');
if (!box) return;
const peran = u.role === 'admin' ? 'Pokja PKL (Administrator)'
: u.role === 'guru' ? 'Guru Pembimbing' : 'Siswa Peserta PKL';
const baris = [['Nama Lengkap', u.nama], ['Username', u.username], ['Peran', peran]];
if (u.detail.nis) baris.push(['NIS', u.detail.nis]);
if (u.detail.nip) baris.push(['NIP', u.detail.nip]);
if (u.detail.kelas) baris.push(['Kelas', u.detail.kelas]);
if (u.detail.jurusan) baris.push(['Kompetensi Keahlian', u.detail.jurusan]);
if (u.detail.mapel) baris.push(['Mata Pelajaran', u.detail.mapel]);
baris.push(['Nomor HP', u.detail.noHp || '—']);
baris.push(['Email Google', u.email || 'Belum ditautkan']);
const inisial = (u.nama || '?').trim().charAt(0).toUpperCase();
box.innerHTML = `
<div style="text-align:center;padding-bottom:16px;border-bottom:1px solid var(--outline-variant)">
<div class="avatar" id="profilAvatar"
style="width:104px;height:104px;flex:0 0 104px;font-size:40px;margin:0 auto 14px">
${u.foto ? `<img src="${esc(u.foto)}" alt="Foto profil">` : esc(inisial)}
</div>
<div style="font-size:19px;font-weight:700">${esc(u.nama)}</div>
<div style="font-size:13px;color:var(--on-surface-muted);margin-top:2px">${esc(peran)}</div>
<button class="btn btn-outline btn-sm" style="margin-top:14px"
onclick="document.getElementById('inputFotoProfil').click()">
<span class="mi">photo_camera</span> Ubah Foto Profil</button>
<input type="file" id="inputFotoProfil" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" hidden onchange="pilihFotoProfil(event)">
<p class="field-help">Foto dikompres otomatis sebelum diunggah.</p>
</div>
<div class="list" style="margin-top:12px">${baris.map(([l, v]) => `
<div class="list-item"><div class="list-main">
<div class="data-label">${esc(l)}</div><div class="data-value">${esc(v)}</div></div></div>`).join('')}</div>`;
if ($('pfNama')) $('pfNama').value = u.nama || '';
if ($('pfEmail')) $('pfEmail').value = u.email || '';
if ($('pfNoHp')) $('pfNoHp').value = u.detail.noHp || '';
if ($('pfExtra')) $('pfExtra').value = u.role === 'siswa' ? (u.detail.alamat || '') : (u.detail.mapel || '');
if ($('unBaru')) $('unBaru').value = u.username || '';
}
function pilihFotoProfil(event) {
const file = event.target.files && event.target.files[0];
if (!file) return;
if (!file.type.startsWith('image/')) { toast('Berkas harus berupa gambar.', 'error'); return; }
kompresGambar(file, 400, 0.72).then(dataUrl => {
AppState.fotoProfil = dataUrl;
const av = $('profilAvatar');
if (av) av.innerHTML = `<img src="${dataUrl}" alt="Pratinjau foto profil">`;
toast('Foto siap. Tekan "Simpan Perubahan" untuk menyimpannya.', 'info', 5000);
}).catch(() => toast('Gambar tidak dapat dibaca.', 'error'));
event.target.value = '';
}
async function simpanDataProfil(event) {
event.preventDefault();
tampilkanSibuk('Menyimpan profil…');
try {
const payload = {
nama: $('pfNama') ? $('pfNama').value.trim() : '',
noHp: $('pfNoHp') ? $('pfNoHp').value.trim() : '',
alamat: $('pfExtra') ? $('pfExtra').value.trim() : '',
mapel: $('pfExtra') ? $('pfExtra').value.trim() : '',
fotoBase64: AppState.fotoProfil || null
};
const res = await panggil('simpanProfil', AppState.sessionToken, payload);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error'); return; }
AppState.fotoProfil = null;
toast(res.message, 'success');
await muatBootstrap();
navigateTo('profil', { paksaMuatUlang: true });
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function simpanEmailGoogle(event) {
event.preventDefault();
tampilkanSibuk('Menyimpan tautan email…');
try {
const res = await panggil('tautkanEmailGoogle', AppState.sessionToken, $('pfEmail').value.trim());
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 5500);
if (res.success) { await muatBootstrap(); navigateTo('profil', { paksaMuatUlang: true }); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function simpanUsernameBaru(event) {
event.preventDefault();
const baru = $('unBaru').value.trim(), pass = $('unPass').value;
$('errUsername').textContent = '';
if (baru === AppState.user.username) { $('errUsername').textContent = 'Username belum diubah.'; return; }
if (baru.length < 3) { $('errUsername').textContent = 'Username minimal 3 karakter.'; return; }
if (!pass) { $('errUsername').textContent = 'Konfirmasi password wajib diisi.'; return; }
tampilkanSibuk('Mengubah username…');
try {
const res = await panggil('gantiUsername', AppState.sessionToken, baru, pass);
sembunyikanSibuk();
if (!res.success) { $('errUsername').textContent = res.message; return; }
toast(res.message, 'success', 6500);
$('unPass').value = '';
await muatBootstrap();
navigateTo('profil', { paksaMuatUlang: true });
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function simpanPasswordBaru(event) {
event.preventDefault();
const lama = $('pwLama').value, baru = $('pwBaru').value, ulang = $('pwUlang').value;
$('errPwUlang').textContent = '';
if (baru.length < 6) { toast('Password baru minimal 6 karakter.', 'warning'); return; }
if (baru !== ulang) {
$('errPwUlang').textContent = 'Konfirmasi password tidak cocok.';
$('pwUlang').classList.add('invalid');
return;
}
$('pwUlang').classList.remove('invalid');
tampilkanSibuk('Mengganti password…');
try {
const res = await panggil('gantiPassword', AppState.sessionToken, lama, baru);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) $('formPassword').reset();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
// ── Pengajuan pindah tempat PKL (sisi siswa) ───────────────
function renderStatusPindah(data) {
const kartu = $('kartuPindahSaya'), box = $('boxStatusPindah');
if (!kartu || !box) return;
const p = data.pengajuanPindah;
const penempatan = data.penempatan;

// Kartu ini hanya relevan bagi siswa yang sudah ditempatkan.
// Tombol "Ajukan Tempat Sendiri" hanya relevan sebelum siswa ditempatkan.
const btnMandiri = $('btnAjukanMandiri');
if (btnMandiri) btnMandiri.hidden = !!penempatan || !!data.terkunci;

if (!penempatan) { kartu.hidden = true; return; }
kartu.hidden = false;

const menunggu = p && p.status === 'Menunggu';
const gaya = !p ? 'info'
: { 'Menunggu': 'warning', 'Disetujui': 'success', 'Ditolak': 'error', 'Dibatalkan': 'info' }[p.status] || 'info';

box.innerHTML = `
<div class="info-tonal"><span class="mi">domain</span>
<div><div class="info-strong">${esc(penempatan.namaTempat)}</div>
<div class="info-sub">Tempat PKL Anda saat ini &middot; sejak ${tglSingkat(penempatan.tanggalMulai)}</div></div></div>

${p ? `<div class="alert alert-${gaya}" style="margin-top:14px">
<span class="mi">${p.status === 'Disetujui' ? 'check_circle' : p.status === 'Ditolak' ? 'cancel'
: p.status === 'Dibatalkan' ? 'do_not_disturb_on' : 'hourglass_top'}</span>
<div style="flex:1">
<strong>Pengajuan pindah ${esc(p.status)}</strong>
<p>Tujuan: <strong>${esc(p.tempatTujuan)}</strong></p>
<p style="margin-top:6px;font-size:13px">Diajukan ${tglSingkat(p.tanggalAjuan)}</p>
<p style="margin-top:6px"><strong>Alasan Anda:</strong> ${esc(p.alasan)}</p>
${p.catatan ? `<p style="margin-top:6px"><strong>Catatan Pokja:</strong> ${esc(p.catatan)}</p>` : ''}
</div></div>` : `<p class="field-help" style="margin-top:14px">
Bila tempat PKL Anda terasa tidak cocok atau terlalu jauh, Anda dapat mengajukan pindah.
Pokja PKL yang memutuskan, dan presensi serta jurnal Anda yang sudah tercatat tetap aman.</p>`}

<div class="btn-row" style="margin-top:14px">
${menunggu
? `<button class="btn btn-danger btn-sm" onclick="batalkanPindah('${esc(p.id)}')">
<span class="mi">cancel</span> Batalkan Pengajuan</button>`
: `<button class="btn btn-outline btn-sm" onclick="bukaFormPindah()">
<span class="mi">swap_horiz</span> Ajukan Pindah Tempat</button>`}
</div>`;
}
function bukaFormPindah(tempatId) {
const d = AppState.dataTempatPenuh || {};
const penempatan = d.penempatan;
if (!penempatan) { toast('Anda belum memiliki penempatan PKL aktif.', 'warning'); return; }
if (d.pengajuanPindah && d.pengajuanPindah.status === 'Menunggu') {
toast('Pengajuan pindah Anda sebelumnya masih menunggu keputusan Pokja PKL.', 'warning', 6000);
return;
}
const pilihan = (AppState.dataTempat || [])
.filter(t => t.id !== penempatan.tempatId && t.aktif && t.sisaKuota > 0);
if (!pilihan.length) {
toast('Belum ada tempat PKL lain yang kuotanya tersisa.', 'warning', 6000);
return;
}
bukaModal('Ajukan Pindah Tempat PKL', `
<div class="info-tonal"><span class="mi">domain</span>
<div><div class="info-strong">${esc(penempatan.namaTempat)}</div>
<div class="info-sub">Tempat PKL Anda saat ini</div></div></div>

<div class="field" style="margin-top:16px">
<label class="field-label" for="apTempat">Tempat PKL yang Dituju *</label>
<select class="field-input" id="apTempat">
<option value="">— Pilih tempat PKL —</option>
${pilihan.map(t => `<option value="${esc(t.id)}" ${t.id === tempatId ? 'selected' : ''}>
${esc(t.nama)} (sisa ${t.sisaKuota}${t.jarakKm !== null ? ', ' + t.jarakKm + ' km' : ''})</option>`).join('')}
</select>
<div class="field-error" id="errApTempat"></div>
</div>

<div class="field">
<label class="field-label" for="apAlasan">Alasan Anda Ingin Pindah *</label>
<textarea class="field-input" id="apAlasan" rows="4" maxlength="400"
placeholder="Jelaskan sejujurnya, misalnya jarak terlalu jauh atau bidang kerjanya tidak sesuai jurusan."></textarea>
<div class="field-help">Minimal 10 karakter. Alasan ini dibaca Pokja PKL.</div>
<div class="field-error" id="errApAlasan"></div>
</div>

<div class="alert alert-info">
<span class="mi">info</span>
<div><strong>Sebelum mengajukan</strong>
<p>Selama pengajuan menunggu, Anda tetap presensi dan mengisi jurnal di tempat PKL sekarang
seperti biasa. Perpindahan baru berlaku setelah Pokja PKL menyetujui.</p></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">send</span> Kirim Pengajuan', kelas: 'btn-primary', aksi: kirimPengajuanPindah }]);
}
async function kirimPengajuanPindah() {
const tempatTujuanId = $('apTempat') ? $('apTempat').value : '';
const alasan = $('apAlasan') ? $('apAlasan').value.trim() : '';
['errApTempat', 'errApAlasan'].forEach(id => { if ($(id)) $(id).textContent = ''; });
if (!tempatTujuanId) { $('errApTempat').textContent = 'Pilih tempat PKL tujuan.'; return; }
if (alasan.length < 10) { $('errApAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }

tampilkanSibuk('Mengirim pengajuan…');
try {
const res = await panggil('ajukanPindahTempat', AppState.sessionToken,
{ tempatTujuanId: tempatTujuanId, alasan: alasan });
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 7000); return; }
tutupModal();
toast(res.message, 'success', 6000);
batalkanPaketData();
muatTempatPKL();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function batalkanPindah(id) {
const ya = await konfirmasi('Batalkan Pengajuan Pindah',
'Pengajuan pindah Anda akan dibatalkan. Anda dapat mengajukan lagi setelah ini.',
'Ya, batalkan', 'btn-danger');
if (!ya) return;
tampilkanSibuk('Membatalkan…');
try {
const res = await panggil('batalkanPengajuanPindah', AppState.sessionToken, id);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) { batalkanPaketData(); muatTempatPKL(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

window.__blok = 3;

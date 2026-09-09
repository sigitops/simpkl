async function muatDataMonitoring() {
tampilkanKpiTersimpan();
try {
const res = await panggilCepat('getDashboardMonitoring', AppState.sessionToken);
if (!res.success) { toast(res.message, 'error'); return; }
const d = res.data;
AppState.dataMonitoring = d.siswa;
renderKPI(d.kpi);
renderInsight('insightMonitoring', d.insights);
renderTabelSiswaRingkas(d.siswa);
gambarGrafikMonitoring(d);
perbaruiBadgeMenu(d.kpi);
} catch (err) { toast(err.message, 'error'); }
}
function tampilkanKpiTersimpan() {
if (!$('kpiGrid') || !AppState.user) return false;
try {
const teks = Simpanan.ambil('kpi_' + AppState.user.role);
if (!teks) return false;
const kartu = JSON.parse(teks);
if (!Array.isArray(kartu) || !kartu.length) return false;
if (kartu.some(c => c.nilai === undefined || c.nilai === null)) return false;
gambarKartuKPI(kartu);
return true;
} catch (e) { return false; }
}
function renderKPI(k) {
const grid = $('kpiGrid');
if (!grid) return;
const isAdmin = AppState.user.role === 'admin';
const kartu = [
{ ikon: 'group',       kelas: '',       nilai: k.totalSiswa,     label: 'Siswa PKL Aktif' },
{ ikon: 'how_to_reg',  kelas: 'ok',     nilai: k.hadirHariIni,   label: 'Presensi Hari Ini' },
{ ikon: 'person_off',  kelas: 'danger', nilai: k.belumPresensi,  label: 'Belum Presensi' },
{ ikon: 'fact_check',  kelas: 'warn',   nilai: k.jurnalMenunggu, label: 'Jurnal Perlu Review' },
{ ikon: 'badge',       kelas: '',       nilai: k.guruAktif,      label: isAdmin ? 'Guru Pembimbing Aktif' : 'Pembimbing' },
{ ikon: 'domain',      kelas: 'ok',     nilai: k.dudikaAktif,    label: 'Total DUDIKA Aktif' }
];
if (isAdmin) {
kartu.push({ ikon: 'assignment_ind', kelas: 'warn', nilai: k.pendaftaranMenunggu, label: 'Pendaftaran Baru' });
kartu.push({ ikon: 'grading',        kelas: '',     nilai: k.belumDinilai,        label: 'Belum Dinilai' });
}
try { Simpanan.simpan('kpi_' + AppState.user.role, JSON.stringify(kartu)); } catch (e) {}
gambarKartuKPI(kartu);
}
function gambarKartuKPI(kartu) {
const grid = $('kpiGrid');
if (!grid) return;
grid.className = 'kpi-grid ' + (kartu.length % 4 === 0 ? 'kpi-x4' : 'kpi-x3');
grid.innerHTML = kartu.map(c => `
<div class="kpi-card">
<div class="kpi-icon ${c.kelas || ''}"><span class="mi">${c.ikon}</span></div>
<div><div class="kpi-val">${c.nilai == null ? '–' : c.nilai}</div>
<div class="kpi-lbl">${c.label}</div></div>
</div>`).join('');
}
function perbaruiBadgeMenu(k) {
const set = (id, nilai) => {
const el = $('count-' + id);
if (!el) return;
el.textContent = nilai;
el.hidden = !nilai;
};
set('rekap-jurnal', k.jurnalMenunggu);
set('rekap-laporan', k.laporanMenunggu);
set('pendaftaran', k.pendaftaranMenunggu);
const ada = !!(k.jurnalMenunggu || k.laporanMenunggu || k.pendaftaranMenunggu);
if ($('badgeNotif')) $('badgeNotif').hidden = !ada;
if ($('badgeNotifMobile')) $('badgeNotifMobile').hidden = !ada;
}
function renderTabelSiswaRingkas(siswa) {
const box = $('boxSiswaHariIni');
if (!box) return;
if (!siswa.length) {
box.innerHTML = emptyState('group_off', 'Belum ada siswa PKL aktif',
'Data muncul setelah pendaftaran siswa diterima.');
return;
}
box.innerHTML = `<div class="table-wrap"><table class="data-table">
<thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Tempat PKL</th><th>Presensi</th><th>Jurnal</th><th></th></tr></thead>
<tbody>${siswa.slice(0, 10).map(s => `
<tr>
<td><div class="td-strong">${esc(s.nama)}</div><div class="td-sub">${esc(s.nis)}</div></td>
<td>${esc(s.kelas)}</td>
<td><div>${esc(s.tempat)}</div><div class="td-sub">${esc(s.guru)}</div></td>
<td>${chipStatus(s.statusPresensi)}${s.waktuPresensi ?
`<div class="td-sub">${jamTampil(s.waktuPresensi)} WIB</div>` : ''}</td>
<td>${chipStatus(s.statusJurnal)}</td>
<td><div class="td-actions"><button class="btn-icon" aria-label="Detail ${esc(s.nama)}"
onclick="bukaHalamanSiswa('${esc(s.siswaId)}')"><span class="mi">visibility</span></button></div></td>
</tr>`).join('')}</tbody></table></div>`;
}
async function gambarGrafikMonitoring(d) {
const c1 = $('chartTrenMonitoring'), c2awal = $('chartStatusHariIni');
if (!c1 && !c2awal) return;
catatGrafik('monitoring', gambarGrafikMonitoring, d);
if (!(await pastikanChart())) {
grafikTidakTersedia(c1); grafikTidakTersedia(c2awal); return;
}
const w = warnaGrafik();
if (c1) {
// Tren kehadiran digambar sebagai GARIS sejak v7.8, bukan batang bertumpuk.
// Batang bertumpuk pandai menjawab "hari ini komposisinya apa"; yang
// sebenarnya dicari dari grafik tren adalah "arahnya ke mana" — dan arah
// hanya terbaca dari garis. Setiap status kini punya garisnya sendiri yang
// bertolak dari nol yang sama, jadi keenamnya bisa dibandingkan langsung.
const garis = function (label, data, warna) {
return {
label: label, data: data || [],
borderColor: warna, backgroundColor: warna,
borderWidth: 2,
// 'monotone', BUKAN tension biasa. Kurva bezier bawaan Chart.js melampaui
// nilai simpulnya sendiri: dua hari yang sama-sama 10 Alpha akan digambar
// menggembung sampai 10,7 di antaranya — angka yang tidak pernah terjadi.
// Pada data cacah siswa, garis yang menunjukkan nilai yang tidak ada bukan
// sekadar kurang rapi, ia salah. Mode monoton melengkung tanpa pernah
// melewati nilai yang benar-benar diukur.
cubicInterpolationMode: 'monotone', tension: .35,
// Titik kecil yang membesar saat disorot: dot pada setiap simpul membuat
// hari yang datanya memang ada bisa dibedakan dari garis yang sekadar
// melintas — tanpa itu, hari kosong dan hari bernilai nol terlihat sama.
pointRadius: 3, pointHoverRadius: 6, pointBorderWidth: 0,
pointBackgroundColor: warna, pointHitRadius: 12
};
};
AppState.grafik.trenMon = new Chart(c1, {
type: 'line',
data: { labels: d.tren.label, datasets: [
garis('Hadir', d.tren.hadir, w.sukses),
garis('Telat', d.tren.telat, w.warning),
garis('Izin', d.tren.izin, w.primary),
garis('Sakit', d.tren.sakit, w.ungu),
garis('Alpha', d.tren.alpha, w.error),
garis('Libur', d.tren.libur, w.libur)] },
options: {
responsive: true, maintainAspectRatio: false,
interaction: { mode: 'index', intersect: false },
plugins: { legend: { position: 'bottom', labels: { color: w.teks, usePointStyle: true, padding: 14 } } },
scales: {
// Kedua sumbu bergaris putus-putus. Garis kisi yang utuh bersaing dengan
// garis datanya sendiri — pada grafik garis, kisi yang tegas justru
// membuat mata sulit memisahkan mana bacaan dan mana penggarisnya.
x: { ticks: { color: w.teks },
     border: { display: true, dash: [4, 4], color: w.grid },
     grid: { color: w.grid, borderDash: [4, 4], drawTicks: false } },
y: { beginAtZero: true, ticks: { color: w.teks, precision: 0 },
     border: { display: true, dash: [4, 4], color: w.grid },
     grid: { color: w.grid, borderDash: [4, 4], drawTicks: false } }
}
}
});
}
const c2 = c2awal;
if (c2) {
const label = Object.keys(d.statusPresensi);
const nilai = label.map(k => d.statusPresensi[k]);
const warna = label.map(k => k === 'Hadir' ? w.sukses : k === 'Telat' ? w.warning
: k === 'Izin' ? w.primary : k === 'Sakit' ? w.ungu
: k === 'Alpha' ? w.error : k === 'Libur' ? w.libur : w.netral);
AppState.grafik.statusHariIni = new Chart(c2, {
type: 'doughnut',
// Celah 2px sewarna permukaan memisahkan potongan yang bersebelahan. Pada warna
// yang lembut, batas inilah yang menjaga tiap potongan tetap terbaca sebagai
// bagian tersendiri — tanpa itu warna berdekatan cenderung melebur.
data: { labels: label, datasets: [{ data: nilai, backgroundColor: warna,
borderColor: w.permukaan, borderWidth: 2 }] },
options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
plugins: { legend: { position: 'bottom', labels: { color: w.teks, usePointStyle: true, padding: 14 } } } }
});
}
}
// ── Presensi Siswa: ringkasan status hari ini ──────────────────────────────
//
// Enam ubin, dan setiap ubinnya juga tombol saringan. Menghitung "12 siswa
// belum presensi" lalu menyuruh pengguna mencarinya sendiri satu per satu di
// tabel adalah setengah pekerjaan; angkanya harus bisa dibuka.
const PS_UBIN = [
{ k: 'Hadir',          ikon: 'check_circle', nada: 'ok',    label: 'Hadir' },
{ k: 'Telat',          ikon: 'schedule',     nada: 'warn',  label: 'Terlambat' },
{ k: 'Izin',           ikon: 'event_busy',   nada: 'info',  label: 'Izin' },
{ k: 'Sakit',          ikon: 'sick',         nada: 'info',  label: 'Sakit' },
{ k: 'Alpha',          ikon: 'person_off',   nada: 'error', label: 'Alpha' },
{ k: 'Belum Presensi', ikon: 'pending',      nada: '',      label: 'Belum Presensi' }
];
function gambarRingkasPresensi(siswa) {
const kotak = $('psRingkas');
const tgl = $('psTanggal');
if (tgl) tgl.textContent = tglSingkat(new Date().toISOString().slice(0, 10));
const chip = $('chipJumlahMon');
if (chip) chip.textContent = (siswa || []).length + ' siswa aktif';
if (!kotak) return;
const hitung = {};
let libur = 0;
(siswa || []).forEach(function (s) {
// "Izin (Menunggu)" tetap dihitung sebagai Izin — pengajuannya nyata,
// hanya verifikasinya yang belum. Memisahkannya membuat jumlah seluruh
// ubin tidak lagi sama dengan jumlah siswa, dan itu yang membingungkan.
const k = String(s.statusPresensi || '').replace(' (Menunggu)', '');
if (k === 'Libur') { libur++; return; }
hitung[k] = (hitung[k] || 0) + 1;
});
// Siswa yang tempat PKL-nya libur tidak masuk penyebut: persentase kehadiran
// tidak boleh turun karena instansinya yang tutup.
const dasar = Math.max(1, (siswa || []).length - libur);
const ubin = PS_UBIN.slice();
if (libur) ubin.push({ k: 'Libur', ikon: 'weekend', nada: '', label: 'Libur', tanpaPersen: true });
const aktif = (AppState.tabel && AppState.tabel.monitoring &&
AppState.tabel.monitoring.filterNilai || {}).statusPresensi || '';
kotak.innerHTML = ubin.map(function (u) {
const n = u.k === 'Libur' ? libur : (hitung[u.k] || 0);
const persen = u.tanpaPersen ? '' : Math.round(n / dasar * 100) + '%';
return `<button type="button" class="ps-ubin${u.nada ? ' nada-' + u.nada : ''}${
aktif === u.k ? ' aktif' : ''}" aria-pressed="${aktif === u.k}"
onclick="saringStatusPresensi('${u.k}')"
title="Tampilkan hanya siswa berstatus ${u.label}">
<span class="ps-ubin-ikon"><span class="mi">${u.ikon}</span></span>
<span class="ps-ubin-teks">
<span class="ps-ubin-nilai">${n}${persen ? `<small>${persen}</small>` : ''}</span>
<span class="ps-ubin-label">${u.label}</span>
</span></button>`;
}).join('');
}
/** Menyalakan / mematikan saringan status dari ubin ringkasan. */
function saringStatusPresensi(nilai) {
const st = AppState.tabel && AppState.tabel.monitoring;
if (!st) return;
const sama = (st.filterNilai || {}).statusPresensi === nilai;
// Kendali di dalam panel Filter ikut disetel. Kalau hanya keadaannya yang
// diubah, panelnya tetap memperlihatkan "Semua" dan berbohong tentang apa
// yang sedang disaring.
const sel = $('mon_f_statusPresensi');
if (sel) sel.value = sama ? '' : nilai;
ubahFilter('mon', 'statusPresensi', sama ? '' : nilai);
gambarRingkasPresensi(AppState.dataTabel || []);
}
function bukaHalamanSiswa(siswaId) {
AppState.siswaDetail = siswaId;
navigateTo('detail-siswa');
}
// Menyegarkan apa pun yang sedang tampil sesudah data penempatan berubah.
// Sejak v7.5 perpindahan tempat bisa dilakukan dari DUA layar — daftar dan
// halaman detail — jadi memanggil muatTabelMonitoring() saja membuat halaman
// detail tetap memperlihatkan tempat PKL yang lama sampai dimuat ulang.
function segarkanTampilanSiswa() {
if ($('dsIsi') && AppState.siswaDetail) { muatDetailSiswa(AppState.siswaDetail, true); return; }
muatTabelMonitoring();
muatAntreanPindah();
}
async function muatTabelMonitoring() {
const box = $('tabelMonitoring');
if (!box) return;
box.innerHTML = memuatInline('Mengambil data siswa…');
try {
const res = await panggilCepat('getDaftarPenempatan', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
AppState.dataTabel = res.data;
gambarRingkasPresensi(res.data);
buatTabel({
id: 'monitoring', mount: 'tabelMonitoring', idPrefix: 'mon',
judulEkspor: 'Presensi Siswa PKL',
data: res.data, kunciPilih: 'siswaId', sortAwal: 'nama',
cariField: ['nama', 'nis', 'kelas', 'tempat', 'guru'],
kosong: { ikon: 'group_off', judul: 'Belum ada siswa PKL aktif',
desc: 'Data muncul setelah pendaftaran siswa diterima Pokja PKL.' },
filterTetap: [{
k: 'statusPresensi', label: 'Status Presensi',
opsi: ['Hadir', 'Telat', 'Izin', 'Sakit', 'Alpha', 'Libur', 'Belum Presensi'],
// Izin/Sakit yang masih menunggu ditulis "Izin (Menunggu)" — tetap ikut tersaring.
cocok: (r, nilai) => String(r.statusPresensi || '').indexOf(nilai) === 0
}],
// Ubin ringkasan ikut menyala/padam mengikuti saringan, dari mana pun
// saringannya diubah — termasuk lewat panel Filter, bukan hanya lewat ubin.
saatFilter: () => { renderTabel('monitoring'); gambarRingkasPresensi(AppState.dataTabel || []); },
// Sejak v7.7 menu ini bernama Presensi Siswa, dan kolomnya mengikuti nama
// itu: status jurnal DIBUANG, digantikan jam masuk dan menit keterlambatan.
// Rekap jurnal punya menunya sendiri; menaruhnya di sini membuat pembaca
// harus memilah dua urusan berbeda di satu baris yang sama.
kolom: [
{ k: 'nama', label: 'Nama Siswa', sortable: true,
render: r => `<div class="td-strong">${esc(r.nama)}</div><div class="td-sub">${esc(r.nis)}</div>` },
{ k: 'kelas', label: 'Kelas', sortable: true },
{ k: 'tempat', label: 'Tempat PKL', sortable: true,
render: r => `<div>${esc(r.tempat)}</div><div class="td-sub">${esc(r.guru)}</div>` },
{ k: 'statusPresensi', label: 'Status Hari Ini', sortable: true,
render: r => chipStatus(r.statusPresensi) +
(r.shift ? `<div class="td-sub">${esc(r.shift)}</div>` : '') },
{ k: 'waktuPresensi', label: 'Jam Masuk', sortable: true,
render: r => r.waktuPresensi
  ? `<span class="tb-jam">${jamTampil(r.waktuPresensi)}<small>WIB</small></span>`
  : `<span class="tb-kosong">—</span>` },
{ k: 'menitTelat', label: 'Terlambat', sortable: true,
render: r => (r.menitTelat > 0)
  ? `<span class="tb-telat">+${r.menitTelat} mnt</span>`
  : `<span class="tb-kosong">—</span>` },
{ k: 'waktuPulang', label: 'Jam Pulang', sortable: true,
render: r => r.waktuPulang
  ? `<span class="tb-jam">${jamTampil(r.waktuPulang)}<small>WIB</small></span>`
  : `<span class="tb-kosong">—</span>` },
// Pulang cepat memakai tanda MINUS dan warna biru, bukan kuning seperti
// terlambat: keduanya sama-sama menyimpang dari jadwal, tetapi ke arah yang
// berlawanan — dan dua penyimpangan berbeda arah dengan tanda yang sama
// hanya akan tertukar saat dibaca cepat.
{ k: 'menitPulangCepat', label: 'Pulang Cepat', sortable: true,
render: r => (r.menitPulangCepat > 0)
  ? `<span class="tb-cepat">&minus;${r.menitPulangCepat} mnt</span>`
  : `<span class="tb-kosong">—</span>` }
],
aksi: r => `<button class="btn-icon" aria-label="Lihat detail ${esc(r.nama)}"
onclick="bukaHalamanSiswa('${esc(r.siswaId)}')"><span class="mi">visibility</span></button>
${AppState.user.role === 'admin' ? `<button class="btn-icon" aria-label="Pindahkan tempat PKL ${esc(r.nama)}"
onclick="bukaPindahTempat('${esc(r.siswaId)}')"><span class="mi">swap_horiz</span></button>` : ''}
${AppState.user.role === 'admin' && r.bisaBatalPindah ? `<button class="btn-icon danger"
aria-label="Batalkan perpindahan ${esc(r.nama)}"
onclick="bukaBatalPindah('${esc(r.siswaId)}')"><span class="mi">undo</span></button>` : ''}`
});
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
async function muatAntreanIzin() {
const kartu = $('kartuIzin'), panel = $('panelIzin');
if (!kartu || !panel) return;
try {
const res = await panggilCepat('getAntreanIzin', AppState.sessionToken);
if (!res.success || !res.data.length) { kartu.hidden = true; return; }
kartu.hidden = false;
$('badgeIzin').textContent = res.data.length;
panel.innerHTML = res.data.map(z => `
<article class="review-card">
<div class="review-head">
<div class="list-lead warn"><span class="mi">${z.jenis === 'Sakit' ? 'sick' : 'event_busy'}</span></div>
<div style="flex:1;min-width:0">
<div class="list-title">${esc(z.nama)}</div>
<div class="list-sub">${esc(z.kelas)} &middot; ${esc(z.jenis)} &middot; ${tglSingkat(z.tanggal)}</div>
</div>
${chipStatus('Menunggu')}
</div>
<div class="data-label">Alasan</div>
<div class="list-text">${esc(z.alasan)}</div>
${z.bukti ? `<img src="${esc(z.bukti)}" alt="Bukti ${esc(z.jenis)}" class="review-thumb" loading="lazy"
onclick="bukaPratinjau('Bukti ${esc(z.jenis)} — ${esc(z.nama)}','${esc(z.bukti)}','','gambar')">` : ''}
<div class="btn-row" style="margin-top:16px">
<button class="btn btn-success btn-sm" onclick="prosesIzin('${esc(z.id)}','Disetujui')">
<span class="mi">check</span> Setujui</button>
<button class="btn btn-danger btn-sm" onclick="prosesIzin('${esc(z.id)}','Ditolak')">
<span class="mi">close</span> Tolak</button>
</div>
</article>`).join('');
} catch (err) { kartu.hidden = true; }
}
function prosesIzin(id, keputusan) {
bukaModal(keputusan === 'Ditolak' ? 'Tolak Pengajuan' : 'Setujui Pengajuan', `
<div class="field">
<label class="field-label" for="vzKomentar">Catatan untuk Siswa</label>
<textarea class="field-input" id="vzKomentar" rows="3" maxlength="400"
placeholder="${keputusan === 'Ditolak' ? 'Jelaskan alasan penolakan.' : 'Opsional.'}"></textarea>
<div class="field-error" id="errVzKomentar"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: keputusan === 'Ditolak' ? 'Tolak' : 'Setujui',
kelas: keputusan === 'Ditolak' ? 'btn-danger' : 'btn-success',
aksi: async () => {
const c = $('vzKomentar').value.trim();
if (keputusan === 'Ditolak' && !c) { $('errVzKomentar').textContent = 'Alasan wajib diisi.'; return; }
tutupModal();
tampilkanSibuk('Menyimpan verifikasi…');
try {
const res = await panggil('verifikasiIzin', AppState.sessionToken, id, keputusan, c);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) {
// Butir yang barusan diputuskan dibuang dari antrean tersinggah, jadi ia
// hilang dari layar seketika — bukan satu detik kemudian saat penyegaran
// senyap selesai.
batalkanPaketData();
suntikBaris('getAntreanIzin', [AppState.sessionToken], null, [id], 'id');
muatAntreanIzin(); muatTabelMonitoring();
}
} catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); }
} }]);
}
// ── Halaman Detail Siswa (v7.5) ───────────────────────────────────────────
//
// Menggantikan modal detail yang lama. Modal memaksa seluruh riwayat seorang
// siswa masuk ke satu kotak sempit yang harus digulir sendiri di dalam layar
// yang juga digulir — dua gulungan bersarang, dan tidak satu pun bagiannya bisa
// dibagikan atau dicetak. Halaman penuh menghilangkan keduanya sekaligus.
function initDetailSiswa() {
if (!AppState.siswaDetail) { navigateTo('monitoring'); return; }
muatDetailSiswa(AppState.siswaDetail);
}
async function muatDetailSiswa(siswaId, paksa) {
const box = $('dsIsi');
if (!box || !siswaId) return;
box.innerHTML = memuatInline('Mengambil detail siswa…');
let res;
try { res = await (paksa ? panggil : panggilCepat)('getDetailSiswa', AppState.sessionToken, siswaId); }
catch (e) { box.innerHTML = emptyState('wifi_off', 'Gagal memuat detail', e.message); return; }
if (!res.success) { box.innerHTML = emptyState('block', 'Tidak dapat dibuka', res.message); return; }
gambarDetailSiswa(res.data);
muatRiwayatPenempatan(siswaId);
muatRekapDetailSiswa(siswaId, nilaiSaring('ds', 'rentang') || 'bulanan');
}
function gambarDetailSiswa(d) {
const box = $('dsIsi');
const s = d.siswa;
if (!box || !s) return;
const inisial = String(s.nama || '?').trim().charAt(0).toUpperCase();
const baris = [
{ ikon: 'badge',      label: 'NIS',              nilai: s.nis },
{ ikon: 'school',     label: 'Kelas / Jurusan',  nilai: s.kelas + ' · ' + s.jurusan },
{ ikon: 'wc',         label: 'Jenis Kelamin',    nilai: d.jenisKelamin || '-' },
{ ikon: 'call',       label: 'Kontak',           nilai: s.noHp || '-',
  tautan: s.noHp ? 'tel:' + String(s.noHp).replace(/[^0-9+]/g, '') : '' },
{ ikon: 'home',       label: 'Alamat',           nilai: d.alamat || '-' },
{ ikon: 'domain',     label: 'Tempat PKL',       nilai: s.tempat, sub: s.alamatTempat },
{ ikon: 'supervisor_account', label: 'Guru Pembimbing', nilai: s.guru },
{ ikon: 'event',      label: 'Periode PKL',
  nilai: tglSingkat(s.tanggalMulai) + ' – ' + tglSingkat(s.tanggalSelesai) }
];
if (s.shift) baris.splice(6, 0, { ikon: 'schedule', label: 'Shift Hari Ini', nilai: s.shift });
box.innerHTML = `
<section class="ds-kepala">
<div class="ds-avatar">${d.foto
  ? `<img src="${esc(d.foto)}" alt="Foto ${esc(s.nama)}" loading="lazy">`
  : esc(inisial)}</div>
<div class="ds-kepala-teks">
<h1 class="ds-nama">${esc(s.nama)}</h1>
<p class="ds-sub">${esc(s.nis)} &middot; ${esc(s.kelas)} &middot; ${esc(s.tempat)}</p>
<div class="ds-chip">
${chipStatus(s.statusPresensi)}${chipStatus(s.statusJurnal)}
${s.waktuPresensi ? `<span class="chip chip-neutral">
<span class="mi">login</span>${jamTampil(s.waktuPresensi)} WIB</span>` : ''}
</div>
</div>
${d.bolehKelola ? `<div class="ds-aksi">
<button class="btn btn-outline btn-sm" onclick="bukaPindahTempat('${esc(s.siswaId)}')">
<span class="mi">swap_horiz</span> Pindah Tempat PKL</button>
${s.bisaBatalPindah ? `<button class="btn btn-outline btn-sm" onclick="bukaBatalPindah('${esc(s.siswaId)}')">
<span class="mi">undo</span> Batalkan Pindah</button>` : ''}
</div>` : ''}
</section>

<div class="ds-ringkas" id="dsRingkas">${[0, 1, 2, 3, 4].map(() =>
`<div class="skeleton" style="height:82px;border-radius:14px"></div>`).join('')}</div>

<div class="grid-2">
<section class="card">
<div class="card-head"><h2 class="card-title"><span class="mi">contact_page</span> Data Siswa &amp; Penempatan</h2></div>
<div class="card-body">
<div class="ds-info">${baris.map(b => `
<div class="ds-info-baris">
<span class="ds-info-ikon"><span class="mi">${b.ikon}</span></span>
<div class="ds-info-teks">
<span class="ds-info-label">${b.label}</span>
<span class="ds-info-nilai">${b.tautan
  ? `<a href="${esc(b.tautan)}">${esc(b.nilai)}</a>` : esc(b.nilai)}</span>
${b.sub ? `<span class="ds-info-sub">${esc(b.sub)}</span>` : ''}
</div></div>`).join('')}</div>
<div id="detailRiwayatTempat" style="margin-top:16px"><div class="skeleton" style="height:90px"></div></div>
</div>
</section>

<section class="card">
<div class="card-head">
<h2 class="card-title"><span class="mi">history</span> Riwayat Presensi</h2>
<div class="rw-alat">
${panelSaringKlien('ds', 'Saring Riwayat', [
  { k: 'rentang', label: 'Rentang Waktu',
    opsi: [['mingguan', '7 hari terakhir'], ['bulanan', 'Bulan ini'], ['semua', 'Semua data']],
    bawaan: 'bulanan' }
])}
</div>
</div>
<div class="card-body" id="dsRiwayat">${memuatInline('Mengambil riwayat…')}</div>
</section>
</div>`;
daftarkanSaring('ds', function () {
muatRekapDetailSiswa(AppState.siswaDetail, nilaiSaring('ds', 'rentang') || 'bulanan');
});
}
/**
 * Panel saringan versi klien.
 *
 * panelSaring() milik server merakit HTML-nya saat halaman dibangun; di sini
 * panelnya baru ada sesudah data siswanya tiba, jadi bentuk yang sama dirakit
 * di klien. Kelas dan id-nya persis sama, sehingga bukaPanelFilter/ubahSaring
 * yang sudah ada bekerja tanpa perlu tahu siapa yang merakitnya.
 */
function panelSaringKlien(pfx, judul, field) {
return `<div class="filter-wrap">
<button class="btn btn-outline btn-sm filter-btn" id="${pfx}FilterBtn"
onclick="bukaPanelFilter('${pfx}')" aria-haspopup="true" aria-expanded="false">
<span class="mi">filter_list</span> Filter
<span class="filter-badge" id="${pfx}FilterBadge" hidden>0</span>
</button>
<div class="filter-panel" id="${pfx}FilterPanel" hidden role="dialog" aria-label="${esc(judul)}">
<div class="filter-panel-kepala"><span>${esc(judul)}</span>
<button class="btn-icon btn-icon-sm" aria-label="Tutup"
onclick="tutupPanelFilter('${pfx}')"><span class="mi">close</span></button></div>
<div class="filter-panel-isi">${field.map(f => `
<div class="filter-field">
<label class="filter-label" for="${pfx}_s_${esc(f.k)}">${esc(f.label)}</label>
<select class="field-input" id="${pfx}_s_${esc(f.k)}"
onchange="ubahSaring('${pfx}','${esc(f.k)}',this.value)">
${f.opsi.map(o => `<option value="${esc(o[0])}"${
(nilaiSaring(pfx, f.k) || f.bawaan) === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}
</select></div>`).join('')}</div>
<div class="filter-panel-kaki">
<button class="btn btn-outline btn-sm" onclick="resetSaring('${pfx}')">
<span class="mi">restart_alt</span> Atur Ulang</button>
<button class="btn btn-primary btn-sm" onclick="tutupPanelFilter('${pfx}')">Selesai</button>
</div></div></div>`;
}
const DS_UBIN = [
{ k: 'Hadir', ikon: 'check_circle', nada: 'ok',    label: 'Hadir' },
{ k: 'Telat', ikon: 'schedule',     nada: 'warn',  label: 'Terlambat' },
{ k: 'Izin',  ikon: 'event_busy',   nada: 'info',  label: 'Izin' },
{ k: 'Sakit', ikon: 'sick',         nada: 'info',  label: 'Sakit' },
{ k: 'Alpha', ikon: 'person_off',   nada: 'error', label: 'Alpha' }
];
async function muatRekapDetailSiswa(siswaId, mode) {
const box = $('dsRiwayat'), ringkas = $('dsRingkas');
if (!box || !siswaId) return;
box.innerHTML = memuatInline('Mengambil riwayat…');
let res;
try { res = await panggilCepat('getRiwayatPresensi', AppState.sessionToken, { mode: mode, siswaId: siswaId }); }
catch (e) { box.innerHTML = emptyState('wifi_off', 'Gagal memuat riwayat', e.message); return; }
if (!res.success) { box.innerHTML = emptyState('block', 'Tidak dapat dibuka', res.message); return; }
const r = res.data.rekap || {};
// Libur sengaja TIDAK masuk penyebut. Tingkat kehadiran dihitung dari
// Hadir+Telat+Izin+Sakit+Alpha; kalau hari libur ikut, instansi yang tutup
// sehari justru menurunkan persentase siswanya.
const total = (r.Hadir || 0) + (r.Telat || 0) + (r.Izin || 0) + (r.Sakit || 0) + (r.Alpha || 0);
if (ringkas) {
ringkas.innerHTML = DS_UBIN.map(function (u) {
const n = r[u.k] || 0;
return `<div class="ps-ubin ds-ubin${u.nada ? ' nada-' + u.nada : ''}">
<span class="ps-ubin-ikon"><span class="mi">${u.ikon}</span></span>
<span class="ps-ubin-teks">
<span class="ps-ubin-nilai">${n}<small>${total ? Math.round(n / total * 100) : 0}%</small></span>
<span class="ps-ubin-label">${u.label}</span>
</span></div>`;
}).join('') +
`<div class="ps-ubin ds-ubin ds-ubin-lebar">
<span class="ps-ubin-ikon"><span class="mi">insights</span></span>
<span class="ps-ubin-teks">
<span class="ps-ubin-nilai">${total ? Math.round((r.Hadir || 0) / total * 100) : 0}<small>%</small></span>
<span class="ps-ubin-label">Tepat Waktu · ${res.data.rentang.label}${
r.Libur ? ' · ' + r.Libur + ' hari libur' : ''}</span>
</span></div>`;
}
const items = res.data.items || [];
if (!items.length) {
box.innerHTML = emptyState('history', 'Belum ada rekaman presensi',
'Tidak ada data pada rentang ' + String(res.data.rentang.label).toLowerCase() + '.');
return;
}
box.innerHTML = gambarJejakRiwayat(items);
}
/**
 * Riwayat presensi dikelompokkan PER HARI (v7.7).
 *
 * Daftar rata yang lama menampilkan setiap rekaman sebagai baris sejajar, dan
 * tanggalnya diulang pada setiap baris. Akibatnya dua rekaman satu hari —
 * masuk dan pulang — terbaca seperti dua hari berbeda, dan mata harus
 * membandingkan tanggal huruf demi huruf untuk tahu mana yang sepasang.
 *
 * Sekarang satu kartu = satu hari: kepalanya membawa tanggal dan status hari
 * itu, isinya jejak masuk → pulang beserta jam, jarak, dan lama di lokasi.
 */
function gambarJejakRiwayat(items) {
// Server sudah mengurutkan menurun; pengelompokan menjaga urutan itu.
const urutHari = [];
const perHari = {};
items.forEach(function (x) {
if (!perHari[x.tanggal]) { perHari[x.tanggal] = []; urutHari.push(x.tanggal); }
perHari[x.tanggal].push(x);
});
// Hari-harinya tetap terbaru di atas, tetapi ISI satu hari dibalik menjadi
// menaik: satu hari dibaca sebagai satu cerita — datang lalu pulang. Urutan
// menurun di dalam hari menampilkan "Presensi Pulang" di atas "Presensi
// Masuk", dan itu memaksa pembacanya membalik sendiri urutannya di kepala.
urutHari.forEach(function (tgl) {
perHari[tgl].sort(function (a, b) { return String(a.waktu || '').localeCompare(String(b.waktu || '')); });
});
const nada = { Hadir: 'ok', Telat: 'warn', Alpha: 'danger', Libur: 'netral',
               Izin: 'info', Sakit: 'info', 'Di Luar Radius': 'danger' };
const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
return '<div class="rp-jejak ds-riwayat">' + urutHari.map(function (tgl) {
const baris = perHari[tgl];
const d = new Date(tgl + 'T00:00:00');
// Status hari itu diambil dari rekaman MASUK bila ada; kalau tidak, dari
// rekaman pertamanya. Status "Pulang" bukan penilaian atas harinya.
const utama = baris.filter(function (x) { return x.jenis !== 'Pulang'; })[0] || baris[0];
const masuk = baris.filter(function (x) { return x.jenis === 'Masuk'; })[0];
const pulang = baris.filter(function (x) { return x.jenis === 'Pulang'; })[0];
const lama = (masuk && pulang) ? selisihJam(masuk.waktu, pulang.waktu) : '';
return `<section class="rp-hari nada-${nada[utama.status] || 'info'}">
<header class="rp-kepala">
<div class="rp-tgl">
<span class="rp-tgl-angka">${String(d.getDate()).padStart(2, '0')}</span>
<span class="rp-tgl-bulan">${bulan[d.getMonth()]}</span>
</div>
<div class="rp-kepala-teks">
<div class="rp-hari-nama">${hari[d.getDay()]}</div>
<div class="rp-hari-sub">${d.getFullYear()}${lama ? ' &middot; ' + lama + ' di lokasi' : ''}</div>
</div>
${chipStatus(utama.status)}
</header>
<div class="rp-isi">${baris.map(function (x) { return barisRiwayat(x, tgl); }).join('')}</div>
</section>`;
}).join('') + '</div>';
}
/** Selisih dua jam "HH:mm" sebagai "7j 42m". Kosong bila tidak masuk akal. */
function selisihJam(a, b) {
const ke = function (j) {
const p = String(j || '').split(':');
if (p.length < 2) return NaN;
return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};
const m = ke(b) - ke(a);
if (!(m > 0)) return '';
const j = Math.floor(m / 60), sisa = m % 60;
return (j ? j + 'j ' : '') + sisa + 'm';
}
function barisRiwayat(x, tgl) {
const masuk = x.jenis === 'Masuk';
const pulang = x.jenis === 'Pulang';
const ikon = masuk ? 'login' : pulang ? 'logout'
  : x.jenis === 'Alpha' ? 'person_off' : x.jenis === 'Libur' ? 'weekend'
  : x.jenis === 'Izin' ? 'event_busy' : x.jenis === 'Sakit' ? 'sick' : 'info';
const judul = masuk ? 'Presensi Masuk' : pulang ? 'Presensi Pulang'
  : x.jenis === 'Alpha' ? 'Tidak hadir tanpa keterangan'
  : x.jenis === 'Libur' ? 'Hari libur' : x.jenis;
// Jam dan jarak sengaja dipisah menjadi dua bidang bernama, bukan satu baris
// "07:42 WIB · 18 m". Keduanya menjawab pertanyaan yang berbeda — kapan, dan
// dari seberapa dekat — dan menggabungkannya membuat keduanya terbaca sekilas
// sebagai satu keterangan waktu.
const bidang = [];
if (x.waktu) bidang.push(['schedule', 'Jam', jamTampil(x.waktu) + ' WIB']);
if (x.jarak !== '' && x.jarak != null && x.jarak !== 0) bidang.push(['near_me', 'Jarak', x.jarak + ' m']);
return `<div class="rp-baris${masuk ? ' rp-masuk' : pulang ? ' rp-pulang' : ''}">
<span class="rp-titik"><span class="mi">${ikon}</span></span>
<div class="rp-baris-isi">
<div class="rp-judul">${esc(judul)}</div>
${bidang.length ? `<div class="rp-bidang">${bidang.map(function (f) {
return `<span class="rp-bidang-satu"><span class="mi">${f[0]}</span>
<span class="rp-bidang-label">${f[1]}</span><b>${esc(f[2])}</b></span>`;
}).join('')}</div>` : ''}
${x.catatan ? `<div class="rp-catatan">${esc(x.catatan)}</div>` : ''}
</div>
${x.foto ? `<button class="btn-icon" aria-label="Foto ${esc(judul.toLowerCase())} ${esc(tglSingkat(tgl))}"
onclick="bukaPratinjau('Foto Presensi','${esc(x.foto)}','','gambar')">
<span class="mi">image</span></button>` : ''}
</div>`;
}
function initRekapJurnal() {
muatRekapJurnal();
muatAntreanJurnal();
}
function gantiTabJurnal(tab, tombol) {
$$('.tab-inline .tab-btn').forEach(b => b.classList.toggle('active', b === tombol));
$('panelRekapJurnal').hidden = (tab !== 'rekap');
$('panelAntreanJurnal').hidden = (tab !== 'antrean');
}
async function muatRekapJurnal() {
try {
const res = await panggilCepat('getRekapJurnal', AppState.sessionToken);
if (!res.success) {
$('tabelRekapJurnal').innerHTML = emptyState('block', 'Akses ditolak', res.message);
return;
}
const r = res.data.ringkas;
$('rjRingkas').innerHTML = [
{ ikon: 'group', kelas: '', nilai: r.totalSiswa, label: 'Siswa PKL' },
{ ikon: 'menu_book', kelas: 'ok', nilai: r.totalJurnal, label: 'Total Jurnal' },
{ ikon: 'hourglass_top', kelas: 'warn', nilai: r.totalMenunggu, label: 'Menunggu Review' },
{ ikon: 'person_off', kelas: 'danger', nilai: r.belumPernahIsi, label: 'Belum Pernah Isi' }
].map(c => `<div class="kpi-card">
<div class="kpi-icon ${c.kelas}"><span class="mi">${c.ikon}</span></div>
<div><div class="kpi-val">${c.nilai}</div><div class="kpi-lbl">${c.label}</div></div>
</div>`).join('');
buatTabel({
id: 'rekapJurnal', mount: 'tabelRekapJurnal', idPrefix: 'rj',
judulEkspor: 'Rekap Jurnal Harian',
data: res.data.items, kunciPilih: 'siswaId', sortAwal: 'Nama',
cariField: ['Nama', 'NIS', 'Kelas', 'Tempat', 'Guru'],
kosong: { ikon: 'menu_book', judul: 'Belum ada data', desc: 'Belum ada siswa dengan penempatan aktif.' },
kolom: [
{ k: 'Nama', label: 'Siswa', sortable: true,
render: r => `<div class="td-strong">${esc(r.Nama)}</div><div class="td-sub">${esc(r.NIS)} · ${esc(r.Kelas)}</div>` },
{ k: 'Tempat', label: 'Tempat PKL', sortable: true,
render: r => `<div>${esc(r.Tempat)}</div><div class="td-sub">${esc(r.Guru)}</div>` },
{ k: 'Total', label: 'Total', sortable: true, tipe: 'angka', kelas: 'td-num' },
{ k: 'Disetujui', label: 'Disetujui', sortable: true, tipe: 'angka', kelas: 'td-num',
render: r => `<span style="color:var(--success);font-weight:600">${r.Disetujui}</span>` },
{ k: 'Menunggu', label: 'Menunggu', sortable: true, tipe: 'angka', kelas: 'td-num',
render: r => r.Menunggu ? `<span style="color:var(--warning);font-weight:600">${r.Menunggu}</span>` : '0' },
{ k: 'Ditolak', label: 'Ditolak', sortable: true, tipe: 'angka', kelas: 'td-num',
render: r => r.Ditolak ? `<span style="color:var(--error);font-weight:600">${r.Ditolak}</span>` : '0' },
{ k: 'TerakhirIsi', label: 'Terakhir Isi', sortable: true,
render: r => r.TerakhirIsi ? tglSingkat(r.TerakhirIsi) : '<span class="td-sub">belum pernah</span>' }
],
aksi: r => `<button class="btn-icon" aria-label="Lihat jurnal ${esc(r.Nama)}"
onclick="bukaJurnalSiswa('${esc(r.siswaId)}')"><span class="mi">visibility</span></button>`
});
} catch (err) {
$('tabelRekapJurnal').innerHTML = emptyState('error', 'Gagal memuat rekap', err.message);
}
}
async function bukaJurnalSiswa(siswaId) {
bukaModal('Jurnal Siswa', memuatInline('Mengambil jurnal siswa…'), []);
try {
const res = await panggil('getJurnalSiswa', AppState.sessionToken, siswaId);
if (!res.success) { $('modalBody').innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
$('modalTitle').textContent = 'Jurnal — ' + res.data.nama;
const items = res.data.items;
$('modalBody').innerHTML = items.length ? `<div class="list">${items.map(j => `
<div class="list-item" style="align-items:flex-start">
<div class="list-lead ${j.status === 'Disetujui' ? 'ok' : j.status === 'Ditolak' ? 'danger' : 'warn'}">
<span class="mi">${j.status === 'Disetujui' ? 'check' : j.status === 'Ditolak' ? 'close' : 'hourglass_top'}</span></div>
<div class="list-main">
<div class="list-title">${tglSingkat(j.tanggal)}</div>
<div class="list-text">${esc(j.kegiatan)}</div>
${j.komentar ? `<div class="list-sub" style="margin-top:6px"><strong>Komentar:</strong> ${esc(j.komentar)}</div>` : ''}
</div>
<div class="list-tail">${chipStatus(j.status)}</div>
</div>`).join('')}</div>`
: emptyState('note_add', 'Belum ada jurnal', 'Siswa ini belum pernah mengisi jurnal.');
$('modalFoot').innerHTML = '';
} catch (err) {
$('modalBody').innerHTML = emptyState('error', 'Gagal memuat', err.message);
}
}
async function muatAntreanJurnal() {
const box = $('panelAntreanJurnal');
if (!box) return;
try {
const res = await panggilCepat('getAntreanJurnal', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
const badge = $('badgeAntreanJurnal');
if (badge) { badge.textContent = res.data.length; badge.hidden = !res.data.length; }
if (!res.data.length) {
box.innerHTML = emptyState('task_alt', 'Tidak ada jurnal menunggu',
'Semua jurnal siswa sudah direview. Kerja bagus!');
return;
}
AppState.antreanJurnal = res.data;
AppState.jurnalTerpilih = [];
// Bilah aksi massal. Seorang guru bisa memegang puluhan siswa, dan sampai v6.9
// menyetujui antrean berarti satu perjalanan ke server untuk SETIAP jurnal —
// pada Apps Script itu 1-2 detik masing-masing. Itulah alasan paling sering
// antrean dibiarkan menumpuk, dan itu masalah alur kerja, bukan masalah tombol.
box.innerHTML = `
<div class="antrean-alat">
<label class="pilih-semua">
<input type="checkbox" id="jrPilihSemua" onchange="pilihSemuaJurnal(this.checked)">
<span>Pilih semua (${res.data.length})</span>
</label>
<div class="antrean-aksi" id="jrAksiMassal" hidden>
<span class="antrean-jml" id="jrJumlahPilih">0 dipilih</span>
<button class="btn btn-success btn-sm" onclick="setujuiJurnalTerpilih()">
<span class="mi">done_all</span> Setujui Terpilih</button>
</div>
</div>` + res.data.map(j => `
<article class="review-card" id="rvk-${esc(j.id)}">
<div class="review-head">
<label class="rv-pilih">
<input type="checkbox" value="${esc(j.id)}" aria-label="Pilih jurnal ${esc(j.namaSiswa)}"
onchange="tandaiJurnal('${esc(j.id)}', this.checked)">
</label>
<div class="list-lead warn"><span class="mi">hourglass_top</span></div>
<div style="flex:1;min-width:0">
<div class="list-title">${esc(j.namaSiswa)}</div>
<div class="list-sub">${esc(j.kelas)} &middot; ${tglSingkat(j.tanggal)}</div>
</div>
${chipStatus('Menunggu')}
</div>
<div class="data-label">Uraian Kegiatan</div>
<div class="list-text">${esc(j.kegiatan)}</div>
${j.kendala ? `<div class="data-label" style="margin-top:12px">Kendala</div>
<div class="list-text">${esc(j.kendala)}</div>` : ''}
${j.foto ? `<img src="${esc(j.foto)}" alt="Dokumentasi jurnal" class="review-thumb" loading="lazy"
onclick="bukaPratinjau('Dokumentasi ${esc(j.namaSiswa)}','${esc(j.foto)}','','gambar')">` : ''}
<div class="btn-row" style="margin-top:16px">
<button class="btn btn-success btn-sm" onclick="prosesJurnal('${esc(j.id)}','Disetujui')">
<span class="mi">check</span> Setujui</button>
<button class="btn btn-outline btn-sm" onclick="prosesJurnal('${esc(j.id)}','Disetujui', true)">
<span class="mi">comment</span> Setujui + Komentar</button>
<button class="btn btn-danger btn-sm" onclick="prosesJurnal('${esc(j.id)}','Ditolak', true)">
<span class="mi">close</span> Tolak</button>
</div>
</article>`).join('');
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat antrean', err.message);
}
}
function tandaiJurnal(id, pilih) {
const set = AppState.jurnalTerpilih || (AppState.jurnalTerpilih = []);
const i = set.indexOf(id);
if (pilih && i === -1) set.push(id);
else if (!pilih && i !== -1) set.splice(i, 1);
const kartu = $('rvk-' + id);
if (kartu) kartu.classList.toggle('terpilih', pilih);
// Kotak "pilih semua" mengikuti keadaan sebenarnya, bukan klik terakhir:
// tanpa ini ia tetap tercentang setelah satu baris dilepas, dan menjadi
// kontrol yang berbohong tentang isi daftarnya.
const semua = $('jrPilihSemua');
if (semua) {
const total = (AppState.antreanJurnal || []).length;
semua.checked = set.length === total && total > 0;
semua.indeterminate = set.length > 0 && set.length < total;
}
perbaruiBilahJurnal();
}
function pilihSemuaJurnal(pilih) {
const daftar = AppState.antreanJurnal || [];
AppState.jurnalTerpilih = pilih ? daftar.map(j => j.id) : [];
$$('.rv-pilih input').forEach(function (c) { c.checked = pilih; });
daftar.forEach(function (j) {
const kartu = $('rvk-' + j.id);
if (kartu) kartu.classList.toggle('terpilih', pilih);
});
const semua = $('jrPilihSemua');
if (semua) semua.indeterminate = false;
perbaruiBilahJurnal();
}
function perbaruiBilahJurnal() {
const n = (AppState.jurnalTerpilih || []).length;
const bar = $('jrAksiMassal'), lbl = $('jrJumlahPilih');
if (bar) bar.hidden = n === 0;
if (lbl) lbl.textContent = n + ' dipilih';
}
function setujuiJurnalTerpilih() {
const ids = (AppState.jurnalTerpilih || []).slice();
if (!ids.length) { toast('Belum ada jurnal yang dipilih.', 'warning'); return; }
bukaModal('Setujui ' + ids.length + ' Jurnal', `
<p>Seluruh jurnal yang dipilih akan ditandai <strong>Disetujui</strong>.</p>
<div class="field">
<label class="field-label" for="rvKomentarMassal">Komentar untuk semua (opsional)</label>
<textarea class="field-input" id="rvKomentarMassal" rows="3" maxlength="600"
placeholder="Misalnya: Uraian sudah lengkap, pertahankan."></textarea>
<p class="field-help">Komentar yang sama dikirim ke setiap jurnal yang dipilih.</p>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">done_all</span> Setujui Semua', kelas: 'btn-success',
aksi: () => {
const k = ($('rvKomentarMassal') || {}).value || '';
tutupModal();
kirimReviewMassal(ids, k.trim());
} }]);
}
async function kirimReviewMassal(ids, komentar) {
tampilkanSibuk('Menyetujui ' + ids.length + ' jurnal…');
try {
const res = await panggil('reviewJurnalMassal', AppState.sessionToken, ids, komentar);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6000);
if (res.success) {
batalkanPaketData();
suntikBaris('getAntreanJurnal', [AppState.sessionToken], null, ids, 'id');
AppState.jurnalTerpilih = [];
muatAntreanJurnal(); muatRekapJurnal();
}
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function prosesJurnal(id, status, perluKomentar) {
if (!perluKomentar) { kirimReviewJurnal(id, status, ''); return; }
bukaModal(status === 'Ditolak' ? 'Tolak Jurnal' : 'Setujui dengan Komentar', `
<div class="field">
<label class="field-label" for="rvKomentar">Komentar untuk Siswa</label>
<textarea class="field-input" id="rvKomentar" rows="4" maxlength="600"
placeholder="${status === 'Ditolak' ? 'Jelaskan apa yang perlu diperbaiki.' : 'Apresiasi atau masukan (opsional).'}"></textarea>
${status === 'Ditolak' ? '<p class="field-help">Komentar wajib diisi saat menolak jurnal.</p>' : ''}
<div class="field-error" id="errRvKomentar"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: status === 'Ditolak' ? '<span class="mi">close</span> Tolak Jurnal' : '<span class="mi">check</span> Setujui',
kelas: status === 'Ditolak' ? 'btn-danger' : 'btn-success',
aksi: () => {
const k = $('rvKomentar').value.trim();
if (status === 'Ditolak' && !k) { $('errRvKomentar').textContent = 'Komentar wajib diisi saat menolak.'; return; }
tutupModal();
kirimReviewJurnal(id, status, k);
} }]);
}
async function kirimReviewJurnal(id, status, komentar) {
tampilkanSibuk('Menyimpan review…');
try {
const res = await panggil('reviewJurnal', AppState.sessionToken, id, status, komentar);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) {
batalkanPaketData();
suntikBaris('getAntreanJurnal', [AppState.sessionToken], null, [id], 'id');
muatAntreanJurnal(); muatRekapJurnal();
}
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function muatRekapLaporan() {
try {
const res = await panggilCepat('getRekapLaporan', AppState.sessionToken);
if (!res.success) {
$('tabelRekapLaporan').innerHTML = emptyState('block', 'Akses ditolak', res.message);
return;
}
const r = res.data.ringkas;
$('rlRingkas').innerHTML = [
{ ikon: 'group', kelas: '', nilai: r.totalSiswa, label: 'Siswa PKL' },
{ ikon: 'hourglass_top', kelas: 'warn', nilai: r.menunggu, label: 'Menunggu Review' },
{ ikon: 'check_circle', kelas: 'ok', nilai: r.disetujui, label: 'Disetujui' },
{ ikon: 'description', kelas: 'danger', nilai: r.belumAda, label: 'Belum Unggah' }
].map(c => `<div class="kpi-card">
<div class="kpi-icon ${c.kelas}"><span class="mi">${c.ikon}</span></div>
<div><div class="kpi-val">${c.nilai}</div><div class="kpi-lbl">${c.label}</div></div>
</div>`).join('');
buatTabel({
id: 'rekapLaporan', mount: 'tabelRekapLaporan', idPrefix: 'rl',
judulEkspor: 'Rekap Laporan Akhir',
data: res.data.items, kunciPilih: 'siswaId', sortAwal: 'Nama',
cariField: ['Nama', 'NIS', 'Kelas', 'Tempat', 'Guru', 'Judul'],
kosong: { ikon: 'description', judul: 'Belum ada data', desc: 'Belum ada siswa dengan penempatan aktif.' },
filterTetap: [{ k: 'Status', label: 'Status Laporan',
opsi: ['Belum Ada', 'Menunggu', 'Disetujui', 'Ditolak'] }],
kolom: [
{ k: 'Nama', label: 'Siswa', sortable: true,
render: r => `<div class="td-strong">${esc(r.Nama)}</div><div class="td-sub">${esc(r.NIS)} · ${esc(r.Kelas)}</div>` },
{ k: 'Tempat', label: 'Tempat PKL', sortable: true,
render: r => `<div>${esc(r.Tempat)}</div><div class="td-sub">${esc(r.Guru)}</div>` },
{ k: 'Judul', label: 'Judul Laporan', sortable: true,
render: r => r.Judul ? esc(r.Judul) : '<span class="td-sub">belum diunggah</span>' },
{ k: 'Tanggal', label: 'Tanggal', sortable: true,
render: r => r.Tanggal ? tglSingkat(r.Tanggal) : '-' },
{ k: 'Status', label: 'Status', sortable: true, render: r => chipStatus(r.Status) }
],
aksi: r => r.laporanId ? `
<button class="btn-icon" aria-label="Pratinjau laporan"
onclick="bukaPratinjau('${esc(r.Judul)}','${esc(r.fileUrl)}','${esc(r.unduhUrl)}','dokumen')">
<span class="mi">visibility</span></button>
${r.Status !== 'Disetujui' ? `
<button class="btn-icon" aria-label="Setujui laporan"
onclick="prosesLaporan('${esc(r.laporanId)}','Disetujui')"><span class="mi">check_circle</span></button>
<button class="btn-icon danger" aria-label="Tolak laporan"
onclick="prosesLaporan('${esc(r.laporanId)}','Ditolak')"><span class="mi">cancel</span></button>` : ''}`
: '<span class="td-sub">—</span>'
});
} catch (err) {
$('tabelRekapLaporan').innerHTML = emptyState('error', 'Gagal memuat rekap', err.message);
}
}
function prosesLaporan(id, status) {
bukaModal(status === 'Ditolak' ? 'Tolak Laporan' : 'Setujui Laporan', `
<div class="field">
<label class="field-label" for="lpKomentar">Komentar</label>
<textarea class="field-input" id="lpKomentar" rows="4" maxlength="600"
placeholder="${status === 'Ditolak' ? 'Jelaskan bagian yang perlu diperbaiki.' : 'Masukan tambahan (opsional).'}"></textarea>
<div class="field-error" id="errLpKomentar"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: status === 'Ditolak' ? 'Tolak' : 'Setujui',
kelas: status === 'Ditolak' ? 'btn-danger' : 'btn-success',
aksi: async () => {
const k = $('lpKomentar').value.trim();
if (status === 'Ditolak' && !k) { $('errLpKomentar').textContent = 'Komentar wajib diisi saat menolak.'; return; }
tutupModal();
tampilkanSibuk('Menyimpan…');
try {
const res = await panggil('reviewLaporan', AppState.sessionToken, id, status, k);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) muatRekapLaporan();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
} }]);
}
async function muatDaftarPenilaian() {
const box = $('tabelPenilaian');
if (!box) return;
box.innerHTML = memuatInline('Mengambil rekap laporan…');
try {
const res = await panggilCepat('getDaftarPenilaian', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
AppState.kriteria = res.data.kriteria;
const totalBobot = res.data.totalBobot;
const info = $('infoBobot');
if (info) {
info.hidden = false;
info.className = 'alert ' + (totalBobot === 100 ? 'alert-info' : 'alert-warning');
$('infoBobotTeks').innerHTML = `<strong>Kriteria berlaku (${AppState.kriteria.length})</strong>
<p>${AppState.kriteria.map(k => esc(k.nama) + ' ' + k.bobot + '%').join(' · ')} —
total bobot <b>${totalBobot}%</b>.
${totalBobot === 100 ? '' : 'Nilai akhir tetap dinormalisasi ke skala 0–100.'}</p>`;
}
const kolomKriteria = AppState.kriteria.map(k => ({
k: 'kr_' + k.id, label: k.nama, sortable: true, tipe: 'angka', kelas: 'td-num',
render: r => (r.Detail && r.Detail[k.id] !== undefined) ? esc(r.Detail[k.id]) : '<span class="td-sub">—</span>'
}));
const data = res.data.items.map(r => {
const o = Object.assign({}, r);
AppState.kriteria.forEach(k => { o['kr_' + k.id] = (r.Detail && r.Detail[k.id] !== undefined) ? Number(r.Detail[k.id]) : null; });
return o;
});
buatTabel({
id: 'penilaian', mount: 'tabelPenilaian', idPrefix: 'pn',
judulEkspor: 'Penilaian Siswa PKL',
data: data, kunciPilih: 'siswaId', sortAwal: 'Nama',
cariField: ['Nama', 'NIS', 'Kelas', 'Tempat', 'Predikat'],
kosong: { ikon: 'grading', judul: 'Belum ada siswa untuk dinilai', desc: '' },
kolom: [
{ k: 'Nama', label: 'Siswa', sortable: true,
render: r => `<div class="td-strong">${esc(r.Nama)}</div><div class="td-sub">${esc(r.Kelas)}</div>` },
{ k: 'Tempat', label: 'Tempat PKL', sortable: true }
].concat(kolomKriteria).concat([
{ k: 'NilaiAkhir', label: 'Nilai Akhir', sortable: true, tipe: 'angka', kelas: 'td-num',
render: r => r.NilaiAkhir !== null && r.NilaiAkhir !== ''
? `<strong style="font-size:16px">${esc(r.NilaiAkhir)}</strong>`
: '<span class="td-sub">belum dinilai</span>' },
{ k: 'Predikat', label: 'Predikat', sortable: true,
render: r => r.Predikat ? `<span class="chip ${r.NilaiAkhir >= 90 ? 'chip-success'
: r.NilaiAkhir >= 80 ? 'chip-info' : r.NilaiAkhir >= 70 ? 'chip-warning' : 'chip-error'}">${esc(r.Predikat)}</span>` : '—' }
]),
aksi: r => `<button class="btn btn-outline btn-xs"
onclick="bukaFormNilaiSiswa('${esc(r.siswaId)}')">
<span class="mi">${r.NilaiAkhir ? 'edit' : 'add'}</span> ${r.NilaiAkhir ? 'Ubah' : 'Nilai'}</button>`
});
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
function bukaFormNilaiSiswa(siswaId) {
const st = AppState.tabel['penilaian'];
const r = st ? st.data.find(x => x.siswaId === siswaId) : null;
if (!r) { toast('Data siswa tidak ditemukan. Muat ulang halaman.', 'warning'); return; }
bukaFormNilai({ id: r.siswaId, nama: r.Nama }, r.Detail || {}, r.Catatan || '');
}
function bukaFormNilai(siswa, detail, catatan) {
const kriteria = AppState.kriteria || [];
if (!kriteria.length) { toast('Belum ada kriteria penilaian aktif.', 'warning'); return; }
bukaModal('Penilaian — ' + siswa.nama,
kriteria.map(k => `
<div class="field">
<label class="field-label" for="nl_${k.id}">${esc(k.nama)}
<span style="font-weight:400;color:var(--on-surface-muted)">(bobot ${k.bobot}%)</span></label>
<input class="field-input" id="nl_${k.id}" type="number" min="0" max="100" step="1"
value="${detail && detail[k.id] !== undefined ? esc(detail[k.id]) : ''}"
oninput="hitungPratinjauNilai()">
${k.deskripsi ? `<p class="field-help">${esc(k.deskripsi)}</p>` : ''}
</div>`).join('') + `
<div class="field">
<label class="field-label" for="nlCatatan">Catatan Pembimbing (opsional)</label>
<textarea class="field-input" id="nlCatatan" rows="3" maxlength="500">${esc(catatan || '')}</textarea>
</div>
<div class="info-tonal" style="margin-bottom:0">
<span class="mi">calculate</span>
<div>
<div class="info-eyebrow">Nilai Akhir (otomatis)</div>
<div class="info-strong" id="pratinjauNilai">—</div>
<div class="info-sub" id="pratinjauPredikat">Isi seluruh komponen untuk melihat hasil.</div>
</div>
</div>
<div class="field-error" id="errNilai" style="margin-top:8px"></div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">save</span> Simpan Nilai', kelas: 'btn-primary',
aksi: () => kirimPenilaian(siswa.id) }]);
hitungPratinjauNilai();
}
function hitungPratinjauNilai() {
if (!$('pratinjauNilai')) return;
const kriteria = AppState.kriteria || [];
let totalBobot = 0, akumulasi = 0, lengkap = true;
kriteria.forEach(k => {
const el = $('nl_' + k.id);
if (!el || el.value.trim() === '') { lengkap = false; return; }
const v = Number(el.value);
if (!isFinite(v) || v < 0 || v > 100) { lengkap = false; return; }
totalBobot += k.bobot;
akumulasi += v * k.bobot;
});
if (!lengkap || totalBobot <= 0) {
$('pratinjauNilai').textContent = '—';
$('pratinjauPredikat').textContent = 'Isi seluruh komponen (0–100) untuk melihat hasil.';
return;
}
const akhir = Math.round(akumulasi / totalBobot);
$('pratinjauNilai').textContent = akhir;
$('pratinjauPredikat').textContent = akhir >= 90 ? 'Sangat Kompeten' : akhir >= 80 ? 'Kompeten'
: akhir >= 70 ? 'Cukup Kompeten' : 'Belum Kompeten';
}
async function kirimPenilaian(siswaId) {
const kriteria = AppState.kriteria || [];
const nilai = {};
for (let i = 0; i < kriteria.length; i++) {
const el = $('nl_' + kriteria[i].id);
const v = Number(el ? el.value : '');
if (!el || el.value.trim() === '' || !isFinite(v) || v < 0 || v > 100) {
$('errNilai').textContent = 'Seluruh komponen wajib diisi dengan angka 0–100.';
return;
}
nilai[kriteria[i].id] = v;
}
tampilkanSibuk('Menyimpan nilai…');
try {
const res = await panggil('simpanPenilaian', AppState.sessionToken, {
siswaId: siswaId, nilai: nilai, catatan: $('nlCatatan').value.trim() });
sembunyikanSibuk();
if (!res.success) { $('errNilai').textContent = res.message; return; }
tutupModal();
toast(res.message, 'success', 5500);
muatDaftarPenilaian();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function bukaKelolaKriteria() {
bukaModal('Kriteria & Bobot Penilaian', memuatInline('Mengambil kriteria…'),
[{ label: 'Tutup', kelas: 'btn-outline', aksi: () => { tutupModal(); muatDaftarPenilaian(); } },
{ label: '<span class="mi">add</span> Tambah Kriteria', kelas: 'btn-primary', aksi: () => bukaFormKriteria() }]);
renderDaftarKriteria();
}
async function renderDaftarKriteria() {
try {
const res = await panggil('getKriteriaPenilaian', AppState.sessionToken);
const box = $('modalBody');
if (!box) return;
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
const total = res.data.totalBobot;
AppState.dataKriteriaPenuh = res.data.items;
box.innerHTML = `
<div class="alert ${total === 100 ? 'alert-success' : 'alert-warning'}" style="margin-bottom:14px">
<span class="mi">balance</span>
<div><strong>Total bobot aktif: ${total}%</strong>
<p>${total === 100 ? 'Sudah pas.'
: 'Idealnya 100%. Bila tidak, nilai akhir tetap dinormalisasi ke skala 0–100 secara proporsional.'}</p></div>
</div>
<div class="list">${res.data.items.map(k => `
<div class="list-item">
<div class="list-lead ${String(k.Aktif) === 'Ya' ? 'ok' : ''}"><span class="mi">tune</span></div>
<div class="list-main">
<div class="list-title">${esc(k.Nama)} <span style="color:var(--on-surface-muted);font-weight:400">· ${k.Bobot}%</span></div>
<div class="list-sub">${esc(k.Deskripsi || 'Tanpa deskripsi')} &middot; urutan ${k.Urutan}</div>
</div>
<div class="list-tail">
${chipStatus(String(k.Aktif) === 'Ya' ? 'Aktif' : 'Nonaktif')}
<button class="btn-icon" aria-label="Ubah kriteria"
onclick="bukaFormKriteriaId('${esc(k.ID)}')"><span class="mi">edit</span></button>
<button class="btn-icon danger" aria-label="Hapus kriteria"
onclick="hapusKriteriaUI('${esc(k.ID)}','${esc(k.Nama)}')"><span class="mi">delete</span></button>
</div>
</div>`).join('')}</div>`;
} catch (err) {
$('modalBody').innerHTML = emptyState('error', 'Gagal memuat kriteria', err.message);
}
}
function bukaFormKriteriaId(id) {
const k = (AppState.dataKriteriaPenuh || []).find(x => x.ID === id);
if (!k) { toast('Kriteria tidak ditemukan. Muat ulang halaman.', 'warning'); return; }
bukaFormKriteria(k);
}
function bukaFormKriteria(k) {
const d = k || {};
bukaModal(d.ID ? 'Ubah Kriteria' : 'Tambah Kriteria', `
<div class="field">
<label class="field-label" for="krNama">Nama Kriteria</label>
<input class="field-input" id="krNama" type="text" maxlength="60" value="${esc(d.Nama || '')}"
placeholder="Contoh: Kedisiplinan">
</div>
<div class="field">
<label class="field-label" for="krBobot">Bobot (%)</label>
<input class="field-input" id="krBobot" type="number" min="1" max="100" step="1" value="${esc(d.Bobot || '')}">
<p class="field-help">Total bobot seluruh kriteria aktif idealnya 100%.</p>
</div>
<div class="field">
<label class="field-label" for="krDeskripsi">Deskripsi (opsional)</label>
<textarea class="field-input" id="krDeskripsi" rows="2" maxlength="200">${esc(d.Deskripsi || '')}</textarea>
</div>
<div class="field">
<label class="field-label" for="krUrutan">Urutan Tampil</label>
<input class="field-input" id="krUrutan" type="number" min="1" max="99" step="1" value="${esc(d.Urutan || 99)}">
</div>
<div class="field">
<label class="field-label" for="krAktif">Status</label>
<select class="field-input" id="krAktif">
<option value="Ya" ${String(d.Aktif) !== 'Tidak' ? 'selected' : ''}>Aktif</option>
<option value="Tidak" ${String(d.Aktif) === 'Tidak' ? 'selected' : ''}>Nonaktif</option>
</select>
</div>
<div class="field-error" id="errKriteria"></div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: bukaKelolaKriteria },
{ label: '<span class="mi">save</span> Simpan', kelas: 'btn-primary',
aksi: () => simpanKriteriaUI(d.ID) }]);
}
async function simpanKriteriaUI(id) {
const payload = {
ID: id || null, Nama: $('krNama').value.trim(), Bobot: $('krBobot').value,
Deskripsi: $('krDeskripsi').value.trim(), Urutan: $('krUrutan').value, Aktif: $('krAktif').value
};
if (!payload.Nama) { $('errKriteria').textContent = 'Nama kriteria wajib diisi.'; return; }
tampilkanSibuk('Menyimpan kriteria…');
try {
const res = await panggil('simpanKriteria', AppState.sessionToken, payload);
sembunyikanSibuk();
if (!res.success) { $('errKriteria').textContent = res.message; return; }
toast(res.message, 'success', 5500);
bukaKelolaKriteria();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function hapusKriteriaUI(id, nama) {
const ya = await konfirmasi('Hapus Kriteria',
`Kriteria "${nama}" akan dihapus. Nilai yang sudah tersimpan tidak ikut terhapus, ` +
`namun rincian kriteria ini tidak lagi ditampilkan. Lanjutkan?`);
if (!ya) { bukaKelolaKriteria(); return; }
tampilkanSibuk('Menghapus…');
try {
const res = await panggil('hapusKriteria', AppState.sessionToken, id);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 5500);
bukaKelolaKriteria();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
// ── Antrean pengajuan pindah tempat PKL (Pokja PKL) ────────
async function muatAntreanPindah() {
const kartu = $('kartuPindah'), panel = $('panelPindah');
if (!kartu || !panel) return;
try {
const res = await panggilCepat('getAntreanPindah', AppState.sessionToken);
if (!res.success || !res.data || !res.data.length) { kartu.hidden = true; return; }
kartu.hidden = false;
$('badgePindah').textContent = res.data.length;
AppState.dataPindah = res.data;
panel.innerHTML = res.data.map(p => {
const halangan = !p.tujuanAktif ? 'Tempat tujuan sedang tidak menerima siswa.'
: p.sisaKuota <= 0 ? 'Kuota tempat tujuan sudah penuh.' : '';
return `
<article class="review-card">
<div class="review-head">
<div class="list-lead ${halangan ? 'danger' : 'warn'}"><span class="mi">swap_horiz</span></div>
<div style="flex:1;min-width:0">
<div class="list-title">${esc(p.nama)}</div>
<div class="list-sub">${esc(p.nis)} &middot; ${esc(p.kelas || '-')} &middot; diajukan ${tglSingkat(p.tanggalAjuan)}</div>
</div>
${chipStatus('Menunggu')}
</div>
<div class="pindah-alur">
<span class="pindah-titik">${esc(p.tempatAsal)}</span>
<span class="mi pindah-panah">arrow_forward</span>
<span class="pindah-titik pindah-tujuan">${esc(p.tempatTujuan)}
<span class="chip ${p.sisaKuota > 0 ? 'chip-success' : 'chip-error'}">${p.sisaKuota} sisa</span></span>
</div>
<div class="data-label" style="margin-top:12px">Alasan Siswa</div>
<div class="list-text">${esc(p.alasan)}</div>
${halangan ? `<div class="alert alert-warning" style="margin-top:12px">
<span class="mi">warning</span><div><strong>Belum dapat disetujui</strong><p>${esc(halangan)}</p></div></div>` : ''}
<div class="btn-row" style="margin-top:16px">
<button class="btn btn-success btn-sm" onclick="prosesPindah('${esc(p.id)}','Disetujui')"
${halangan ? 'disabled' : ''}><span class="mi">check</span> Setujui &amp; Pindahkan</button>
<button class="btn btn-danger btn-sm" onclick="prosesPindah('${esc(p.id)}','Ditolak')">
<span class="mi">close</span> Tolak</button>
</div>
</article>`;
}).join('');
} catch (err) { kartu.hidden = true; }
}
function prosesPindah(id, keputusan) {
const p = (AppState.dataPindah || []).find(x => x.id === id);
const setuju = keputusan === 'Disetujui';
bukaModal(setuju ? 'Setujui Perpindahan' : 'Tolak Pengajuan Pindah', `
${p ? `<div class="info-tonal"><span class="mi">person</span>
<div><div class="info-strong">${esc(p.nama)}</div>
<div class="info-sub">${esc(p.tempatAsal)} &rarr; ${esc(p.tempatTujuan)}</div></div></div>` : ''}
${setuju ? `
<div class="alert alert-info" style="margin:16px 0">
<span class="mi">info</span>
<div><strong>Yang akan terjadi</strong>
<p>Penempatan lama ditutup hari ini dan penempatan baru dibuka. Kuota kedua tempat
menyesuaikan otomatis. Presensi dan jurnal yang sudah tercatat tetap utuh dan tetap
terhitung dalam rekap satu periode.</p></div>
</div>
<div class="field">
<label class="field-label" for="pnGuru">Guru Pembimbing</label>
<select class="field-input" id="pnGuru"><option value="">Memuat…</option></select>
<div class="field-help">Kosongkan bila guru pembimbingnya tetap sama.</div>
</div>` : ''}
<div class="field">
<label class="field-label" for="pnCatatan">${setuju ? 'Catatan (opsional)' : 'Alasan Penolakan *'}</label>
<textarea class="field-input" id="pnCatatan" rows="3" maxlength="400"
placeholder="${setuju ? 'Catatan untuk arsip.' : 'Jelaskan agar siswa memahami keputusannya.'}"></textarea>
<div class="field-error" id="errPnCatatan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: setuju ? '<span class="mi">check</span> Setujui &amp; Pindahkan' : '<span class="mi">close</span> Tolak',
kelas: setuju ? 'btn-success' : 'btn-danger',
aksi: async () => {
const c = $('pnCatatan').value.trim();
const guru = $('pnGuru') ? $('pnGuru').value : '';
if (!setuju && !c) { $('errPnCatatan').textContent = 'Alasan penolakan wajib diisi.'; return; }
tutupModal();
tampilkanSibuk(setuju ? 'Memindahkan siswa…' : 'Menyimpan keputusan…');
try {
const res = await panggil('prosesPengajuanPindah', AppState.sessionToken, id, keputusan, guru, c);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6500);
if (res.success) {
batalkanPaketData();
suntikBaris('getAntreanPindah', [AppState.sessionToken], null, [id], 'id');
muatAntreanPindah(); muatTabelMonitoring();
}
} catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); }
} }]);
if (setuju) muatOpsiGuruKeSelect('pnGuru');
}

// ── Perpindahan langsung oleh Pokja PKL dari detail siswa ──
async function bukaPindahTempat(siswaId) {
tampilkanSibuk('Menyiapkan pilihan…');
let res;
try { res = await panggil('getOpsiPindah', AppState.sessionToken, siswaId); }
catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); return; }
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6000); return; }
if (!res.data.tempat.length) {
toast('Tidak ada tempat PKL lain yang aktif dan kuotanya tersisa.', 'warning', 6000);
return;
}
const d = res.data;
bukaModal('Pindah Tempat PKL', `
<div class="info-tonal"><span class="mi">person</span>
<div><div class="info-strong">${esc(d.namaSiswa)}</div>
<div class="info-sub">Sekarang di ${esc(d.tempatSekarang)} &middot; dibimbing ${esc(d.guruSekarang)}</div></div></div>

<div class="field" style="margin-top:16px">
<label class="field-label" for="ptTempat">Tempat PKL Tujuan *</label>
<select class="field-input" id="ptTempat">
<option value="">— Pilih tempat PKL —</option>
${d.tempat.map(t => `<option value="${esc(t.id)}">${esc(t.nama)} (sisa ${t.sisaKuota})</option>`).join('')}
</select>
<div class="field-error" id="errPtTempat"></div>
</div>

<div class="field">
<label class="field-label" for="ptGuru">Guru Pembimbing</label>
<select class="field-input" id="ptGuru">
<option value="">— Tetap ${esc(d.guruSekarang)} —</option>
${d.guru.map(g => `<option value="${esc(g.id)}">${esc(g.nama)} (${esc(g.nip)})</option>`).join('')}
</select>
<div class="field-help">Kosongkan bila guru pembimbingnya tidak berubah.</div>
</div>

<div class="field">
<label class="field-label" for="ptAlasan">Alasan Perpindahan *</label>
<textarea class="field-input" id="ptAlasan" rows="3" maxlength="400"
placeholder="Contoh: jarak tempat PKL terlalu jauh dari rumah siswa."></textarea>
<div class="field-help">Minimal 10 karakter. Tersimpan sebagai riwayat perpindahan.</div>
<div class="field-error" id="errPtAlasan"></div>
</div>

<div class="alert alert-info">
<span class="mi">history</span>
<div><strong>Data lama tetap aman</strong>
<p>Presensi dan jurnal yang sudah tercatat di ${esc(d.tempatSekarang)} tidak dihapus dan tetap
terhitung dalam rekap satu periode. Radius presensi mengikuti tempat baru mulai hari ini.</p></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">swap_horiz</span> Pindahkan', kelas: 'btn-primary',
aksi: () => kirimPindahTempat(siswaId) }]);
}
async function kirimPindahTempat(siswaId) {
const tempatTujuanId = $('ptTempat') ? $('ptTempat').value : '';
const guruBaruId = $('ptGuru') ? $('ptGuru').value : '';
const alasan = $('ptAlasan') ? $('ptAlasan').value.trim() : '';
['errPtTempat', 'errPtAlasan'].forEach(id => { if ($(id)) $(id).textContent = ''; });
if (!tempatTujuanId) { $('errPtTempat').textContent = 'Pilih tempat PKL tujuan.'; return; }
if (alasan.length < 10) { $('errPtAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }

tampilkanSibuk('Memindahkan siswa…');
try {
const res = await panggil('pindahTempatPKL', AppState.sessionToken,
{ siswaId: siswaId, tempatTujuanId: tempatTujuanId, guruBaruId: guruBaruId, alasan: alasan });
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 7000); return; }
tutupModal();
toast(res.message, 'success', 6500);
batalkanPaketData();
segarkanTampilanSiswa();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

// ── Riwayat penempatan pada modal detail siswa ─────────────
async function muatRiwayatPenempatan(siswaId) {
const box = $('detailRiwayatTempat');
if (!box) return;
try {
const res = await panggil('getRiwayatPenempatan', AppState.sessionToken, siswaId);
if (!res.success || !res.data || res.data.length <= 1) { box.hidden = true; return; }
box.hidden = false;
box.innerHTML = `<div class="info-eyebrow" style="margin-bottom:8px">
Riwayat Tempat PKL (${res.data.length} penempatan)</div>
<ol class="jejak-pindah">${res.data.map(r => `
<li class="jejak-item ${r.status === 'Aktif' ? 'jejak-aktif' : ''}">
<div class="jejak-nama">${esc(r.tempat)}
<span class="chip ${r.status === 'Aktif' ? 'chip-success' : 'chip-neutral'}">${esc(r.status)}</span></div>
<div class="jejak-sub">${tglSingkat(r.tanggalMulai)} – ${r.status === 'Aktif' ? 'sekarang' : tglSingkat(r.tanggalSelesai)}
&middot; ${r.hariHadir} hari hadir &middot; ${esc(r.guru)}</div>
${r.alasan ? `<div class="jejak-alasan">${esc(r.alasan)}${r.oleh ? ' — ' + esc(r.oleh) : ''}</div>` : ''}
</li>`).join('')}</ol>`;
} catch (e) { box.hidden = true; }
}


// ── Menarik kembali perpindahan yang terlanjur diproses ────
async function bukaBatalPindah(siswaId) {
tampilkanSibuk('Memuat riwayat…');
let res;
try { res = await panggil('getRiwayatPenempatan', AppState.sessionToken, siswaId); }
catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); return; }
sembunyikanSibuk();
if (!res.success || !res.data || res.data.length < 2) {
toast('Penempatan siswa ini bukan hasil perpindahan.', 'warning', 5500);
return;
}
const sekarang = res.data[0], sebelum = res.data[1];
bukaModal('Batalkan Perpindahan', `
<div class="pindah-alur" style="margin-top:0">
<span class="pindah-titik">${esc(sekarang.tempat)}</span>
<span class="mi pindah-panah">arrow_back</span>
<span class="pindah-titik pindah-tujuan">${esc(sebelum.tempat)}</span>
</div>
<div class="alert alert-warning" style="margin:16px 0">
<span class="mi">undo</span>
<div><strong>Perpindahan akan ditarik kembali</strong>
<p>Siswa kembali ke <strong>${esc(sebelum.tempat)}</strong> beserta guru pembimbingnya yang lama.
Kuota kedua tempat menyesuaikan otomatis. Riwayat tetap mencatat bahwa perpindahan ini
pernah dibuat lalu dibatalkan.</p></div>
</div>
<div class="field">
<label class="field-label" for="bpAlasan">Alasan Pembatalan *</label>
<textarea class="field-input" id="bpAlasan" rows="3" maxlength="400"
placeholder="Contoh: salah memilih siswa saat menyetujui pengajuan."></textarea>
<div class="field-help">Minimal 10 karakter. Tersimpan sebagai catatan resmi.</div>
<div class="field-error" id="errBpAlasan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">undo</span> Tarik Kembali', kelas: 'btn-danger',
aksi: async () => {
const a = $('bpAlasan').value.trim();
if (a.length < 10) { $('errBpAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }
tutupModal();
tampilkanSibuk('Mengembalikan penempatan…');
try {
const r = await panggil('batalkanPindahTempat', AppState.sessionToken, siswaId, a);
sembunyikanSibuk();
if (!r.success) { toast(r.message, 'error', 8000); return; }
toast(r.message, 'success', 6500);
batalkanPaketData();
segarkanTampilanSiswa();
} catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); }
} }]);
}

window.__blok = 4;

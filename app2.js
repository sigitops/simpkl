const INIT_HALAMAN = {
'beranda':          () => AppState.user.role === 'siswa' ? muatDataBeranda() : muatDataMonitoring(),
'presensi':         () => initPresensi(),
'riwayat-presensi': () => { pasangTanggalDefault(); muatRiwayatPresensi(); },
'jurnal':           () => { pasangTanggalDefault(); muatRiwayatJurnal(); },
'tempat-pkl':       () => muatTempatPKL(),
'laporan':          () => muatStatusLaporan(),
'nilai':            () => muatNilai(),
'profil':           () => muatProfil(),
'monitoring':       () => { muatTabelMonitoring(); muatAntreanIzin(); muatAntreanPindah(); },
'detail-siswa':     () => initDetailSiswa(),
'detail-jurnal':    () => initDetailJurnal(),
'rekap-jurnal':     () => initRekapJurnal(),
'rekap-laporan':    () => muatRekapLaporan(),
'penilaian':        () => muatDaftarPenilaian(),
'pengumuman':       () => initPengumuman(),
'pendaftaran':      () => muatPendaftaran(),
'kelola-tempat':    () => muatTabelMaster(),
'kelola-siswa':     () => muatTabelMaster(),
'kelola-guru':      () => muatTabelMaster(),
'kelola-periode':   () => muatTabelMaster(),
'sertifikat':       () => initSertifikat(),
'jadwal-shift':     () => initJadwalShift(),
'hari-libur':       () => muatHariLibur(),
'pengaturan':       () => muatPengaturan(),
'login':            () => {}
};
async function muatDataBeranda() {
try {
const res = await panggilCepat('getDashboardSiswa', AppState.sessionToken);
if (!res.success) { toast(res.message, 'error'); return; }
const d = res.data;
AppState.penempatan = d.penempatan;
renderStatusPresensiBeranda(d);
renderJurnalBeranda(d);
renderInstansiBeranda(d);
renderProgresPkl(d);
renderStatistikSaya(d);
renderTugasMendatang(d);
renderPengumumanBeranda(d.pengumuman);
} catch (err) { toast(err.message, 'error'); }
}
function renderStatusPresensiBeranda(d) {
const chip = $('chipPresensi'), box = $('boxStatusPresensi');
if (!chip || !box) return;
if (!d.penempatan) {
chip.className = 'chip chip-neutral';
chip.innerHTML = '<span class="mi">remove</span>Belum Ada';
box.innerHTML = emptyState('domain_disabled', 'Belum ditempatkan',
'Ajukan pendaftaran tempat PKL terlebih dahulu.',
`<button class="btn btn-primary btn-sm" onclick="navigateTo('tempat-pkl')">Pilih Tempat PKL</button>`);
return;
}
const masuk = d.presensi.masuk, pulang = d.presensi.pulang;
// Hari libur ditampilkan apa adanya, LENGKAP DENGAN ALASANNYA. Siswa yang tetap
// ingin masuk masih bisa lewat halaman Presensi; yang dihilangkan hanyalah
// ajakan yang menyesatkan di beranda.
if (d.liburHariIni && !masuk) {
chip.className = 'chip chip-neutral';
chip.innerHTML = '<span class="mi">weekend</span>Libur';
box.innerHTML = `
<div class="presensi-sorot">
<div class="ps-tgl">${tglSingkat(new Date().toISOString().slice(0, 10))}</div>
<div class="ps-jam" style="font-size:20px">Hari Libur</div>
<div class="ps-ket">${esc(d.liburHariIni.keterangan || 'Tidak ada kegiatan PKL hari ini.')}</div>
</div>
<div class="stack" style="gap:10px;margin-top:14px">
<button class="btn btn-outline btn-block" onclick="navigateTo('riwayat-presensi')">
<span class="mi">history</span> Riwayat Presensi</button>
</div>`;
return;
}
chip.className = 'chip ' + (masuk ? (masuk.Status === 'Hadir' ? 'chip-success' : 'chip-warning') : 'chip-error');
chip.innerHTML = `<span class="mi">${masuk ? 'check_circle' : 'error'}</span>${
masuk ? esc(masuk.Status) : 'Belum Absen'}`;
// Keadaan presensi hari ini punya tiga tahap, dan tombolnya harus mengikuti
// tahap itu — bukan selalu "Presensi Sekarang". Siswa yang sudah absen masuk
// tetapi belum pulang perlu diarahkan ke absen pulang, bukan ditawari lagi
// sesuatu yang sudah dikerjakannya.
const ket = !masuk ? 'Belum melakukan presensi masuk'
: !pulang ? 'Sudah absen masuk ' + jamTampil(masuk.Waktu) + ' WIB — belum absen pulang'
: 'Masuk ' + jamTampil(masuk.Waktu) + ' · Pulang ' + jamTampil(pulang.Waktu) + ' WIB';
const labelTombol = !masuk ? 'Absen Masuk' : !pulang ? 'Absen Pulang' : 'Halaman Presensi';
box.innerHTML = `
<div class="presensi-sorot">
<div class="ps-tgl">${tglSingkat(new Date().toISOString().slice(0, 10))}</div>
<div class="ps-jam">${jamTampil(d.penempatan.jamMasuk)} - ${jamTampil(d.penempatan.jamPulang)}</div>
<div class="ps-ket">${esc(ket)}</div>
</div>
<div class="stack" style="gap:10px;margin-top:14px">
<button class="btn ${masuk && pulang ? 'btn-outline' : 'btn-primary'} btn-block"
onclick="navigateTo('presensi')">
<span class="mi">${masuk && pulang ? 'how_to_reg' : 'photo_camera'}</span> ${labelTombol}</button>
<button class="btn btn-outline btn-block" onclick="navigateTo('riwayat-presensi')">
<span class="mi">history</span> Riwayat Presensi</button>
</div>`;
}
// Menggulir ke sebuah kartu di halaman yang sama. Dipakai pintasan "Pengumuman"
// di Aksi Cepat: siswa tidak punya halaman pengumuman tersendiri, jadi daripada
// menautkannya ke halaman yang akan ditolak server, tombolnya membawa mata ke
// kartu yang memang sudah memuat isinya.
function gulirKe(id) {
const el = $(id);
if (!el) return;
const kartu = el.closest('.card') || el;
kartu.scrollIntoView({ behavior: 'smooth', block: 'center' });
kartu.classList.add('kartu-disorot');
setTimeout(() => kartu.classList.remove('kartu-disorot'), 1600);
}
function renderJurnalBeranda(d) {
const box = $('boxJurnalHariIni');
if (!box) return;
if (!d.jurnalHariIni) {
box.innerHTML = emptyState('note_add', 'Belum ada jurnal hari ini', 'Tuliskan kegiatan Anda.') +
`<button class="btn btn-primary btn-block" style="margin-top:16px" onclick="navigateTo('jurnal')">
<span class="mi">add</span> Tambah Jurnal</button>`;
return;
}
const j = d.jurnalHariIni;
const potong = String(j.kegiatan).length > 110 ? String(j.kegiatan).slice(0, 110) + '…' : j.kegiatan;
box.innerHTML = `
<div class="list">
<div class="list-item">
<div class="list-lead ${j.status === 'Disetujui' ? 'ok' : j.status === 'Revisi' ? 'danger' : 'warn'}">
<span class="mi">${j.status === 'Disetujui' ? 'check' : j.status === 'Revisi' ? 'edit_note' : 'hourglass_top'}</span>
</div>
<div class="list-main">
<div class="list-title">Jurnal hari ini</div>
<div class="list-text">${esc(potong)}</div>
</div>
<div class="list-tail">${chipStatus(j.status)}</div>
</div>
</div>
<div class="rekap-row" style="margin-top:16px">
<div class="rekap-item"><div class="rekap-val">${d.rekapJurnal.total}</div><div class="rekap-lbl">Total</div></div>
<div class="rekap-item"><div class="rekap-val" style="color:var(--success)">${d.rekapJurnal.disetujui}</div><div class="rekap-lbl">Disetujui</div></div>
<div class="rekap-item"><div class="rekap-val" style="color:var(--warning)">${d.rekapJurnal.menunggu}</div><div class="rekap-lbl">Menunggu</div></div>
</div>
<button class="btn btn-outline btn-block" style="margin-top:16px" onclick="navigateTo('jurnal')">
<span class="mi">edit_note</span> Kelola Jurnal</button>`;
}
function renderInstansiBeranda(d) {
const box = $('boxInstansi'), chip = $('chipStatusPkl');
if (!box) return;
if (!d.penempatan) {
if (chip) { chip.className = 'chip chip-neutral'; chip.textContent = 'Belum Ada'; }
box.innerHTML = emptyState('domain_disabled', 'Belum ditempatkan',
'Ajukan pendaftaran tempat PKL terlebih dahulu.',
`<button class="btn btn-primary btn-sm" onclick="navigateTo('tempat-pkl')">Pilih Tempat PKL</button>`);
return;
}
const p = d.penempatan, pr = d.progres;
// Chip status dibaca dari progres, bukan dari kolom mana pun: selama tanggal
// hari ini berada di antara mulai dan selesai, PKL-nya memang sedang berjalan.
if (chip) {
const habis = pr && pr.persen >= 100;
chip.className = 'chip ' + (habis ? 'chip-neutral' : 'chip-success');
chip.textContent = habis ? 'Selesai' : 'Berjalan';
}
box.innerHTML = `
<div class="pkl-kotak">
<div class="pkl-nama">${esc(p.namaInstansi)}</div>
<div class="pkl-alamat">${esc(p.alamat)}</div>
<div class="pkl-pembimbing">
<div class="data-label">Pembimbing Lapangan</div>
<div class="data-value">${esc(p.pic && p.pic !== '-' ? p.pic : p.guruNama)}</div>
</div>
<div class="pkl-tanggal">
<div class="pkl-tgl-item"><span class="mi">event_available</span>
<div><div class="data-label">Mulai</div>
<div class="data-value">${tglRingkas(p.tanggalMulai)}</div></div></div>
<div class="pkl-tgl-item"><span class="mi">event_busy</span>
<div><div class="data-label">Selesai</div>
<div class="data-value">${tglRingkas(p.tanggalSelesai)}</div></div></div>
</div>
</div>
<button class="btn-ghost btn-block pkl-detail" onclick="navigateTo('tempat-pkl')">
Lihat Detail <span class="mi">chevron_right</span></button>`;
}
function renderProgresPkl(d) {
const box = $('boxProgresPkl');
if (!box) return;
const pr = d.progres, p = d.penempatan;
if (!pr || !p) {
box.innerHTML = emptyState('trending_up', 'Progres belum berjalan',
'Tampil setelah tanggal PKL Anda ditetapkan.');
return;
}
const persen = Math.min(100, Math.max(0, pr.persen));
// Tanggal tiap tonggak dihitung dari tanggal mulai + porsi durasinya, jadi
// steppernya menunjukkan KAPAN, bukan sekadar berapa persen.
const mulai = new Date(String(p.tanggalMulai).slice(0, 10) + 'T00:00:00');
const selesai = new Date(String(p.tanggalSelesai).slice(0, 10) + 'T00:00:00');
// Tonggak 0% dan 100% memakai tanggal aslinya, bukan hasil hitungan — supaya
// ujung steppernya selalu persis sama dengan tanggal di kartu Status PKL.
// Menghitung 100% dari hariTotal terlihat benar, tetapi meleset sehari setiap
// kali durasinya dibulatkan, dan selisih itu justru muncul di angka yang paling
// diperhatikan siswa: kapan PKL-nya berakhir.
const tonggakTgl = (bagian) => {
const t = bagian <= 0 ? mulai : bagian >= 1 ? selesai
: new Date(mulai.getTime() + (selesai - mulai) * bagian);
return tglRingkas(t.toISOString().slice(0, 10));
};
const tonggak = [
{ lbl: 'Mulai', pada: 0 }, { lbl: '20%', pada: 20 },
{ lbl: '50%', pada: 50 }, { lbl: '100%', pada: 100 }
];
box.innerHTML = `
<div class="progres-atas">
<div class="progres-teks">Berjalan <strong>${pr.hariLewat}</strong> dari ${pr.hariTotal} hari</div>
<div class="progres-persen">${persen}%</div>
</div>
<div class="progress"><div class="progress-bar" style="width:${persen}%"></div></div>
<div class="tonggak">${tonggak.map(t => `
<div class="tonggak-item ${persen >= t.pada ? 'lewat' : ''}">
<span class="tonggak-titik">${persen >= t.pada ? '<span class="mi">check</span>' : ''}</span>
<span class="tonggak-lbl">${t.lbl}</span>
<span class="tonggak-tgl">${tonggakTgl(t.pada / 100)}</span>
</div>`).join('')}</div>`;
}
function renderStatistikSaya(d) {
const box = $('boxStatistikSaya');
if (!box) return;
const r = d.rekapPresensi || {};
// `sakit` dipisahkan dari `izin` mulai v6.9. Bila server lama masih mengirim
// gabungannya saja, angkanya tetap terbaca lewat `izinSakit` daripada
// menampilkan nol yang menyesatkan.
const stat = [
{ ikon: 'task_alt', nada: 'ok',     nilai: r.hadir || 0,  lbl: 'Hadir' },
{ ikon: 'chat',     nada: 'info',   nilai: r.izin != null ? r.izin : (r.izinSakit || 0), lbl: 'Izin' },
{ ikon: 'sick',     nada: 'warn',   nilai: r.sakit || 0,  lbl: 'Sakit' },
{ ikon: 'schedule', nada: 'danger', nilai: r.telat || 0,  lbl: 'Terlambat' }
];
box.innerHTML = `<div class="statistik-grid">${stat.map(s => `
<div class="stat-mini">
<span class="stat-ikon ${s.nada}"><span class="mi">${s.ikon}</span></span>
<div><div class="stat-nilai">${s.nilai}</div><div class="stat-lbl">${s.lbl}</div></div>
</div>`).join('')}</div>`;
}
function renderTugasMendatang(d) {
const box = $('boxTugasMendatang');
if (!box) return;
// Tidak ada permintaan baru ke server: seluruh daftar ini disimpulkan dari
// data yang MEMANG sudah dikirim getDashboardSiswa. Menambah endpoint untuk
// tiga baris yang bisa dihitung di sini hanya menambah satu perjalanan bolak-
// balik tanpa menambah satu pun informasi.
const tugas = [];
// Hari instansi tutup bukan hari kerja bagi siswa: menagih presensi dan jurnal
// di hari itu sama saja menyuruhnya mengerjakan sesuatu yang memang tidak ada.
if (d.penempatan && d.liburHariIni) {
box.innerHTML = emptyState('event_busy', 'Hari ini libur',
esc(d.liburHariIni.keterangan || 'Tidak ada kegiatan PKL hari ini.') +
' Presensi dan jurnal tidak ditagih.');
return;
}
if (d.penempatan) {
if (!d.jurnalHariIni) {
tugas.push({ ikon: 'menu_book', nada: 'info', judul: 'Jurnal Harian',
sub: 'Buat jurnal hari ini', tanda: 'Hari ini', mendesak: true, ke: 'jurnal' });
}
if (d.presensi.masuk && !d.presensi.pulang) {
tugas.push({ ikon: 'photo_camera', nada: 'ok', judul: 'Presensi Pulang',
sub: 'Jangan lupa absen pulang', tanda: 'Hari ini', mendesak: true, ke: 'presensi' });
} else if (!d.presensi.masuk) {
tugas.push({ ikon: 'photo_camera', nada: 'ok', judul: 'Presensi Masuk',
sub: 'Belum absen masuk hari ini', tanda: 'Hari ini', mendesak: true, ke: 'presensi' });
}
if (d.penempatan.tanggalSelesai) {
const sisa = Math.ceil(
(new Date(String(d.penempatan.tanggalSelesai).slice(0, 10) + 'T00:00:00') - new Date()) / 86400000);
tugas.push({ ikon: 'description', nada: 'warn', judul: 'Laporan Akhir',
sub: 'Unggah laporan akhir PKL',
tanda: tglRingkas(d.penempatan.tanggalSelesai),
mendesak: sisa <= 14, ke: 'laporan' });
}
}
if (!tugas.length) {
box.innerHTML = emptyState('task_alt', 'Tidak ada tugas tertunda',
'Semua kewajiban hari ini sudah Anda selesaikan.');
return;
}
box.innerHTML = `<div class="list">${tugas.map(t => `
<div class="list-item tugas-item" onclick="navigateTo('${t.ke}')" role="button" tabindex="0"
onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();navigateTo('${t.ke}')}">
<div class="list-lead ${t.nada}"><span class="mi">${t.ikon}</span></div>
<div class="list-main">
<div class="list-title">${t.judul}</div>
<div class="list-sub">${t.sub}</div>
</div>
<div class="list-tail"><span class="chip ${t.mendesak ? 'chip-error' : 'chip-warning'}">${t.tanda}</span></div>
</div>`).join('')}</div>`;
}
function renderInsight(idElemen, daftar) {
const el = $(idElemen);
if (!el) return;
if (!daftar || !daftar.length) { el.innerHTML = '<li>Belum cukup data untuk dianalisis.</li>'; return; }
el.innerHTML = daftar.map(t => `<li><span>${t}</span></li>`).join('');
}
function renderPengumumanBeranda(daftar) {
const box = $('boxPengumumanSiswa');
if (!box) return;
if (!daftar || !daftar.length) {
box.innerHTML = emptyState('campaign', 'Belum ada pengumuman', 'Informasi dari sekolah akan tampil di sini.');
return;
}
box.innerHTML = `<div class="list">${daftar.map(p => `
<div class="list-item">
<div class="list-lead"><span class="mi">campaign</span></div>
<div class="list-main">
<div class="list-title">${esc(p.judul)}</div>
<div class="list-sub">${esc(p.pembuat)} &middot; ${tglSingkat(p.tanggal)}</div>
<div class="list-text">${esc(p.isi)}</div>
</div>
</div>`).join('')}</div>`;
}
async function gambarGrafikTrenSiswa(tren) {
const canvas = $('chartTrenSiswa');
if (!canvas || !tren) return;
catatGrafik('trenSiswa', gambarGrafikTrenSiswa, tren);
if (!(await pastikanChart())) { grafikTidakTersedia(canvas); return; }
const w = warnaGrafik();
const label = ['Alpha', 'Izin/Sakit', 'Telat', 'Hadir'];
AppState.grafik.trenSiswa = new Chart(canvas, {
type: 'bar',
data: { labels: tren.label, datasets: [{
label: 'Status Presensi', data: tren.data,
backgroundColor: tren.data.map(v => v === 3 ? w.sukses : v === 2 ? w.warning
: v === 1 ? w.primary : w.error),
borderRadius: 6, borderSkipped: false }] },
options: {
responsive: true, maintainAspectRatio: false,
plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => label[c.parsed.y] || 'Tidak ada' } } },
scales: {
y: { beginAtZero: true, max: 3, ticks: { stepSize: 1, color: w.teks, callback: v => label[v] || '' },
grid: { color: w.grid } },
x: { ticks: { color: w.teks }, grid: { display: false } }
}
}
});
}
function initPresensi() {
mulaiJam();
AppState.fotoTerambil = null;
AppState.jenisPresensi = 'Masuk';
muatKonteksPresensi();
mulaiPantauLokasi();
}
function mulaiJam() {
hentikanJam();
const tick = () => {
const el = $('jamHidup');
if (!el) return;
const n = new Date();
el.textContent = tglSingkat(n.toISOString().slice(0, 10)) + ' • ' +
String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + ' WIB';
};
tick();
AppState.timerJam = setInterval(tick, 30000);
}
function hentikanJam() { if (AppState.timerJam) { clearInterval(AppState.timerJam); AppState.timerJam = null; } }
async function muatKonteksPresensi() {
try {
const res = await panggilCepat('getStatusPresensiHariIni', AppState.sessionToken);
if (!res.success) { toast(res.message, 'error'); return; }
const d = res.data;
AppState.penempatan = d.penempatan;
AppState.statusPresensi = d;
if (!d.penempatan) {
$('boxLokasi').innerHTML = emptyState('domain_disabled', 'Belum ditempatkan',
'Anda belum memiliki tempat PKL aktif.',
`<button class="btn btn-primary btn-sm" onclick="navigateTo('tempat-pkl')">Pilih Tempat PKL</button>`);
$('btnKirimPresensi').disabled = true;
$('btnKamera').disabled = true;
return;
}
renderBannerShift(d.penempatan);
renderBannerIzin(d.izin);
if (d.izin && d.izin.status !== 'Ditolak') {
$('btnKirimPresensi').disabled = true;
$('btnKamera').disabled = true;
$('labelKirimPresensi').textContent = 'Terkunci — sudah mengajukan ' + d.izin.jenis;
return;
}
if (d.masuk && !d.pulang) {
const tab = document.querySelector('.tab-btn[data-jenis="Pulang"]');
if (tab) pilihJenisPresensi('Pulang', tab);
}
renderRiwayatSingkat();
cobaNyalakanKameraOtomatis();
} catch (err) { toast(err.message, 'error'); }
}
/**
 * Shift hari ini ditampilkan menonjol karena penilaian Telat bergantung padanya.
 * Siswa yang tidak tahu ia kebagian shift siang akan mengira dirinya terlambat
 * padahal belum, atau sebaliknya merasa aman padahal sudah lewat.
 */
function renderBannerShift(p) {
const box = $('bannerShift');
if (!box) return;
if (!p || !p.pakaiShift) { box.hidden = true; box.innerHTML = ''; return; }
box.hidden = false;
box.innerHTML = p.shiftHariIni
? `<div class="alert alert-info">
<span class="mi">schedule</span>
<div><strong>Shift hari ini: ${esc(p.shiftHariIni.nama)}</strong>
<p>${jamTampil(p.shiftHariIni.jamMasuk)} – ${jamTampil(p.shiftHariIni.jamPulang)}.
Presensi masuk setelah ${jamTampil(p.shiftHariIni.jamMasuk)} dihitung terlambat.</p></div>
</div>`
: `<div class="alert alert-warning">
<span class="mi">help_outline</span>
<div><strong>Shift hari ini belum dijadwalkan</strong>
<p>Sementara ini jam kerja bawaan ${jamTampil(p.jamMasukTempat)} – ${jamTampil(p.jamPulangTempat)}
yang dipakai. Anda tetap dapat presensi seperti biasa — beri tahu Pokja PKL agar
jadwalnya dilengkapi.</p></div>
</div>`;
}

function pilihJenisPresensi(jenis, tombol) {
AppState.jenisPresensi = jenis;
$$('.tab-btn[data-jenis]').forEach(b => b.classList.toggle('active', b === tombol));
$('labelKirimPresensi').textContent = 'Presensi ' + jenis;
evaluasiTombolPresensi();
}
function mulaiPantauLokasi() {
if (!navigator.geolocation) {
tampilkanGagalLokasi('Perangkat atau browser Anda tidak mendukung deteksi lokasi.');
return;
}
AppState.watchId = navigator.geolocation.watchPosition(
pos => {
AppState.posisi = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
renderStatusLokasi();
evaluasiTombolPresensi();
},
err => {
tampilkanGagalLokasi(err.code === 1
? 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser, lalu buka ulang halaman ini.'
: err.code === 2
? 'Lokasi tidak dapat ditentukan. Pastikan GPS aktif dan Anda berada di area terbuka.'
: 'Deteksi lokasi memakan waktu terlalu lama. Coba lagi.');
},
{ enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
);
}
function hentikanPantauLokasi() {
if (AppState.watchId !== null) {
try { navigator.geolocation.clearWatch(AppState.watchId); } catch (e) {}
AppState.watchId = null;
}
}
function tampilkanGagalLokasi(pesan) {
const chip = $('chipLokasi');
if (chip) { chip.className = 'chip chip-error'; chip.textContent = 'Lokasi Gagal'; }
const box = $('boxLokasi');
if (box) {
box.innerHTML = `<div class="alert alert-error"><span class="mi">location_off</span>
<div><strong>Lokasi tidak terbaca</strong><p>${esc(pesan)}</p></div></div>
<button class="btn btn-outline btn-block" style="margin-top:12px" onclick="mulaiPantauLokasi()">
<span class="mi">refresh</span> Coba Deteksi Lagi</button>
<p class="field-help">Jika aplikasi dibuka lewat iframe, pastikan iframe memuat
atribut <code>allow="camera; geolocation"</code>.</p>`;
}
evaluasiTombolPresensi();
}
function jarakMeter(lat1, lon1, lat2, lon2) {
const R = 6371000, rad = Math.PI / 180;
const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function renderStatusLokasi() {
const p = AppState.penempatan, pos = AppState.posisi;
const box = $('boxLokasi'), chip = $('chipLokasi');
if (!box || !p || !pos) return;
const jarak = jarakMeter(pos.latitude, pos.longitude, p.latitude, p.longitude);
const akurasi = Math.round(pos.accuracy);
const efektif = Math.max(0, jarak - akurasi);
const dalam = efektif <= p.radius;
const maxAk = AppState.statusPresensi ? AppState.statusPresensi.maxAkurasi : 200;
const sinyalBuruk = akurasi > maxAk;
chip.className = 'chip ' + (sinyalBuruk ? 'chip-warning' : dalam ? 'chip-success' : 'chip-error');
chip.innerHTML = `<span class="mi">${sinyalBuruk ? 'sensors_off' : dalam ? 'check_circle' : 'location_off'}</span>` +
(sinyalBuruk ? 'Sinyal Lemah' : dalam ? 'Dalam Radius' : 'Di Luar Radius');
box.innerHTML = `
<div class="info-tonal">
<span class="mi">location_on</span>
<div>
<div class="info-eyebrow">Lokasi PKL Terdaftar</div>
<div class="info-strong">${esc(p.namaInstansi)}</div>
<div class="info-sub">${esc(p.alamat)}</div>
</div>
</div>
<div class="map-box">
<iframe src="${HTTPS}maps.google.com/maps?q=${p.latitude},${p.longitude}&z=17&output=embed"
title="Peta lokasi ${esc(p.namaInstansi)}" loading="lazy"
referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>
<div class="jarak-row">
<span>Jarak dari lokasi</span>
<span class="jarak-nilai ${dalam ? 'jarak-ok' : 'jarak-jauh'}">${jarak} meter</span>
</div>
<div class="jarak-row" style="border-top:none;padding-top:0;margin-top:0">
<span style="font-size:12.5px;color:var(--on-surface-muted)">Akurasi GPS</span>
<span style="font-size:12.5px;color:var(--on-surface-muted)">±${akurasi} m &middot; radius ${p.radius} m</span>
</div>`;
const alertBox = $('alertRadius'), alertTeks = $('alertRadiusText');
if (alertBox && alertTeks) {
alertBox.hidden = false;
if (sinyalBuruk) {
alertBox.className = 'alert alert-error';
alertTeks.textContent = `Akurasi GPS ±${akurasi} m terlalu rendah untuk diverifikasi. ` +
`Pindah ke area terbuka atau tunggu hingga sinyal membaik.`;
} else if (!dalam) {
alertBox.className = 'alert alert-error';
alertTeks.innerHTML = `Anda berada <b>${jarak} meter</b> dari ${esc(p.namaInstansi)}, ` +
`melebihi batas <b>${p.radius} meter</b>. Presensi tidak dapat dikirim dari sini — ` +
`mendekatlah ke lokasi PKL, lalu tombol presensi akan aktif otomatis. ` +
`Bila hari ini Anda memang berhalangan hadir, gunakan menu <b>Izin / Sakit</b>.`;
} else {
alertBox.className = 'alert alert-success';
alertTeks.textContent = `Anda berada dalam radius lokasi PKL. Ambil foto selfie lalu kirim presensi.`;
}
}
}
async function renderRiwayatSingkat() {
const box = $('boxRiwayatSingkat');
if (!box) return;
try {
const res = await panggil('getRiwayatPresensi', AppState.sessionToken, { mode: 'mingguan' });
if (!res.success || !res.data.items.length) {
box.innerHTML = emptyState('history', 'Belum ada riwayat', 'Presensi minggu ini akan tampil di sini.');
return;
}
box.innerHTML = `<div class="list">${res.data.items.slice(0, 5).map(r => `
<div class="list-item">
<div class="list-lead ${r.status === 'Hadir' ? 'ok' : r.status === 'Telat' ? 'warn' : 'danger'}">
<span class="mi">${r.jenis === 'Masuk' ? 'login' : 'logout'}</span></div>
<div class="list-main">
<div class="list-title">${tglSingkat(r.tanggal)}</div>
<div class="list-sub">${jamTampil(r.waktu)} WIB &middot; ${esc(r.jenis)}</div>
</div>
<div class="list-tail">${chipStatus(r.status)}</div>
</div>`).join('')}</div>`;
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat riwayat', err.message);
}
}
// ── Kamera selfie: hidup langsung di halaman ────────────────
//
// Foto dulu diambil lewat jendela terpisah karena getUserMedia() SELALU ditolak
// di dalam bingkai Apps Script, berapa kali pun izin diberikan. Sejak aplikasi
// disajikan sebagai dokumen tingkat atas di domain sendiri, pembatasan itu tidak
// berlaku lagi: kamera hidup di kartu presensi, izinnya diingat browser, dan
// tidak ada lagi pop-up yang bisa diblokir.

function setelKontrolKamera(keadaan) {
const tampil = (id, ya) => { const el = $(id); if (el) el.hidden = !ya; };
tampil('btnKamera', keadaan === 'mati');
tampil('btnJepret', keadaan === 'hidup');
tampil('btnBalikKamera', keadaan === 'hidup');
tampil('btnUlangFoto', keadaan === 'foto');
tampil('camVideo', keadaan === 'hidup');
tampil('camPreview', keadaan === 'foto');
tampil('camPlaceholder', keadaan === 'mati');
const b = $('btnKamera');
if (b && keadaan === 'mati') {
b.disabled = false;
b.innerHTML = '<span class="mi">photo_camera</span> Aktifkan Kamera';
}
}
async function aktifkanKamera() {
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
tampilkanGagalKamera('Browser ini tidak mendukung akses kamera. Perbarui browser Anda, atau buka lewat Chrome.');
return;
}
const btn = $('btnKamera');
if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyiapkan kamera…'; }
try {
await nyalakanStreamKamera(AppState.arahKamera || 'user');
} catch (e) {
console.warn('Kamera gagal dinyalakan:', e);
setelKontrolKamera('mati');
tampilkanGagalKamera(pesanGalatKamera(e));
}
}
async function nyalakanStreamKamera(arah) {
hentikanKamera();
const stream = await navigator.mediaDevices.getUserMedia({
video: { facingMode: arah, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
AppState.streamKamera = stream;
AppState.arahKamera = arah;
const v = $('camVideo');
if (!v) { hentikanKamera(); return; }
v.srcObject = stream;
v.classList.toggle('tanpa-cermin', arah !== 'user');
setelKontrolKamera('hidup');
try { await v.play(); } catch (e) {}
}
function balikKamera() {
const semula = AppState.arahKamera || 'user';
const arah = (semula === 'user') ? 'environment' : 'user';
nyalakanStreamKamera(arah).catch(function () {
toast('Kamera ' + (arah === 'user' ? 'depan' : 'belakang') + ' tidak tersedia di perangkat ini.', 'warning');
nyalakanStreamKamera(semula).catch(function () { setelKontrolKamera('mati'); });
});
}
function jepretFoto() {
const v = $('camVideo'), k = $('camCanvas');
if (!AppState.streamKamera || !v || !v.videoWidth || !k) {
toast('Kamera belum siap. Tunggu sebentar lalu coba lagi.', 'warning');
return;
}
const skala = Math.min(1, 800 / v.videoWidth);
k.width = Math.round(v.videoWidth * skala);
k.height = Math.round(v.videoHeight * skala);
const c = k.getContext('2d');
// Kamera depan tampil sebagai cermin agar terasa wajar saat mengarahkan wajah,
// jadi hasil jepretannya ikut dicerminkan supaya sama persis dengan yang dilihat.
if ((AppState.arahKamera || 'user') === 'user') { c.translate(k.width, 0); c.scale(-1, 1); }
c.drawImage(v, 0, 0, k.width, k.height);
AppState.fotoTerambil = k.toDataURL(jenisGambarTerbaik(), 0.62);
hentikanKamera();
tampilkanPratinjauFoto(AppState.fotoTerambil);
}
function pesanGalatKamera(e) {
const n = e && e.name;
if (n === 'NotAllowedError' || n === 'SecurityError') {
return 'Izin kamera ditolak. Ketuk ikon gembok di sebelah alamat situs, aktifkan Kamera, lalu muat ulang halaman ini.';
}
if (n === 'NotFoundError' || n === 'DevicesNotFoundError') return 'Tidak ada kamera yang terdeteksi di perangkat ini.';
if (n === 'NotReadableError' || n === 'TrackStartError') {
return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera atau panggilan video, lalu coba lagi.';
}
if (n === 'OverconstrainedError') return 'Kamera perangkat ini tidak mendukung resolusi yang diminta.';
return 'Kamera gagal dinyalakan' + (e && e.message ? ': ' + e.message : '.');
}
function tampilkanGagalKamera(pesan) {
const ph = $('camPlaceholder');
if (!ph) return;
ph.hidden = false;
ph.innerHTML = '<span class="mi" style="color:var(--error)">videocam_off</span>' +
'<p class="cam-title">Kamera tidak dapat dinyalakan</p>' +
'<p class="cam-desc">' + esc(pesan) + '</p>';
}
function cobaNyalakanKameraOtomatis() {
const btn = $('btnKamera');
if (!btn || btn.disabled || AppState.fotoTerambil) return;
if (!navigator.permissions || !navigator.permissions.query) return;
navigator.permissions.query({ name: 'camera' })
.then(function (izin) {
if (izin.state === 'granted' && AppState.halamanAktif === 'presensi') aktifkanKamera();
})
.catch(function () {});
}
function bukaFormIzin(jenisAwal) {
if (!AppState.penempatan) { toast('Anda belum ditempatkan di tempat PKL.', 'warning'); return; }
const hariIni = new Date().toISOString().slice(0, 10);
const batas = new Date(); batas.setDate(batas.getDate() + 14);
const jenis = jenisAwal === 'Sakit' ? 'Sakit' : 'Izin';
AppState.buktiIzin = null;
bukaModal('Ajukan Izin / Sakit', `
<div class="field">
<label class="field-label">Jenis Ketidakhadiran</label>
<div class="tab-switch" style="margin-bottom:0">
<button type="button" class="tab-btn ${jenis === 'Izin' ? 'active' : ''}" data-izin="Izin"
onclick="pilihJenisIzin('Izin', this)"><span class="mi">event_busy</span> Izin</button>
<button type="button" class="tab-btn ${jenis === 'Sakit' ? 'active' : ''}" data-izin="Sakit"
onclick="pilihJenisIzin('Sakit', this)"><span class="mi">sick</span> Sakit</button>
</div>
</div>
<div class="field">
<label class="field-label" for="izTanggal">Tanggal Ketidakhadiran</label>
<input class="field-input" id="izTanggal" type="date" value="${hariIni}"
max="${batas.toISOString().slice(0, 10)}">
<p class="field-help">Boleh untuk hari mendatang, atau susulan maksimal 3 hari ke belakang.</p>
</div>
<div class="field">
<label class="field-label" for="izAlasan">Penjelasan Alasan</label>
<textarea class="field-input" id="izAlasan" rows="4" maxlength="600"
placeholder="Jelaskan alasan secara ringkas dan jujur."></textarea>
<p class="field-help">Minimal 10 karakter.</p>
<div class="field-error" id="errIzAlasan"></div>
</div>
<div class="field">
<label class="field-label" for="izBukti"><span id="izLabelBukti">Surat Izin Orang Tua/Wali</span></label>
<div class="dropzone" onclick="document.getElementById('izBukti').click()">
<span class="mi">upload_file</span>
<p id="izNamaBukti">Ketuk untuk memilih berkas (PDF atau foto, maks. 5 MB)</p>
</div>
<input type="file" id="izBukti" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" hidden
onchange="siapkanBuktiIzin(event)">
<img id="izPratinjau" class="review-thumb" hidden alt="Pratinjau bukti">
<div class="field-error" id="errIzBukti"></div>
</div>
<div class="alert alert-info">
<span class="mi">info</span>
<div><strong>Menunggu verifikasi</strong>
<p>Pengajuan diteruskan ke guru pembimbing. Kehadiran tercatat setelah disetujui.</p></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">send</span> Kirim Pengajuan', kelas: 'btn-primary', aksi: kirimIzin }]);
AppState.jenisIzin = jenis;
perbaruiLabelBukti();
}
function pilihJenisIzin(jenis, tombol) {
AppState.jenisIzin = jenis;
$$('.tab-btn[data-izin]').forEach(b => b.classList.toggle('active', b === tombol));
perbaruiLabelBukti();
}
function perbaruiLabelBukti() {
const el = $('izLabelBukti');
if (el) el.textContent = AppState.jenisIzin === 'Sakit'
? 'Surat Keterangan Dokter / Bukti Pendukung' : 'Surat Izin Orang Tua/Wali';
}
function siapkanBuktiIzin(event) {
const file = event.target.files && event.target.files[0];
if (!file) return;
const err = $('errIzBukti');
err.textContent = '';
if (file.size > 5 * 1024 * 1024) { err.textContent = 'Ukuran berkas maksimal 5 MB.'; return; }
const selesai = (dataUrl, mime) => {
AppState.buktiIzin = { base64: dataUrl, nama: file.name, mime: mime };
$('izNamaBukti').textContent = file.name;
const prev = $('izPratinjau');
if (prev && mime.indexOf('image' + '/') === 0) { prev.src = dataUrl; prev.hidden = false; }
else if (prev) prev.hidden = true;
};
if (file.type.indexOf('image' + '/') === 0) {
kompresGambar(file, 1200, 0.75).then(u => selesai(u, 'image' + '/' + 'jpeg'))
.catch(() => err.textContent = 'Gambar tidak dapat dibaca.');
} else {
const reader = new FileReader();
reader.onload = e => selesai(e.target.result, file.type || 'application' + '/' + 'pdf');
reader.onerror = () => err.textContent = 'Berkas tidak dapat dibaca.';
reader.readAsDataURL(file);
}
}
async function kirimIzin() {
const alasan = $('izAlasan').value.trim();
$('errIzAlasan').textContent = ''; $('errIzBukti').textContent = '';
if (alasan.length < 10) { $('errIzAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }
if (!AppState.buktiIzin) { $('errIzBukti').textContent = 'Lampiran bukti wajib disertakan.'; return; }
tampilkanSibuk('Mengirim pengajuan…');
try {
const res = await panggil('ajukanIzin', AppState.sessionToken, {
jenis: AppState.jenisIzin, tanggal: $('izTanggal').value, alasan: alasan,
buktiBase64: AppState.buktiIzin.base64, namaFile: AppState.buktiIzin.nama,
mimeType: AppState.buktiIzin.mime });
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6500); return; }
AppState.buktiIzin = null;
batalkanPaketData();
tutupModal();
toast(res.message, 'success', 6000);
if (AppState.halamanAktif === 'presensi') muatKonteksPresensi();
else if (AppState.halamanAktif === 'beranda') muatDataBeranda();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function renderBannerIzin(izin) {
const box = $('bannerIzin');
if (!box) return;
if (!izin) { box.hidden = true; box.innerHTML = ''; return; }
const gaya = izin.status === 'Disetujui' ? 'success' : izin.status === 'Ditolak' ? 'error' : 'warning';
box.hidden = false;
box.innerHTML = `<div class="alert alert-${gaya}" style="margin-bottom:16px">
<span class="mi">${izin.jenis === 'Sakit' ? 'sick' : 'event_busy'}</span>
<div style="flex:1">
<strong>Pengajuan ${esc(izin.jenis)} — ${esc(izin.status)}</strong>
<p>${esc(izin.alasan)}</p>
${izin.komentar ? `<p style="margin-top:6px"><b>Catatan guru:</b> ${esc(izin.komentar)}</p>` : ''}
${izin.status === 'Menunggu' ? '<p style="margin-top:6px">Menunggu verifikasi guru pembimbing.</p>' : ''}
</div>
${izin.bukti ? `<button class="btn btn-outline btn-xs"
onclick="bukaPratinjau('Bukti ${esc(izin.jenis)}','${esc(izin.bukti)}','','gambar')">
<span class="mi">visibility</span> Bukti</button>` : ''}
</div>`;
}
// WebP bila peramban bisa mengodekannya, JPEG bila tidak. Pada mutu setara,
// WebP sekitar 30 % lebih kecil — dan setiap kilobyte yang tidak diunggah hari
// ini adalah kilobyte yang tidak diunduh guru setiap kali membuka bukti.
//
// Diperiksa dari HASILNYA, bukan dari nama peramban: canvas.toDataURL() yang
// tidak mengenal jenis yang diminta diam-diam mengembalikan PNG — yang justru
// JAUH lebih besar daripada JPEG. Menebak dari userAgent akan melewatkan itu.
let _jenisGambar = '';
function jenisGambarTerbaik() {
if (_jenisGambar) return _jenisGambar;
try {
const k = document.createElement('canvas');
k.width = 1; k.height = 1;
_jenisGambar = k.toDataURL('image/webp', 0.5).indexOf('data:image/webp') === 0
  ? 'image/webp' : 'image/jpeg';
} catch (e) { _jenisGambar = 'image/jpeg'; }
return _jenisGambar;
}
function kompresGambar(file, maxLebar, kualitas) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = e => {
const img = new Image();
img.onload = () => {
const canvas = document.createElement('canvas');
const skala = Math.min(1, maxLebar / img.width);
canvas.width = Math.round(img.width * skala);
canvas.height = Math.round(img.height * skala);
canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
resolve(canvas.toDataURL(jenisGambarTerbaik(), kualitas));
};
img.onerror = reject;
img.src = e.target.result;
};
reader.onerror = reject;
reader.readAsDataURL(file);
});
}
function tampilkanPratinjauFoto(dataUrl) {
const prev = $('camPreview');
if (prev) prev.src = dataUrl;
setelKontrolKamera('foto');
evaluasiTombolPresensi();
}
function ulangiFoto() {
AppState.fotoTerambil = null;
const prev = $('camPreview');
if (prev) prev.src = '';
setelKontrolKamera('mati');
evaluasiTombolPresensi();
aktifkanKamera();
}
function hentikanKamera() {
if (AppState.streamKamera) {
AppState.streamKamera.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
AppState.streamKamera = null;
}
const v = $('camVideo');
if (v) v.srcObject = null;
}
function evaluasiTombolPresensi() {
const btn = $('btnKirimPresensi');
if (!btn) return;
const p = AppState.penempatan, pos = AppState.posisi;
let dalamRadius = false, jarak = null;
if (p && pos) {
jarak = jarakMeter(pos.latitude, pos.longitude, p.latitude, p.longitude);
dalamRadius = Math.max(0, jarak - Math.round(pos.accuracy)) <= p.radius;
}
btn.disabled = !(AppState.fotoTerambil && pos && p && dalamRadius);
const label = $('labelKirimPresensi');
if (!label) return;
if (!p) label.textContent = 'Belum Ditempatkan';
else if (!pos) label.textContent = 'Menunggu Lokasi…';
else if (!dalamRadius) label.textContent = 'Terlalu Jauh (' + jarak + ' m)';
else if (!AppState.fotoTerambil) label.textContent = 'Ambil Foto Dahulu';
else label.textContent = 'Presensi ' + AppState.jenisPresensi;
}
async function kirimPresensi() {
if (!AppState.fotoTerambil || !AppState.posisi) return;
const btn = $('btnKirimPresensi');
btn.disabled = true;
tampilkanSibuk('Mengirim presensi…');
try {
const res = await panggil('submitPresensi', AppState.sessionToken, {
jenis: AppState.jenisPresensi,
latitude: AppState.posisi.latitude, longitude: AppState.posisi.longitude,
akurasi: AppState.posisi.accuracy, fotoBase64: AppState.fotoTerambil, catatan: ''
});
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6500); btn.disabled = false; return; }
const d = res.data;
const warna = d.status === 'Hadir' ? 'success' : d.status === 'Telat' ? 'warning' : 'error';
bukaModal('Presensi Tercatat', `
<div style="text-align:center;padding:8px 0 16px">
<div style="width:72px;height:72px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;
background:var(--${warna}-bg)">
<span class="mi" style="font-size:38px;color:var(--${warna})">
${d.status === 'Hadir' ? 'check_circle' : d.status === 'Telat' ? 'schedule' : 'location_off'}</span>
</div>
<div style="font-size:19px;font-weight:700">Presensi ${esc(d.jenis)} Berhasil</div>
<div style="margin-top:8px">${chipStatus(d.status)}</div>
</div>
<div class="list">
<div class="list-item"><div class="list-main"><div class="data-label">Waktu</div>
<div class="data-value">${jamTampil(d.waktu)} WIB</div></div></div>
<div class="list-item"><div class="list-main"><div class="data-label">Jarak dari lokasi PKL</div>
<div class="data-value">${d.jarak} meter (akurasi ±${d.akurasi} m, radius ${d.radius} m)</div></div></div>
</div>`,
[{ label: 'Selesai', kelas: 'btn-primary', aksi: () => { tutupModal(); navigateTo('beranda'); } }]);
batalkanPaketData();
ulangiFoto();
renderRiwayatSingkat();
muatKonteksPresensi();
} catch (err) {
sembunyikanSibuk();
toast(err.message, 'error');
btn.disabled = false;
}
}
window.__blok = 2;

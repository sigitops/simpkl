const INIT_HALAMAN = {
'beranda':          () => AppState.user.role === 'siswa' ? muatDataBeranda() : muatDataMonitoring(),
'presensi':         () => initPresensi(),
'riwayat-presensi': () => { pasangTanggalDefault(); muatRiwayatPresensi(); },
'jurnal':           () => { pasangTanggalDefault(); muatRiwayatJurnal(); },
'tempat-pkl':       () => muatTempatPKL(),
'laporan':          () => muatStatusLaporan(),
'nilai':            () => muatNilai(),
'profil':           () => muatProfil(),
'monitoring':       () => { muatTabelMonitoring(); muatAntreanIzin(); },
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
renderInsight('insightSiswa', d.insights);
renderPengumumanBeranda(d.pengumuman);
gambarGrafikTrenSiswa(d.tren);
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
chip.className = 'chip ' + (masuk ? (masuk.Status === 'Hadir' ? 'chip-success' : 'chip-warning') : 'chip-error');
chip.innerHTML = `<span class="mi">${masuk ? 'check_circle' : 'error'}</span>${masuk ? esc(masuk.Status) : 'Belum'}`;
box.innerHTML = `
<div class="info-tonal">
<span class="mi">schedule</span>
<div>
<div class="info-eyebrow">Shift Hari Ini</div>
<div class="info-strong">${jamTampil(d.penempatan.jamMasuk)} – ${jamTampil(d.penempatan.jamPulang)} WIB</div>
<div class="info-sub">${esc(d.penempatan.hariKerja || '')}</div>
</div>
</div>
<div class="list">
<div class="list-item">
<div class="list-lead ${masuk ? 'ok' : ''}"><span class="mi">login</span></div>
<div class="list-main">
<div class="list-title">Presensi Masuk</div>
<div class="list-sub">${masuk ? jamTampil(masuk.Waktu) + ' WIB' : 'Belum dilakukan'}</div>
</div>
<div class="list-tail">${masuk ? chipStatus(masuk.Status) : ''}</div>
</div>
<div class="list-item">
<div class="list-lead ${pulang ? 'ok' : ''}"><span class="mi">logout</span></div>
<div class="list-main">
<div class="list-title">Presensi Pulang</div>
<div class="list-sub">${pulang ? jamTampil(pulang.Waktu) + ' WIB' : 'Belum dilakukan'}</div>
</div>
<div class="list-tail">${pulang ? chipStatus(pulang.Status) : ''}</div>
</div>
</div>
<button class="btn ${masuk && pulang ? 'btn-outline' : 'btn-primary'} btn-block" style="margin-top:16px"
onclick="navigateTo('presensi')">
<span class="mi">how_to_reg</span>
${masuk && pulang ? 'Lihat Halaman Presensi' : (masuk ? 'Presensi Pulang' : 'Presensi Sekarang')}
</button>`;
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
<div class="list-lead ${j.status === 'Disetujui' ? 'ok' : j.status === 'Ditolak' ? 'danger' : 'warn'}">
<span class="mi">${j.status === 'Disetujui' ? 'check' : j.status === 'Ditolak' ? 'close' : 'hourglass_top'}</span>
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
const box = $('boxInstansi');
if (!box) return;
if (!d.penempatan) {
box.innerHTML = emptyState('domain_disabled', 'Belum ada instansi', 'Data tampil setelah pendaftaran diterima.');
return;
}
const p = d.penempatan, pr = d.progres;
box.innerHTML = `
<div class="info-tonal">
<span class="mi">domain</span>
<div><div class="info-strong">${esc(p.namaInstansi)}</div>
<div class="info-sub">${esc(p.alamat)}</div></div>
</div>
<div class="list">
<div class="list-item"><div class="list-main">
<div class="data-label">Guru Pembimbing</div><div class="data-value">${esc(p.guruNama)}</div></div></div>
<div class="list-item"><div class="list-main">
<div class="data-label">Periode PKL</div>
<div class="data-value">${tglSingkat(p.tanggalMulai)} – ${tglSingkat(p.tanggalSelesai)}</div></div></div>
</div>
${pr ? `<div style="margin-top:16px">
<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
<span style="color:var(--on-surface-muted)">Progres Waktu</span>
<strong>Bulan ${pr.bulanKe} dari ${pr.bulanTotal}</strong>
</div>
<div class="progress"><div class="progress-bar" style="width:${Math.min(100, pr.persen)}%"></div></div>
<div style="font-size:11.5px;color:var(--on-surface-muted);margin-top:5px">
${pr.hariLewat} dari ${pr.hariTotal} hari berjalan (${pr.persen}%)</div>
</div>` : ''}`;
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
AppState.fotoTerambil = k.toDataURL('image/jpeg', 0.6);
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
resolve(canvas.toDataURL('image/jpeg', kualitas));
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

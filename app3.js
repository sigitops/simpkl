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
if (list) list.innerHTML = '<div class="skeleton" style="height:200px"></div>';
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
const sel = $('rwFilterStatus');
if (sel && !sel.dataset.terpasang) {
sel.dataset.terpasang = '1';
sel.onchange = () => gambarJejakPresensi();
}
gambarJejakPresensi();
}
function gambarJejakPresensi() {
const list = $('listRiwayatPresensi');
const chip = $('chipJumlahRiwayat');
if (!list) return;
const semua = AppState.riwayatItems || [];
const rentang = AppState.riwayatRentang || { label: 'rentang ini' };
const saring = $('rwFilterStatus') ? $('rwFilterStatus').value : '';
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
const nada = (utama.status === 'Hadir' || utama.status === 'Disetujui') ? 'ok'
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
const nada = (r.status === 'Hadir' || r.status === 'Disetujui') ? 'ok'
: (r.status === 'Telat' || r.status === 'Menunggu') ? 'warn' : 'danger';
const ikon = r.jenis === 'Masuk' ? 'login' : r.jenis === 'Pulang' ? 'logout'
: r.jenis === 'Sakit' ? 'sick' : r.jenis === 'Alpha' ? 'person_off' : 'event_busy';
const detail = (r.jenis === 'Masuk' || r.jenis === 'Pulang')
? `${jamTampil(r.waktu)} WIB &middot; ${esc(r.jenis)} &middot; ${r.jarak} m dari lokasi (±${r.akurasi} m)`
: r.jenis === 'Alpha' ? 'Tidak hadir tanpa keterangan'
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
async function muatRiwayatJurnal() {
const filter = ambilFilterAktif();
if (!filter) return;
const list = $('listJurnal');
if (list) list.innerHTML = '<div class="skeleton" style="height:220px"></div>';
try {
const res = await panggil('getRiwayatJurnal', AppState.sessionToken, filter);
if (!res.success) { toast(res.message, 'error'); return; }
const items = res.data.items;
AppState.dataJurnal = items;
if (!items.length) {
list.innerHTML = emptyState('note_add', 'Belum ada jurnal',
'Tidak ada jurnal pada rentang ' + res.data.rentang.label.toLowerCase() + '.',
`<button class="btn btn-primary" onclick="bukaFormJurnal()"><span class="mi">add</span> Tulis Jurnal</button>`);
return;
}
list.innerHTML = `<div class="list">${items.map((j, i) => `
<div class="list-item" style="align-items:flex-start">
<div class="list-lead ${j.status === 'Disetujui' ? 'ok' : j.status === 'Ditolak' ? 'danger' : 'warn'}">
<span class="mi">${j.status === 'Disetujui' ? 'check' : j.status === 'Ditolak' ? 'close' : 'hourglass_top'}</span></div>
<div class="list-main">
<div class="list-title">${tglSingkat(j.tanggal)}</div>
<div class="list-text">${esc(j.kegiatan)}</div>
${j.kendala ? `<div class="list-sub" style="margin-top:6px"><strong>Kendala:</strong> ${esc(j.kendala)}</div>` : ''}
${j.komentar ? `<div class="alert ${j.status === 'Ditolak' ? 'alert-error' : 'alert-info'}"
style="margin-top:10px;padding:10px 12px;font-size:13px">
<span class="mi">comment</span><div><strong>Komentar Guru</strong><p>${esc(j.komentar)}</p></div></div>` : ''}
${j.foto ? `<img src="${esc(j.foto)}" alt="Dokumentasi" class="review-thumb" loading="lazy"
onclick="bukaPratinjau('Dokumentasi','${esc(j.foto)}','','gambar')">` : ''}
</div>
<div class="list-tail" style="flex-direction:column;align-items:flex-end;gap:8px">
${chipStatus(j.status)}
${j.status !== 'Disetujui' ? `<button class="btn-icon" aria-label="Ubah jurnal"
onclick="bukaFormJurnalKe(${i})">
<span class="mi">edit</span></button>` : ''}
</div>
</div>`).join('')}</div>`;
} catch (err) {
list.innerHTML = emptyState('error', 'Gagal memuat jurnal', err.message);
}
}
function bukaFormJurnalKe(indeks) {
const d = (AppState.dataJurnal || [])[indeks];
if (!d) { toast('Data jurnal tidak ditemukan. Muat ulang halaman.', 'warning'); return; }
bukaFormJurnal({ tanggal: d.tanggal, kegiatan: d.kegiatan, kendala: d.kendala });
}
function bukaFormJurnal(data) {
const d = data || {};
const hariIni = new Date().toISOString().slice(0, 10);
bukaModal(d.tanggal ? 'Ubah Jurnal' : 'Tambah Jurnal Kegiatan', `
<div class="field">
<label class="field-label" for="jrTanggal">Tanggal Kegiatan</label>
<input class="field-input" id="jrTanggal" type="date" max="${hariIni}"
value="${esc(d.tanggal || hariIni)}" ${d.tanggal ? 'readonly' : ''}>
</div>
<div class="field">
<label class="field-label" for="jrKegiatan">Uraian Kegiatan</label>
<textarea class="field-input" id="jrKegiatan" rows="5" maxlength="1500"
placeholder="Tuliskan apa yang Anda kerjakan hari ini secara ringkas dan jelas.">${esc(d.kegiatan || '')}</textarea>
<p class="field-help">Minimal 10 karakter.</p>
<div class="field-error" id="errJrKegiatan"></div>
</div>
<div class="field">
<label class="field-label" for="jrKendala">Kendala (opsional)</label>
<textarea class="field-input" id="jrKendala" rows="2" maxlength="500">${esc(d.kendala || '')}</textarea>
</div>
<div class="field">
<label class="field-label" for="jrFoto">Foto Dokumentasi (opsional)</label>
<div class="dropzone" onclick="document.getElementById('jrFoto').click()">
<span class="mi">add_photo_alternate</span>
<p id="jrNamaFoto">Ketuk untuk memilih atau memotret dokumentasi</p>
</div>
<input type="file" id="jrFoto" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" hidden onchange="pratinjauFotoJurnal(event)">
<img id="jrPratinjau" class="review-thumb" hidden alt="Pratinjau dokumentasi">
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">save</span> Simpan Jurnal', kelas: 'btn-primary', aksi: kirimJurnal }]);
}
function pratinjauFotoJurnal(event) {
const file = event.target.files && event.target.files[0];
if (!file) return;
if (!file.type.startsWith('image/')) { toast('Berkas harus berupa gambar.', 'error'); return; }
kompresGambar(file, 900, 0.65).then(dataUrl => {
AppState.fotoJurnal = dataUrl;
const prev = $('jrPratinjau');
if (prev) { prev.src = dataUrl; prev.hidden = false; }
if ($('jrNamaFoto')) $('jrNamaFoto').textContent = file.name;
}).catch(() => toast('Gambar tidak dapat dibaca.', 'error'));
}
async function kirimJurnal() {
const kegiatan = $('jrKegiatan').value.trim();
$('errJrKegiatan').textContent = '';
$('jrKegiatan').classList.remove('invalid');
if (kegiatan.length < 10) {
$('errJrKegiatan').textContent = 'Uraian kegiatan minimal 10 karakter.';
$('jrKegiatan').classList.add('invalid');
return;
}
tampilkanSibuk('Menyimpan jurnal…');
try {
const res = await panggil('submitJurnal', AppState.sessionToken, {
tanggal: $('jrTanggal').value, kegiatan: kegiatan,
kendala: $('jrKendala').value.trim(), fotoBase64: AppState.fotoJurnal || null });
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6000); return; }
AppState.fotoJurnal = null;
batalkanPaketData();
tutupModal();
toast(res.message, 'success');
muatRiwayatJurnal();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function muatTempatPKL() {
const list = $('listTempatPKL');
if (list) list.innerHTML = '<div class="skeleton" style="height:240px"></div>';
try {
const res = await panggilCepat('getDaftarTempatPKL', AppState.sessionToken, AppState.posisi || null);
if (!res.success) { toast(res.message, 'error'); return; }
AppState.dataTempat = res.data.items;
renderStatusPendaftaran(res.data.pendaftaran);
renderDaftarTempat(res.data.items, res.data.pendaftaran);
} catch (err) {
list.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
function renderStatusPendaftaran(p) {
const box = $('boxStatusPendaftaran');
if (!box) return;
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
function renderDaftarTempat(items, pendaftaran) {
const list = $('listTempatPKL');
if (!list) return;
if (!items.length) {
list.innerHTML = emptyState('domain_disabled', 'Belum ada tempat PKL',
'Pokja PKL belum menambahkan daftar instansi.');
return;
}
const terkunci = pendaftaran && ['Diproses', 'Diterima'].indexOf(pendaftaran.status) >= 0;
list.innerHTML = items.map(t => {
const penuh = t.sisaKuota <= 0;
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
<button class="btn btn-primary btn-sm" onclick="daftarKeTempat('${esc(t.id)}','${esc(t.nama)}')"
${penuh || terkunci ? 'disabled' : ''}>
<span class="mi">how_to_reg</span>
${terkunci ? 'Sudah Mendaftar' : penuh ? 'Kuota Penuh' : 'Daftar di Sini'}</button>
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
toast(res.message, res.success ? 'success' : 'error', 6000);
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
window.__blok = 3;

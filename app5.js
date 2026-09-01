function setFilterPendaftaran(status, tombol) {
AppState.filterPendaftaran = status;
$$('.seg-btn[data-status]').forEach(b => b.classList.toggle('active', b === tombol));
muatPendaftaran();
}
async function muatPendaftaran() {
const box = $('tabelPendaftaran');
if (!box) return;
box.innerHTML = memuatInline('Memuat data pendaftaran…');
try {
const res = await panggilCepat('getDaftarPendaftaran', AppState.sessionToken, AppState.filterPendaftaran);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
AppState.dataPendaftaran = res.data;
pasangEksporKartu({
id: 'pendaftaran', idPrefix: 'pd', data: res.data,
judulEkspor: 'Pendaftaran PKL',
saatFilter: () => gambarPendaftaran(),
kolom: [
{ k: 'namaSiswa', label: 'Nama Siswa' }, { k: 'nis', label: 'NIS' },
{ k: 'kelas', label: 'Kelas' }, { k: 'namaTempat', label: 'Tempat PKL' },
{ k: 'tanggalAjuan', label: 'Tanggal Ajuan' }, { k: 'jalur', label: 'Jalur' },
{ k: 'status', label: 'Status' }, { k: 'diprosesOleh', label: 'Diproses Oleh' },
{ k: 'catatan', label: 'Catatan' }
],
cariField: ['namaSiswa', 'nis', 'kelas', 'namaTempat']
});
gambarPendaftaran();
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
function gambarPendaftaran() {
const box = $('tabelPendaftaran');
if (!box) return;
const res = { data: dataTerproses('pendaftaran') };
if (!res.data.length) {
box.innerHTML = emptyState('inbox', 'Tidak ada pendaftaran',
'Belum ada pengajuan dengan status "' + AppState.filterPendaftaran + '".');
return;
}
box.innerHTML = `<table class="data-table">
<thead><tr><th>Siswa</th><th>Tempat Diajukan</th><th>Kuota</th><th>Tanggal</th><th>Status</th><th></th></tr></thead>
<tbody>${res.data.map(p => `
<tr>
<td><div class="td-strong">${esc(p.namaSiswa)}</div>
<div class="td-sub">${esc(p.nis)} &middot; ${esc(p.kelas)}</div></td>
<td><div>${esc(p.namaTempat)}</div><div class="td-sub">${esc(p.alamat)}</div>
${p.jalur === 'Langsung'
? '<span class="chip chip-info" style="margin-top:6px"><span class="mi">person_add</span>Penempatan Langsung</span>'
: p.mandiri ? '<span class="chip chip-warning" style="margin-top:6px"><span class="mi">flag</span>Pengajuan Mandiri</span>' : ''}</td>
<td class="td-num">${p.sisaKuota === null ? '—' :
`<span class="chip ${p.sisaKuota > 0 ? 'chip-success' : 'chip-error'}">${p.sisaKuota} sisa</span>`}</td>
<td>${tglSingkat(p.tanggalAjuan)}</td>
<td>${chipStatus(p.status)}${p.catatan ? `<div class="td-sub" style="margin-top:4px">${esc(p.catatan)}</div>` : ''}</td>
<td><div class="td-actions">
${p.suratUrl ? `<button class="btn-icon" aria-label="Lihat surat pengantar"
onclick="bukaPratinjau('Surat Pengantar','${esc(p.suratUrl)}','','gambar')">
<span class="mi">description</span></button>` : ''}
${p.status === 'Diproses' ? `
<button class="btn btn-success btn-xs" onclick="bukaTerimaPendaftaran('${esc(p.id)}')">
<span class="mi">check</span> Terima</button>
<button class="btn btn-danger btn-xs" onclick="tolakPendaftaran('${esc(p.id)}')">
<span class="mi">close</span> Tolak</button>` : ''}
${p.bisaBatalPenempatan ? `
<button class="btn-icon danger" aria-label="Batalkan penempatan ${esc(p.namaSiswa)}"
onclick="bukaBatalPenempatan('${esc(p.id)}')"><span class="mi">undo</span></button>` : ''}
</div></td>
</tr>`).join('')}</tbody></table>`;
}
function bukaTerimaPendaftaran(id) {
const p = (AppState.dataPendaftaran || []).find(x => x.id === id);
bukaModal('Terima Pendaftaran', `
${p ? `<div class="info-tonal"><span class="mi">person</span>
<div><div class="info-strong">${esc(p.namaSiswa)}</div>
<div class="info-sub">${esc(p.kelas)} &middot; ${esc(p.namaTempat)}</div></div></div>` : ''}
${p && p.mandiri ? `<div class="alert alert-warning" style="margin-bottom:16px">
<span class="mi">info</span>
<div><strong>Pengajuan mandiri</strong>
<p>Tempat PKL baru akan dibuat otomatis dengan kuota 1. Lengkapi koordinat dan
jam kerjanya di menu Tempat PKL setelah ini.</p></div></div>` : ''}
<div class="field">
<label class="field-label" for="dfGuru">Tetapkan Guru Pembimbing</label>
<select class="field-input" id="dfGuru"><option value="">Memuat…</option></select>
<div class="field-error" id="errDfGuru"></div>
</div>
<div class="field">
<label class="field-label" for="dfCatatan">Catatan (opsional)</label>
<textarea class="field-input" id="dfCatatan" rows="2" maxlength="400"></textarea>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">check</span> Terima & Tempatkan', kelas: 'btn-success',
aksi: () => kirimKeputusanPendaftaran(id, 'Diterima') }]);
muatOpsiGuruKeSelect('dfGuru');
}
function tolakPendaftaran(id) {
bukaModal('Tolak Pendaftaran', `
<div class="field">
<label class="field-label" for="dfCatatan">Alasan Penolakan</label>
<textarea class="field-input" id="dfCatatan" rows="3" maxlength="400"
placeholder="Jelaskan alasannya agar siswa dapat mengajukan tempat lain."></textarea>
<div class="field-error" id="errDfCatatan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">close</span> Tolak Pendaftaran', kelas: 'btn-danger',
aksi: () => kirimKeputusanPendaftaran(id, 'Ditolak') }]);
}
async function kirimKeputusanPendaftaran(id, keputusan) {
const guruId = $('dfGuru') ? $('dfGuru').value : '';
const catatan = $('dfCatatan') ? $('dfCatatan').value.trim() : '';
if (keputusan === 'Diterima' && !guruId) { $('errDfGuru').textContent = 'Pilih guru pembimbing terlebih dahulu.'; return; }
if (keputusan === 'Ditolak' && !catatan) { $('errDfCatatan').textContent = 'Alasan penolakan wajib diisi.'; return; }
tampilkanSibuk('Memproses pendaftaran…');
try {
const res = await panggil('prosesPendaftaran', AppState.sessionToken, id, keputusan, guruId, catatan);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6000); return; }
tutupModal();
toast(res.message, 'success', 5500);
batalkanPaketData();
muatPendaftaran();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function muatOpsiGuruKeSelect(idSelect, terpilih) {
try {
const res = await panggil('getOpsiGuru', AppState.sessionToken);
const sel = $(idSelect);
if (!sel || !res.success) return;
sel.innerHTML = '<option value="">— Pilih guru pembimbing —</option>' +
res.data.map(g => `<option value="${esc(g.id)}" ${terpilih === g.id ? 'selected' : ''}>
${esc(g.nama)} (${esc(g.nip)})</option>`).join('');
} catch (e) {}
}
let SKEMA_MASTER = {};
const RENDER_KOLOM = {
kuota: r => { const t = Number(r.KuotaTotal) || 0, i = Number(r.KuotaTerisi) || 0;
return `<span class="chip ${i < t ? 'chip-success' : 'chip-error'}">${i} / ${t}</span>`; },
jamKerja: r => jamTampil(r.JamMasuk) + ' – ' + jamTampil(r.JamPulang),
kontak: r => esc(r.NoKontak || '-') + (r.PIC ? `<div class="td-sub">${esc(r.PIC)}</div>` : ''),
aktifTempat: r => chipStatus(String(r.Aktif) === 'Ya' ? 'Aktif' : 'Nonaktif'),
statusPenempatan: r => `<span class="chip ${r.StatusPenempatan === 'Ditempatkan' ? 'chip-success' : 'chip-neutral'}">
${esc(r.StatusPenempatan || 'Belum Ditempatkan')}</span>` +
(String(r.KunciPendaftaran || '') === 'Ya'
? `<div class="td-sub" style="margin-top:4px"><span class="mi mi-inline">lock</span> Pendaftaran ditahan</div>` : ''),
tahap: r => r.Tahap ? esc(r.Tahap) : '<span class="td-sub">—</span>',
tglMulai: r => tglSingkat(r.TanggalMulai),
tglSelesai: r => tglSingkat(r.TanggalSelesai),
aktifPeriode: r => chipStatus(String(r.Aktif) === 'Ya' ? 'Aktif' : 'Nonaktif')
};
function entitasAktif() {
const el = $('tabelMaster');
return el ? el.dataset.entitas : null;
}
async function muatTabelMaster() {
const entitas = entitasAktif();
const box = $('tabelMaster');
if (!entitas || !box) return;
box.innerHTML = memuatInline('Mengambil data…');
try {
const res = await panggilCepat('getMasterData', AppState.sessionToken, entitas);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
AppState.dataTabel = res.data;
const skema = SKEMA_MASTER[entitas];
buatTabel({
id: 'master', mount: 'tabelMaster', idPrefix: 'ms',
judulEkspor: skema.label,
data: res.data, kunciPilih: 'ID', sortAwal: skema.kolom[0].k,
pilihBisa: !!skema.pilihBisa, cariField: skema.cariField, kolom: skema.kolom,
kosong: { ikon: 'inbox', judul: 'Belum ada data',
desc: 'Tambahkan data ' + skema.judul.toLowerCase() + ' pertama Anda.',
tombol: `<button class="btn btn-primary" onclick="bukaFormMaster('${entitas}')">
<span class="mi">add</span> Tambah Data</button>` },
aksi: r => `
<button class="btn-icon" aria-label="Lihat detail"
onclick="lihatDetailMaster('${entitas}','${esc(r.ID)}')"><span class="mi">visibility</span></button>
${entitas === 'Siswa' ? `<button class="btn-icon${String(r.KunciPendaftaran || '') === 'Ya' ? ' danger' : ''}"
aria-label="${String(r.KunciPendaftaran || '') === 'Ya' ? 'Buka pendaftaran mandiri' : 'Tahan pendaftaran mandiri'}"
title="${String(r.KunciPendaftaran || '') === 'Ya' ? 'Pendaftaran mandiri ditahan — klik untuk membuka' : 'Tahan pendaftaran mandiri'}"
onclick="bukaKunciPendaftaran('${esc(r.ID)}')"><span class="mi">${String(r.KunciPendaftaran || '') === 'Ya' ? 'lock' : 'lock_open'}</span></button>` : ''}
<button class="btn-icon" aria-label="Ubah data"
onclick="bukaFormMaster('${entitas}','${esc(r.ID)}')"><span class="mi">edit</span></button>
<button class="btn-icon danger" aria-label="Hapus data"
onclick="hapusDataMaster('${entitas}','${esc(r.ID)}')"><span class="mi">delete</span></button>`,
aksiMassal: () => {
const t = [];
if (skema.bulkField) t.push(`<button class="btn btn-outline btn-xs" onclick="bukaEditMassal('${entitas}')">
<span class="mi">edit</span> Edit Massal</button>`);
if (entitas === 'TempatPKL') t.push(`<button class="btn btn-outline btn-xs" onclick="bukaEditMassal('${entitas}')">
<span class="mi">toggle_on</span> Ubah Status</button>`);
if (skema.resetPassword) t.push(`<button class="btn btn-outline btn-xs" onclick="resetPasswordMassalUI('${entitas}')">
<span class="mi">lock_reset</span> Reset Password</button>`);
if (entitas === 'Siswa') {
t.push(`<button class="btn btn-outline btn-xs" onclick="bukaKunciMassal(true)">
<span class="mi">lock</span> Tahan Pendaftaran</button>`);
t.push(`<button class="btn btn-outline btn-xs" onclick="bukaKunciMassal(false)">
<span class="mi">lock_open</span> Buka Pendaftaran</button>`);
}
t.push(`<button class="btn btn-danger btn-xs" onclick="hapusMassalUI('${entitas}')">
<span class="mi">delete</span> Hapus</button>`);
return t.join('');
}
});
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
function lihatDetailMaster(entitas, id) {
const skema = SKEMA_MASTER[entitas];
const row = (AppState.dataTabel || []).find(r => r.ID === id);
if (!row) return;
const baris = skema.field.map(f => [f.l, f.t === 'time' ? jamTampil(row[f.k])
: f.t === 'date' ? tglSingkat(row[f.k]) : (row[f.k] || '—')]);
if (entitas === 'TempatPKL') baris.push(['Kuota Terisi', (row.KuotaTerisi || 0) + ' / ' + (row.KuotaTotal || 0)]);
if (entitas === 'Siswa') {
baris.push(['Status Penempatan', row.StatusPenempatan || '—']);
baris.push(['Pendaftaran Mandiri', String(row.KunciPendaftaran || '') === 'Ya'
? 'Ditahan' + (row.AlasanKunci ? ' — ' + row.AlasanKunci : '') : 'Terbuka']);
}
bukaModal('Detail ' + skema.judul, `<div class="list">${baris.map(([l, v]) => `
<div class="list-item"><div class="list-main">
<div class="data-label">${esc(l)}</div><div class="data-value">${esc(v)}</div></div></div>`).join('')}</div>`,
[{ label: 'Tutup', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">edit</span> Ubah', kelas: 'btn-primary',
aksi: () => bukaFormMaster(entitas, id) }]);
}
function bukaFormMaster(entitas, id) {
const skema = SKEMA_MASTER[entitas];
if (!skema) return;
const data = id ? (AppState.dataTabel || []).find(r => r.ID === id) || {} : {};
const htmlField = skema.field.map(f => {
const nilai = data[f.k] !== undefined ? data[f.k] : '';
const idInp = 'ms_' + f.k;
let input;
if (f.t === 'tahap') {
const ada = !!String(nilai).trim();
return `<div class="field">
<label class="field-check" style="margin-bottom:8px">
<input type="checkbox" id="ms_TahapAktif" ${ada ? 'checked' : ''} onchange="toggleFieldTahap()">
<span>Gunakan pembagian tahap</span>
</label>
<label class="field-label" for="${idInp}">${esc(f.l)}</label>
<select class="field-input" id="${idInp}" ${ada ? '' : 'disabled'}>
<option value="Tahap 1" ${nilai === 'Tahap 1' ? 'selected' : ''}>Tahap 1</option>
<option value="Tahap 2" ${nilai === 'Tahap 2' ? 'selected' : ''}>Tahap 2</option>
</select>
<p class="field-help">Opsional. Centang kotak di atas bila periode ini dibagi menjadi beberapa tahap.</p>
</div>`;
}
if (f.t === 'textarea') {
input = `<textarea class="field-input" id="${idInp}" rows="2" ${f.maks ? `maxlength="${f.maks}"` : ''}
placeholder="${esc(f.placeholder || '')}">${esc(nilai)}</textarea>`;
} else if (f.t === 'select') {
input = `<select class="field-input" id="${idInp}">${f.opsi.map(o =>
`<option value="${esc(o)}" ${String(nilai) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
} else if (f.t === 'time') {
input = `<input class="field-input" id="${idInp}" type="time" value="${esc(jamTampil(nilai) === '-' ? '' : jamTampil(nilai))}">`;
} else {
input = `<input class="field-input" id="${idInp}" type="${f.t}" value="${esc(nilai)}"
${f.maks ? `maxlength="${f.maks}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''}
${f.max !== undefined ? `max="${f.max}"` : ''} placeholder="${esc(f.placeholder || '')}"
${f.k === 'NoHP' || f.k === 'NoKontak' ? 'inputmode="tel"' : ''}>`;
}
return `<div class="field">
<label class="field-label" for="${idInp}">${esc(f.l)}${f.wajib ? ' *' : ''}</label>
${input}
${f.bantuan ? `<p class="field-help">${esc(f.bantuan)}</p>` : ''}
<div class="field-error" id="err_${f.k}"></div>
</div>`;
}).join('');
const tombolLokasi = (entitas === 'TempatPKL')
? `<button type="button" class="btn btn-outline btn-sm btn-block" style="margin:-8px 0 16px"
onclick="isiKoordinatMaster()"><span class="mi">my_location</span> Gunakan Lokasi Saya Sekarang</button>`
: '';
bukaModal((id ? 'Ubah ' : 'Tambah ') + skema.judul, htmlField + tombolLokasi,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">save</span> Simpan', kelas: 'btn-primary',
aksi: () => simpanDataMaster(entitas, id) }]);
}
function toggleFieldTahap() {
const cb = $('ms_TahapAktif'), sel = $('ms_Tahap');
if (cb && sel) sel.disabled = !cb.checked;
}
function isiKoordinatMaster() {
if (!navigator.geolocation) { toast('Perangkat tidak mendukung deteksi lokasi.', 'error'); return; }
tampilkanSibuk('Mendeteksi lokasi…');
navigator.geolocation.getCurrentPosition(
pos => {
sembunyikanSibuk();
if ($('ms_Latitude')) $('ms_Latitude').value = pos.coords.latitude.toFixed(6);
if ($('ms_Longitude')) $('ms_Longitude').value = pos.coords.longitude.toFixed(6);
toast('Koordinat terisi (akurasi ±' + Math.round(pos.coords.accuracy) + ' m).', 'success');
},
() => { sembunyikanSibuk(); toast('Lokasi tidak terbaca. Isi manual dari Google Maps.', 'warning'); },
{ enableHighAccuracy: true, timeout: 15000 });
}
async function simpanDataMaster(entitas, id) {
const skema = SKEMA_MASTER[entitas];
const obj = id ? { ID: id } : {};
let valid = true;
skema.field.forEach(f => {
const el = $('ms_' + f.k);
const errEl = $('err_' + f.k);
if (!el) return;
if (errEl) errEl.textContent = '';
el.classList.remove('invalid');
if (f.t === 'tahap') {
const cb = $('ms_TahapAktif');
obj[f.k] = (cb && cb.checked) ? el.value : '';
return;
}
const nilai = el.value.trim();
if (f.wajib && !nilai) {
if (errEl) errEl.textContent = f.l + ' wajib diisi.';
el.classList.add('invalid');
valid = false;
return;
}
if ((f.k === 'Latitude' || f.k === 'Longitude') && nilai && !isFinite(Number(nilai))) {
if (errEl) errEl.textContent = 'Harus berupa angka desimal, contoh: -7.383300';
el.classList.add('invalid');
valid = false;
return;
}
obj[f.k] = nilai;
});
if (!valid) return;
tampilkanSibuk('Menyimpan data…');
try {
const res = await panggil('simpanMasterData', AppState.sessionToken, entitas, obj);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6000); return; }
tutupModal();
toast(res.message, 'success');
batalkanPaketData();
muatTabelMaster();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function hapusDataMaster(entitas, id) {
const row = (AppState.dataTabel || []).find(r => r.ID === id) || {};
const nama = row.Nama || row.NamaInstansi || row.TahunAjaran || 'data ini';
const ya = await konfirmasi('Hapus Data',
`"${nama}" akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`);
if (!ya) return;
tampilkanSibuk('Menghapus…');
try {
const res = await panggil('hapusMasterMassal', AppState.sessionToken, entitas, [id]);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6000);
if (res.success) { batalkanPaketData(); muatTabelMaster(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function hapusMassalUI(entitas) {
const ids = idTerpilih('master');
if (!ids.length) { toast('Pilih data terlebih dahulu.', 'warning'); return; }
const ya = await konfirmasi('Hapus ' + ids.length + ' Data',
`${ids.length} data akan dihapus permanen. Data yang masih terhubung dengan PKL aktif ` +
`akan dilewati secara otomatis. Lanjutkan?`);
if (!ya) return;
tampilkanSibuk('Menghapus ' + ids.length + ' data…');
try {
const res = await panggil('hapusMasterMassal', AppState.sessionToken, entitas, ids);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'warning', 7000);
batalkanPaketData();
muatTabelMaster();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function resetPasswordMassalUI(entitas) {
const ids = idTerpilih('master');
if (!ids.length) { toast('Pilih data terlebih dahulu.', 'warning'); return; }
const ya = await konfirmasi('Reset ' + ids.length + ' Password',
`Password ${ids.length} pengguna akan direset menjadi sama dengan username masing-masing ` +
`(NIS/NIP). Sampaikan kepada mereka untuk segera menggantinya. Lanjutkan?`,
'Ya, reset', 'btn-danger');
if (!ya) return;
tampilkanSibuk('Mereset password…');
try {
const res = await panggil('resetPasswordMassal', AppState.sessionToken, entitas, ids);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6500);
if (res.success) batalkanPilihan();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function bukaEditMassal(entitas) {
const ids = idTerpilih('master');
if (!ids.length) { toast('Pilih data terlebih dahulu.', 'warning'); return; }
const skema = SKEMA_MASTER[entitas];
const opsiField = entitas === 'TempatPKL'
? [{ k: 'Aktif', l: 'Status Menerima Siswa', opsi: ['Ya', 'Tidak'] },
{ k: 'RadiusMeter', l: 'Radius Presensi (meter)' },
{ k: 'JamMasuk', l: 'Jam Masuk' }, { k: 'JamPulang', l: 'Jam Pulang' },
{ k: 'HariKerja', l: 'Hari Kerja' }, { k: 'KuotaTotal', l: 'Kuota Siswa' }]
: (skema.bulkField || []);
bukaModal('Edit Massal — ' + ids.length + ' data', `
<div class="alert alert-info" style="margin-bottom:16px">
<span class="mi">info</span>
<div><strong>${ids.length} data terpilih</strong>
<p>Kolom yang Anda pilih akan diisi dengan nilai yang sama untuk seluruh data terpilih.</p></div>
</div>
<div class="field">
<label class="field-label" for="bmField">Kolom yang Diubah</label>
<select class="field-input" id="bmField" onchange="gantiInputEditMassal('${entitas}')">
${opsiField.map(f => `<option value="${esc(f.k)}">${esc(f.l)}</option>`).join('')}
</select>
</div>
<div id="bmNilaiWrap"></div>
<div class="field-error" id="errBulk"></div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">save</span> Terapkan', kelas: 'btn-primary',
aksi: () => kirimEditMassal(entitas) }]);
gantiInputEditMassal(entitas);
}
function gantiInputEditMassal(entitas) {
const skema = SKEMA_MASTER[entitas];
const field = $('bmField').value;
const opsiField = entitas === 'TempatPKL'
? [{ k: 'Aktif', l: 'Status', opsi: ['Ya', 'Tidak'] }, { k: 'RadiusMeter', l: 'Radius', tipe: 'number' },
{ k: 'JamMasuk', l: 'Jam Masuk', tipe: 'time' }, { k: 'JamPulang', l: 'Jam Pulang', tipe: 'time' },
{ k: 'HariKerja', l: 'Hari Kerja' }, { k: 'KuotaTotal', l: 'Kuota', tipe: 'number' }]
: (skema.bulkField || []);
const f = opsiField.find(x => x.k === field) || {};
$('bmNilaiWrap').innerHTML = `<div class="field">
<label class="field-label" for="bmNilai">Nilai Baru</label>
${f.opsi
? `<select class="field-input" id="bmNilai">${f.opsi.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`
: `<input class="field-input" id="bmNilai" type="${f.tipe || 'text'}" ${f.tipe === 'number' ? 'min="1"' : ''}>`}
</div>`;
}
async function kirimEditMassal(entitas) {
const ids = idTerpilih('master');
const field = $('bmField').value, nilai = $('bmNilai').value;
if (nilai === '' || nilai === null) { $('errBulk').textContent = 'Nilai baru wajib diisi.'; return; }
tampilkanSibuk('Memperbarui ' + ids.length + ' data…');
try {
const res = await panggil('ubahMasterMassal', AppState.sessionToken, entitas, ids, field, nilai);
sembunyikanSibuk();
if (!res.success) { $('errBulk').textContent = res.message; return; }
tutupModal();
toast(res.message, 'success');
batalkanPaketData();
muatTabelMaster();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function bukaImporExcel(entitas) {
const skema = SKEMA_MASTER[entitas];
tampilkanSibuk('Menyiapkan pustaka Excel…');
const siap = await pastikanSheetJS();
sembunyikanSibuk();
if (!siap) {
bukaModal('Pustaka Excel Tidak Tersedia', `
<div class="alert alert-error"><span class="mi">signal_wifi_off</span>
<div><strong>Gagal memuat pustaka pembaca Excel</strong>
<p>Fitur impor membutuhkan pustaka yang diunduh dari internet, dan seluruh
alamat cadangan tidak dapat dihubungi. Periksa koneksi Anda, atau coba
lewat jaringan lain.</p>
<p style="margin-top:8px">Menu lain tetap berfungsi normal — Anda masih bisa
menambahkan data satu per satu lewat tombol <b>Tambah</b>.</p></div></div>`,
[{ label: 'Tutup', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">refresh</span> Coba Lagi', kelas: 'btn-primary',
aksi: () => { StatusSkrip['sheetjs'] = null; tutupModal(); bukaImporExcel(entitas); } }]);
return;
}
bukaModal('Impor Data ' + skema.judul, skema.htmlImpor,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">cloud_upload</span> Impor Sekarang', kelas: 'btn-primary',
aksi: () => kirimImpor(entitas) }]);
AppState.imporSiap = null;
}
function unduhTemplateExcel(entitas) {
const skema = SKEMA_MASTER[entitas];
if (typeof XLSX === 'undefined') { toast('Pustaka Excel belum siap. Tutup lalu buka lagi dialog impor.', 'warning'); return; }
try {
const aoa = [skema.imporKolom, skema.imporContoh];
const ws = XLSX.utils.aoa_to_sheet(aoa);
const kolomTeks = ['NIS', 'NIP', 'NoHP', 'NoKontak', 'JamMasuk', 'JamPulang'];
skema.imporKolom.forEach((nama, c) => {
if (kolomTeks.indexOf(nama) === -1) return;
for (let r = 1; r <= 1; r++) {
const ref = XLSX.utils.encode_cell({ r: r, c: c });
if (ws[ref]) { ws[ref].t = 's'; ws[ref].v = String(ws[ref].v); ws[ref].z = '@'; }
}
});
ws['!cols'] = skema.imporKolom.map(k => ({ wch: Math.max(14, k.length + 4) }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Data');
XLSX.writeFile(wb, 'Template_' + entitas + '.xlsx');
toast('Template diunduh. Baris kedua adalah contoh — hapus sebelum mengimpor.', 'success', 6500);
} catch (e) {
toast('Gagal membuat template: ' + e.message, 'error');
}
}
function uraiBerkasExcel(event, entitas) {
const file = event.target.files && event.target.files[0];
if (!file) return;
if (typeof XLSX === 'undefined') { tampilkanPratinjauImpor(null, 'Pustaka Excel belum siap. Tutup lalu buka lagi dialog impor.'); return; }
const skema = SKEMA_MASTER[entitas];
$('imNamaFile').textContent = file.name;
const reader = new FileReader();
reader.onload = e => {
try {
const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false, raw: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const baris = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
if (!baris.length) { tampilkanPratinjauImpor(null, 'Berkas tidak berisi data.'); return; }
const kolomAda = Object.keys(baris[0]).map(k => String(k).trim());
const wajib = skema.imporKolom.filter(k => ['NIS', 'NIP', 'NamaInstansi', 'Nama'].indexOf(k) >= 0);
const hilang = wajib.filter(k => kolomAda.indexOf(k) === -1);
if (hilang.length) {
tampilkanPratinjauImpor(null,
'Kolom wajib tidak ditemukan: ' + hilang.join(', ') + '. Gunakan template yang disediakan.');
return;
}
const bersih = baris.map(r => {
const o = {};
skema.imporKolom.forEach(k => {
let v = r[k];
o[k] = (v === undefined || v === null) ? '' : String(v).trim();
});
return o;
}).filter(r => String(r[skema.kunci] || '').trim() !== '');
if (!bersih.length) {
tampilkanPratinjauImpor(null, 'Tidak ada baris dengan ' + skema.kunci + ' terisi.');
return;
}
AppState.imporSiap = bersih;
tampilkanPratinjauImpor(bersih, null, skema);
} catch (err) {
tampilkanPratinjauImpor(null, 'Berkas tidak dapat dibaca: ' + err.message);
}
};
reader.onerror = () => tampilkanPratinjauImpor(null, 'Gagal membaca berkas.');
reader.readAsArrayBuffer(file);
}
function tampilkanPratinjauImpor(baris, galat, skema) {
const box = $('imPratinjau');
if (!box) return;
if (galat) {
AppState.imporSiap = null;
box.innerHTML = `<div class="alert alert-error"><span class="mi">error</span>
<div><strong>Berkas belum dapat diimpor</strong><p>${esc(galat)}</p></div></div>`;
return;
}
const contoh = baris.slice(0, 5);
box.innerHTML = `
<div class="alert alert-success" style="margin-bottom:12px">
<span class="mi">check_circle</span>
<div><strong>${baris.length} baris siap diimpor</strong>
<p>Berikut ${contoh.length} baris pertama sebagai pemeriksaan.</p></div>
</div>
<div class="table-wrap"><table class="data-table" style="min-width:auto;font-size:12.5px">
<thead><tr>${skema.imporKolom.slice(0, 5).map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead>
<tbody>${contoh.map(r => `<tr>${skema.imporKolom.slice(0, 5).map(k =>
`<td>${esc(r[k] || '-')}</td>`).join('')}</tr>`).join('')}</tbody>
</table></div>`;
}
async function kirimImpor(entitas) {
if (!AppState.imporSiap || !AppState.imporSiap.length) {
toast('Pilih berkas Excel yang valid terlebih dahulu.', 'warning');
return;
}
const mode = $('imMode').value;
tampilkanSibuk('Mengimpor ' + AppState.imporSiap.length + ' baris…');
try {
const res = await panggil('imporMasterData', AppState.sessionToken, entitas, AppState.imporSiap, mode);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 7000); return; }
tutupModal();
AppState.imporSiap = null;
batalkanPaketData();
muatTabelMaster();
const d = res.data;
if (d.gagal && d.gagal.length) {
bukaModal('Hasil Impor', `
<div class="alert alert-warning" style="margin-bottom:12px">
<span class="mi">warning</span>
<div><strong>${d.ditambah} ditambahkan, ${d.diperbarui} diperbarui, ${d.gagal.length} gagal</strong>
<p>Perbaiki baris berikut di berkas Excel Anda lalu impor ulang.</p></div>
</div>
<div class="list">${d.gagal.slice(0, 30).map(g => `
<div class="list-item"><div class="list-lead danger"><span class="mi">error</span></div>
<div class="list-main"><div class="list-text">${esc(g)}</div></div></div>`).join('')}
</div>${d.gagal.length > 30 ? `<p class="field-help">…dan ${d.gagal.length - 30} baris lainnya.</p>` : ''}`,
[{ label: 'Tutup', kelas: 'btn-primary', aksi: tutupModal }]);
} else {
toast(res.message, 'success', 6000);
}
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
// ── Penempatan langsung oleh Pokja PKL ─────────────────────
async function bukaPenempatanLangsung() {
tampilkanSibuk('Menyiapkan data…');
let res;
try { res = await panggil('getOpsiPenempatanLangsung', AppState.sessionToken); }
catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); return; }
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error'); return; }
if (!res.data.periode) { toast('Aktifkan periode PKL terlebih dahulu di menu Periode PKL.', 'warning', 6000); return; }
if (!res.data.siswa.length) { toast('Semua siswa sudah memiliki penempatan PKL aktif.', 'info', 5000); return; }
if (!res.data.tempat.length) { toast('Belum ada tempat PKL aktif yang kuotanya tersisa.', 'warning', 6000); return; }

AppState.opsiTempatkan = res.data;
AppState.pilihanTempatkan = [];

bukaModal('Tempatkan Siswa Langsung', `
<div class="alert alert-info" style="margin-bottom:16px">
<span class="mi">info</span>
<div><strong>Jalur khusus</strong>
<p>Siswa ditempatkan tanpa melalui pendaftaran mandiri. Dipakai untuk kasus yang butuh
pengawasan sekolah. Alasannya tercatat dan ikut terekspor bersama data pendaftaran.</p></div>
</div>

<div class="field">
<label class="field-label" for="plCariSiswa">1. Pilih Siswa *</label>
<div class="input-affix search-affix pilih-cari">
<span class="mi">search</span>
<input class="field-input" type="search" id="plCariSiswa" placeholder="Ketik nama, NIS, atau kelas…"
autocomplete="off" oninput="gambarPilihanSiswaTempatkan()">
</div>
<div class="pilih-box" id="plDaftarSiswa"></div>
<div class="field-help" id="plRingkasPilih">Belum ada siswa dipilih.</div>
<div class="field-error" id="errPlSiswa"></div>
</div>

<div class="field">
<label class="field-label" for="plTempat">2. Tempat PKL Tujuan *</label>
<select class="field-input" id="plTempat" onchange="perbaruiSisaKuotaTempatkan()">
<option value="">— Pilih tempat PKL —</option>
${res.data.tempat.map(t => `<option value="${esc(t.id)}" data-sisa="${t.sisaKuota}">
${esc(t.nama)} (sisa ${t.sisaKuota})</option>`).join('')}
</select>
<div class="field-help" id="plSisaKuota">Hanya tempat aktif dengan kuota tersisa yang ditampilkan.</div>
<div class="field-error" id="errPlTempat"></div>
</div>

<div class="field">
<label class="field-label" for="plGuru">3. Guru Pembimbing *</label>
<select class="field-input" id="plGuru">
<option value="">— Pilih guru pembimbing —</option>
${res.data.guru.map(g => `<option value="${esc(g.id)}">${esc(g.nama)} (${esc(g.nip)})</option>`).join('')}
</select>
<div class="field-error" id="errPlGuru"></div>
</div>

<div class="field">
<label class="field-label" for="plAlasan">4. Alasan Penempatan Langsung *</label>
<textarea class="field-input" id="plAlasan" rows="3" maxlength="400"
placeholder="Contoh: siswa dalam masa pembinaan, penempatan ditentukan sekolah agar mudah dipantau."></textarea>
<div class="field-help">Minimal 10 karakter. Tersimpan sebagai catatan resmi.</div>
<div class="field-error" id="errPlAlasan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">person_add</span> Tempatkan', kelas: 'btn-primary', aksi: kirimPenempatanLangsung }]);

gambarPilihanSiswaTempatkan();
}
function gambarPilihanSiswaTempatkan() {
const box = $('plDaftarSiswa');
if (!box) return;
const kunci = ($('plCariSiswa') ? $('plCariSiswa').value : '').trim().toLowerCase();
const semua = (AppState.opsiTempatkan && AppState.opsiTempatkan.siswa) || [];
const hasil = kunci
? semua.filter(s => (s.nama + ' ' + s.nis + ' ' + s.kelas + ' ' + s.jurusan).toLowerCase().includes(kunci))
: semua;
if (!hasil.length) {
box.innerHTML = '<div class="pilih-kosong">Tidak ada siswa yang cocok.</div>';
return;
}
const dipilih = AppState.pilihanTempatkan || [];
box.innerHTML = hasil.slice(0, 60).map(s => `
<label class="pilih-baris">
<input type="checkbox" value="${esc(s.id)}" ${dipilih.indexOf(s.id) >= 0 ? 'checked' : ''}
onchange="togglePilihSiswaTempatkan('${esc(s.id)}', this.checked)">
<span class="pilih-teks">
<span class="pilih-nama">${esc(s.nama)}
${s.terkunci ? '<span class="mi pilih-gembok" title="Pendaftaran mandiri ditahan">lock</span>' : ''}</span>
<span class="pilih-sub">${esc(s.nis)} &middot; ${esc(s.kelas || '-')}</span>
</span>
</label>`).join('') +
(hasil.length > 60 ? `<div class="pilih-kosong">Menampilkan 60 dari ${hasil.length}. Persempit dengan pencarian.</div>` : '');
}
function togglePilihSiswaTempatkan(id, aktif) {
const dipilih = AppState.pilihanTempatkan || (AppState.pilihanTempatkan = []);
const i = dipilih.indexOf(id);
if (aktif && i < 0) dipilih.push(id);
if (!aktif && i >= 0) dipilih.splice(i, 1);
const info = $('plRingkasPilih');
if (info) info.textContent = dipilih.length ? dipilih.length + ' siswa dipilih.' : 'Belum ada siswa dipilih.';
perbaruiSisaKuotaTempatkan();
}
function perbaruiSisaKuotaTempatkan() {
const sel = $('plTempat'), info = $('plSisaKuota');
if (!sel || !info) return;
const opt = sel.options[sel.selectedIndex];
const sisa = opt ? Number(opt.dataset.sisa) : NaN;
const n = (AppState.pilihanTempatkan || []).length;
if (!sel.value || !isFinite(sisa)) {
info.textContent = 'Hanya tempat aktif dengan kuota tersisa yang ditampilkan.';
info.classList.remove('field-help-danger');
return;
}
const kurang = n > sisa;
info.textContent = kurang
? 'Kuota tinggal ' + sisa + ', sedangkan Anda memilih ' + n + ' siswa.'
: 'Sisa kuota ' + sisa + ' &middot; dipilih ' + n + '.';
info.classList.toggle('field-help-danger', kurang);
}
async function kirimPenempatanLangsung() {
const siswaIds = AppState.pilihanTempatkan || [];
const tempatId = $('plTempat') ? $('plTempat').value : '';
const guruId = $('plGuru') ? $('plGuru').value : '';
const alasan = $('plAlasan') ? $('plAlasan').value.trim() : '';
['errPlSiswa', 'errPlTempat', 'errPlGuru', 'errPlAlasan'].forEach(id => { if ($(id)) $(id).textContent = ''; });

if (!siswaIds.length) { $('errPlSiswa').textContent = 'Pilih minimal satu siswa.'; return; }
if (!tempatId) { $('errPlTempat').textContent = 'Pilih tempat PKL tujuan.'; return; }
if (!guruId) { $('errPlGuru').textContent = 'Pilih guru pembimbing.'; return; }
if (alasan.length < 10) { $('errPlAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }

tampilkanSibuk('Menempatkan siswa…');
try {
const res = await panggil('tempatkanLangsung', AppState.sessionToken,
{ siswaIds: siswaIds, tempatId: tempatId, guruId: guruId, alasan: alasan });
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 7000); return; }
tutupModal();
toast(res.message, 'success', 6500);
AppState.pilihanTempatkan = [];
batalkanPaketData();
muatPendaftaran();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

// ── Kunci pendaftaran mandiri siswa ────────────────────────
function bukaKunciPendaftaran(id) {
const row = (AppState.dataTabel || []).find(r => r.ID === id);
if (!row) return;
const sedangTerkunci = String(row.KunciPendaftaran || '') === 'Ya';
if (sedangTerkunci) {
konfirmasi('Buka Pendaftaran Mandiri',
`Izinkan ${row.Nama} memilih dan mendaftar tempat PKL sendiri lagi?`,
'Ya, buka kembali', 'btn-primary').then(ya => {
if (ya) kirimKunciPendaftaran([id], false, '');
});
return;
}
bukaModal('Tahan Pendaftaran Mandiri', `
<div class="info-tonal"><span class="mi">person</span>
<div><div class="info-strong">${esc(row.Nama)}</div>
<div class="info-sub">${esc(row.NIS)} &middot; ${esc(row.Kelas || '-')}</div></div></div>
<div class="alert alert-warning" style="margin:16px 0">
<span class="mi">lock</span>
<div><strong>Apa yang terjadi</strong>
<p>Siswa tetap dapat masuk aplikasi seperti biasa, tetapi tombol pendaftaran tempat PKL
akan menolak dengan pesan agar menghubungi Pokja PKL. Penempatannya Anda tentukan
lewat tombol <strong>Tempatkan Langsung</strong> di menu Pendaftaran.</p></div>
</div>
<div class="field">
<label class="field-label" for="kpAlasan">Alasan *</label>
<textarea class="field-input" id="kpAlasan" rows="3" maxlength="300"
placeholder="Contoh: masa pembinaan, penempatan ditentukan sekolah."></textarea>
<div class="field-help">Minimal 10 karakter. Ditampilkan kepada siswa.</div>
<div class="field-error" id="errKpAlasan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">lock</span> Tahan Pendaftaran', kelas: 'btn-danger',
aksi: () => {
const a = $('kpAlasan').value.trim();
if (a.length < 10) { $('errKpAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }
kirimKunciPendaftaran([id], true, a);
} }]);
}
function bukaKunciMassal(kunci) {
const ids = idTerpilih('master');
if (!ids.length) { toast('Pilih siswa terlebih dahulu.', 'warning'); return; }
if (!kunci) {
konfirmasi('Buka Pendaftaran Mandiri',
`Izinkan ${ids.length} siswa terpilih mendaftar tempat PKL sendiri lagi?`,
'Ya, buka kembali', 'btn-primary').then(ya => { if (ya) kirimKunciPendaftaran(ids, false, ''); });
return;
}
bukaModal('Tahan Pendaftaran Mandiri', `
<div class="info-tonal"><span class="mi">group</span>
<div><div class="info-strong">${ids.length} siswa terpilih</div>
<div class="info-sub">Alasan yang sama akan dicatat untuk semuanya.</div></div></div>
<div class="field" style="margin-top:16px">
<label class="field-label" for="kpAlasan">Alasan *</label>
<textarea class="field-input" id="kpAlasan" rows="3" maxlength="300"></textarea>
<div class="field-help">Minimal 10 karakter.</div>
<div class="field-error" id="errKpAlasan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">lock</span> Tahan Pendaftaran', kelas: 'btn-danger',
aksi: () => {
const a = $('kpAlasan').value.trim();
if (a.length < 10) { $('errKpAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }
kirimKunciPendaftaran(ids, true, a);
} }]);
}
async function kirimKunciPendaftaran(ids, kunci, alasan) {
tampilkanSibuk('Menyimpan…');
try {
const res = await panggil('setKunciPendaftaran', AppState.sessionToken, ids, kunci, alasan);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6000); return; }
tutupModal();
toast(res.message, 'success');
batalkanPaketData();
muatTabelMaster();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}


// ── Menarik kembali penempatan yang terlanjur diproses ─────
function bukaBatalPenempatan(id) {
const p = (AppState.dataPendaftaran || []).find(x => x.id === id);
bukaModal('Batalkan Penempatan', `
${p ? `<div class="info-tonal"><span class="mi">person</span>
<div><div class="info-strong">${esc(p.namaSiswa)}</div>
<div class="info-sub">${esc(p.kelas || '-')} &middot; ${esc(p.namaTempat)}</div></div></div>` : ''}
<div class="alert alert-warning" style="margin:16px 0">
<span class="mi">undo</span>
<div><strong>Penempatan akan ditarik kembali</strong>
<p>Siswa kembali berstatus belum ditempatkan, kuota tempat PKL dikembalikan, dan
pendaftarannya berubah menjadi <em>Dibatalkan</em>. Siswa dapat mendaftar lagi setelah ini.</p></div>
</div>
<div class="field">
<label class="field-label" for="bnAlasan">Alasan Pembatalan *</label>
<textarea class="field-input" id="bnAlasan" rows="3" maxlength="400"
placeholder="Contoh: salah memilih tempat PKL saat memproses pendaftaran."></textarea>
<div class="field-help">Minimal 10 karakter. Tersimpan sebagai catatan resmi.</div>
<div class="field-error" id="errBnAlasan"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">undo</span> Tarik Kembali', kelas: 'btn-danger',
aksi: async () => {
const a = $('bnAlasan').value.trim();
if (a.length < 10) { $('errBnAlasan').textContent = 'Alasan minimal 10 karakter.'; return; }
tutupModal();
tampilkanSibuk('Membatalkan penempatan…');
try {
const res = await panggil('batalkanPenempatan', AppState.sessionToken, id, a);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 8000); return; }
toast(res.message, 'success', 6500);
batalkanPaketData();
muatPendaftaran();
} catch (e) { sembunyikanSibuk(); toast(e.message, 'error'); }
} }]);
}

window.__blok = 5;

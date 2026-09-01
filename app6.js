async function bukaKonfigurasiNomor() {
tampilkanSibuk('Memuat pengaturan…');
try {
const res = await panggilCepat('getKonfigurasiNomor', AppState.sessionToken);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error'); return; }
bukaModal('Format Nomor Sertifikat', res.data.html,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">save</span> Simpan Format', kelas: 'btn-primary', aksi: simpanFormatNomor }]);
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function pratinjauNomor() {
const el = $('contohNomor');
if (!el) return;
const format = $('fnFormat').value;
const digit = Math.max(1, Math.min(8, Number($('fnDigit').value) || 3));
const kode = $('fnKode').value.trim();
const urut = Math.max(0, Number($('fnUrut').value) || 0) + 1;
const R = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const kini = new Date();
let n = String(urut);
while (n.length < digit) n = '0' + n;
const nilai = {
'{NOMOR}': n,
'{TAHUN}': String(kini.getFullYear()),
'{TAHUN2}': String(kini.getFullYear()).slice(-2),
'{BULAN}': ('0' + (kini.getMonth() + 1)).slice(-2),
'{BULAN_ROMAWI}': R[kini.getMonth()],
'{KODE_SEKOLAH}': kode || 'SMK',
'{NIS}': '12345',
'{TAHUN_AJARAN}': (AppState.periode && AppState.periode.TahunAjaran) || '2026/2027'
};
let hasil = format;
Object.keys(nilai).forEach(t => { hasil = hasil.split(t).join(nilai[t]); });
el.textContent = hasil || '—';
$('errFn').textContent = format.indexOf('{NOMOR}') === -1
? 'Format wajib memuat {NOMOR}.' : '';
}
async function simpanFormatNomor() {
const format = $('fnFormat').value.trim();
if (format.indexOf('{NOMOR}') === -1) { $('errFn').textContent = 'Format wajib memuat {NOMOR}.'; return; }
tampilkanSibuk('Menyimpan format…');
try {
const res = await panggil('simpanKonfigurasiNomor', AppState.sessionToken, {
format: format, digit: $('fnDigit').value,
kodeSekolah: $('fnKode').value.trim(), urutTerakhir: $('fnUrut').value });
sembunyikanSibuk();
if (!res.success) { $('errFn').textContent = res.message; return; }
batalkanPaketData();
tutupModal();
toast(res.message, 'success', 6000);
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function initSertifikat() {
muatStatusTemplate();
muatDaftarSertifikat();
}
async function muatStatusTemplate() {
const box = $('statusTemplate');
if (!box) return;
try {
const res = await panggilCepat('getKonfigurasiSertifikat', AppState.sessionToken);
if (!res.success) { box.innerHTML = ''; return; }
AppState.templateSertifikat = res.data;
const info = res.data.info;
box.innerHTML = info && info.valid
? `<div class="alert alert-success">
<span class="mi">slideshow</span>
<div style="flex:1"><strong>Template aktif: ${esc(info.nama)}</strong>
<p>Sertifikat dibuat dari template Google Slides ini dengan mail merge otomatis.</p></div>
<a class="btn btn-outline btn-xs" href="${esc(info.url)}" target="_blank" rel="noopener">
<span class="mi">open_in_new</span> Buka</a>
</div>`
: `<div class="alert alert-warning">
<span class="mi">info</span>
<div style="flex:1"><strong>Belum ada template Google Slides</strong>
<p>Sertifikat akan memakai desain bawaan aplikasi. Pasang template untuk desain kustom.</p></div>
<button class="btn btn-outline btn-xs" onclick="bukaKonfigurasiTemplate()">
<span class="mi">settings</span> Atur</button>
</div>`;
} catch (e) { box.innerHTML = ''; }
}
function bukaKonfigurasiTemplate() {
const d = AppState.templateSertifikat || { templateId: '', placeholder: [] };
bukaModal('Template Sertifikat (Google Slides)', `
<div class="alert alert-info" style="margin-bottom:16px">
<span class="mi">lightbulb</span>
<div><strong>Cara kerja</strong>
<p>Buat satu slide di Google Slides, tulis placeholder seperti <code>{{NAMA}}</code> di
posisi yang diinginkan. Saat sertifikat diterbitkan, sistem menyalin template,
mengganti seluruh placeholder dengan data siswa, lalu mengekspornya menjadi PDF.
Template asli tidak pernah berubah.</p></div>
</div>

<button class="btn btn-outline btn-block" onclick="buatTemplateContoh()">
<span class="mi">auto_awesome</span> Buatkan Template Contoh Otomatis</button>
<p class="field-help" style="margin-bottom:16px">Membuat Google Slides berisi seluruh placeholder,
lalu langsung memasangnya. Silakan sesuaikan desainnya setelah itu.</p>

<div class="field">
<label class="field-label" for="tplId">ID atau URL Google Slides</label>
<input class="field-input" id="tplId" type="text" value="${esc(d.templateId || '')}"
placeholder="${HTTPS}docs.google.com/presentation/d/…">
<p class="field-help">Tempel URL lengkap juga bisa — sistem mengambil ID-nya otomatis.
Kosongkan lalu simpan untuk kembali ke desain bawaan.</p>
<div class="field-error" id="errTpl"></div>
</div>

<details style="margin-top:8px">
<summary style="cursor:pointer;font-size:13.5px;font-weight:600;color:var(--primary)">
Lihat ${d.placeholder.length} placeholder yang tersedia</summary>
<div class="placeholder-grid">
${d.placeholder.map(p => `<div class="placeholder-item">
<span class="placeholder-tag">${esc(p.tag)}</span>
<span class="placeholder-ket">${esc(p.ket)}</span></div>`).join('')}
</div>
</details>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">save</span> Simpan Template', kelas: 'btn-primary', aksi: simpanTemplateUI }]);
}
async function buatTemplateContoh() {
const ya = await konfirmasi('Buat Template Contoh',
'Sistem akan membuat berkas Google Slides baru berisi seluruh placeholder dan langsung ' +
'memasangnya sebagai template aktif. Lanjutkan?', 'Ya, buatkan', 'btn-primary');
if (!ya) { bukaKonfigurasiTemplate(); return; }
tampilkanSibuk('Membuat template Google Slides…');
try {
const res = await panggil('buatTemplateSertifikatContoh', AppState.sessionToken);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 7000); return; }
tutupModal();
toast(res.message, 'success', 7000);
await muatStatusTemplate();
bukaModal('Template Berhasil Dibuat', `
<div class="alert alert-success" style="margin-bottom:12px">
<span class="mi">check_circle</span>
<div><strong>${esc(res.data.nama)}</strong>
<p>Template sudah dipasang. Buka di Google Slides untuk menyesuaikan desain,
logo, dan tata letaknya.</p></div>
</div>
<a class="btn btn-primary btn-block" href="${esc(res.data.url)}" target="_blank" rel="noopener">
<span class="mi">open_in_new</span> Buka di Google Slides</a>`,
[{ label: 'Tutup', kelas: 'btn-outline', aksi: tutupModal }]);
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function simpanTemplateUI() {
const nilai = $('tplId').value.trim();
$('errTpl').textContent = '';
tampilkanSibuk('Memvalidasi template…');
try {
const res = await panggil('simpanTemplateSertifikat', AppState.sessionToken, nilai);
sembunyikanSibuk();
if (!res.success) { $('errTpl').textContent = res.message; return; }
tutupModal();
toast(res.message, 'success', 6000);
muatStatusTemplate();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function muatDaftarSertifikat() {
const box = $('tabelSertifikat');
if (!box) return;
box.innerHTML = '<div class="skeleton" style="height:280px"></div>';
try {
const res = await panggilCepat('getDaftarSertifikat', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
buatTabel({
id: 'sertifikat', mount: 'tabelSertifikat', idPrefix: 'sf',
judulEkspor: 'Sertifikat PKL',
data: res.data, kunciPilih: 'siswaId', sortAwal: 'Nama',
cariField: ['Nama', 'NIS', 'Kelas', 'Nomor'],
kosong: { ikon: 'workspace_premium', judul: 'Belum ada siswa PKL aktif', desc: '' },
kolom: [
{ k: 'Nama', label: 'Siswa', sortable: true,
render: r => `<div class="td-strong">${esc(r.Nama)}</div><div class="td-sub">${esc(r.NIS)} · ${esc(r.Kelas)}</div>` },
{ k: 'siap', label: 'Kelengkapan Syarat', sortable: true,
render: r => r.siap
? '<span class="chip chip-success"><span class="mi">check_circle</span>Syarat lengkap</span>'
: `<span class="chip chip-warning"><span class="mi">pending</span>${r.kurang.length} syarat kurang</span>
<div class="td-sub" style="margin-top:5px">${esc(r.kurang.join('; '))}</div>` },
{ k: 'Nilai', label: 'Nilai', sortable: true, tipe: 'angka', kelas: 'td-num',
render: r => r.Nilai !== null && r.Nilai !== '' ? `<strong>${esc(r.Nilai)}</strong>` : '<span class="td-sub">—</span>' },
{ k: 'sudahTerbit', label: 'Status', sortable: true,
render: r => (r.sudahTerbit ? chipStatus('Terbit') : chipStatus('Belum Ada')) +
(r.Nomor ? `<div class="td-sub" style="margin-top:4px">${esc(r.Nomor)}</div>` : '') }
],
aksi: r => r.sudahTerbit
? `<button class="btn-icon" aria-label="Lihat sertifikat"
onclick="bukaPratinjau('Sertifikat ${esc(r.Nama)}','${esc(r.pratinjauUrl)}','${esc(r.unduhUrl)}','dokumen')">
<span class="mi">visibility</span></button>`
: `${AppState.templateSertifikat && AppState.templateSertifikat.templateId
? `<button class="btn-icon" aria-label="Pratinjau template"
onclick="pratinjauSertifikatUI('${esc(r.siswaId)}','${esc(r.Nama)}')">
<span class="mi">preview</span></button>` : ''}
<button class="btn btn-primary btn-xs" ${r.siap ? '' : 'disabled'}
onclick="terbitkanSertifikatUI('${esc(r.siswaId)}','${esc(r.Nama)}')">
<span class="mi">workspace_premium</span> Terbitkan</button>`
});
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat data', err.message);
}
}
async function pratinjauSertifikatUI(siswaId, nama) {
tampilkanSibuk('Membuat pratinjau…');
try {
const res = await panggil('pratinjauSertifikat', AppState.sessionToken, siswaId);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6500); return; }
bukaPratinjau('Pratinjau Sertifikat — ' + nama, res.data.pratinjauUrl, res.data.unduhUrl, 'dokumen');
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function terbitkanSertifikatUI(siswaId, nama) {
const ya = await konfirmasi('Terbitkan Sertifikat',
`Sertifikat PKL untuk ${nama} akan dibuat dalam format PDF dan tidak dapat ditarik kembali. Lanjutkan?`,
'Ya, terbitkan', 'btn-primary');
if (!ya) return;
tampilkanSibuk('Membuat sertifikat PDF…');
try {
const res = await panggil('terbitkanSertifikat', AppState.sessionToken, siswaId);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 7000); return; }
toast('Sertifikat ' + res.data.nomor + ' diterbitkan dari ' + res.data.sumber + '.', 'success', 6000);
muatDaftarSertifikat();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function initPengumuman() {
muatDaftarPengumuman();
if (AppState.user.role === 'admin') muatOpsiGuruKeSelect('pgTargetId');
toggleTargetGuru();
}
function toggleTargetGuru() {
const sel = $('pgTarget'), field = $('fieldTargetGuru');
if (!sel || !field) return;
field.hidden = !(sel.value === 'bimbingan' && AppState.user.role === 'admin');
}
async function muatDaftarPengumuman() {
const box = $('listPengumuman');
if (!box) return;
try {
const res = await panggilCepat('getPengumuman', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Gagal memuat', res.message); return; }
pasangEksporKartu({
id: 'pengumuman', idPrefix: 'pg', data: res.data,
judulEkspor: 'Daftar Pengumuman',
saatFilter: () => gambarPengumuman(),
cariField: ['judul', 'isi', 'pembuat'],
kolom: [
{ k: 'judul', label: 'Judul' }, { k: 'pembuat', label: 'Pembuat' },
{ k: 'tanggal', label: 'Tanggal' }, { k: 'target', label: 'Sasaran' },
{ k: 'isi', label: 'Isi' }
]
});
gambarPengumuman();
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat', err.message);
}
}
function gambarPengumuman() {
const box = $('listPengumuman');
if (!box) return;
const data = dataTerproses('pengumuman');
if (!data.length) {
box.innerHTML = emptyState('campaign', 'Belum ada pengumuman', 'Tidak ada pengumuman yang cocok dengan pencarian atau filter.');
return;
}
box.innerHTML = `<div class="list">${data.map(p => `
<div class="list-item" style="align-items:flex-start">
<div class="list-lead"><span class="mi">campaign</span></div>
<div class="list-main">
<div class="list-title">${esc(p.judul)}</div>
<div class="list-sub">${esc(p.pembuat)} &middot; ${tglSingkat(p.tanggal)} &middot;
${p.target === 'semua' ? 'Semua siswa' : 'Siswa bimbingan'}</div>
<div class="list-text">${esc(p.isi)}</div>
</div>
${p.milikSaya ? `<div class="list-tail">
<button class="btn-icon danger" aria-label="Hapus pengumuman"
onclick="hapusPengumumanUI('${esc(p.id)}')"><span class="mi">delete</span></button>
</div>` : ''}
</div>`).join('')}</div>`;
}
async function kirimPengumuman(event) {
event.preventDefault();
const judul = $('pgJudul').value.trim(), isi = $('pgIsi').value.trim();
if (!judul || !isi) { toast('Judul dan isi pengumuman wajib diisi.', 'warning'); return; }
tampilkanSibuk('Menerbitkan pengumuman…');
try {
const res = await panggil('simpanPengumuman', AppState.sessionToken, {
id: $('pgId').value || null, judul: judul, isi: isi,
target: $('pgTarget').value, targetId: $('pgTargetId') ? $('pgTargetId').value : '' });
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) { $('formPengumuman').reset(); $('pgId').value = ''; muatDaftarPengumuman(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function hapusPengumumanUI(id) {
const ya = await konfirmasi('Hapus Pengumuman', 'Pengumuman akan dihapus permanen. Lanjutkan?');
if (!ya) return;
tampilkanSibuk('Menghapus…');
try {
const res = await panggil('hapusPengumuman', AppState.sessionToken, id);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) muatDaftarPengumuman();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function bukaPengumumanCepat() {
bukaModal('Pengumuman', '<div class="skeleton" style="height:160px"></div>', []);
try {
const res = await panggil('getPengumuman', AppState.sessionToken);
$('modalBody').innerHTML = (res.success && res.data.length)
? `<div class="list">${res.data.slice(0, 8).map(p => `
<div class="list-item" style="align-items:flex-start">
<div class="list-lead"><span class="mi">campaign</span></div>
<div class="list-main">
<div class="list-title">${esc(p.judul)}</div>
<div class="list-sub">${esc(p.pembuat)} &middot; ${tglSingkat(p.tanggal)}</div>
<div class="list-text">${esc(p.isi)}</div>
</div>
</div>`).join('')}</div>`
: emptyState('campaign', 'Belum ada pengumuman', '');
} catch (err) {
$('modalBody').innerHTML = emptyState('error', 'Gagal memuat', err.message);
}
}
async function muatPengaturan() {
try {
const res = await panggilCepat('getAllConfig', AppState.sessionToken);
if (!res.success) { toast(res.message, 'error'); return; }
const c = res.data;
const isi = (id, v) => { if ($(id)) $(id).value = (v === null || v === undefined) ? '' : v; };
isi('stAppName', c.appName); isi('stTagline', c.appTagline); isi('stAppDesc', c.appDesc);
isi('stLogo', c.logoUrl); isi('stNamaSekolah', c.namaSekolah); isi('stAlamatSekolah', c.alamatSekolah);
isi('stKepsek', c.kepalaSekolah); isi('stNipKepsek', c.nipKepalaSekolah);
isi('stRadius', c.radiusDefault); isi('stToleransi', c.toleransiTelat); isi('stAdminEmail', c.adminEmail);
if ($('stNotif')) $('stNotif').value = c.notifikasiEmail || 'aktif';
pratinjauLogo();
const box = $('boxPenyimpanan');
if (box) {
const folder = id => id ? (HTTPS + 'drive.google.com/drive/folders/' + id) : '';
box.innerHTML = `
<p class="muted-sm">Seluruh berkas tersimpan di Google Drive akun pemilik aplikasi.</p>
<div class="list">
${[['Folder Utama', c.folderId], ['Foto Presensi', c.folderSelfieId],
['Foto Jurnal', c.folderJurnalId], ['Foto Profil', c.folderProfilId],
['Laporan Akhir', c.folderLaporanId], ['Surat Pengantar', c.folderSuratId],
['Sertifikat', c.folderSertifikatId], ['Template', c.folderTemplateId]]
.map(([l, id]) => `
<div class="list-item">
<div class="list-lead"><span class="mi">folder</span></div>
<div class="list-main"><div class="list-title">${l}</div>
<div class="list-sub">${id ? esc(String(id).slice(0, 20)) + '…' : 'belum dibuat'}</div></div>
${id ? `<div class="list-tail"><a class="btn-icon" href="${folder(id)}"
target="_blank" rel="noopener" aria-label="Buka folder ${l}">
<span class="mi">open_in_new</span></a></div>` : ''}
</div>`).join('')}
</div>
<div class="alert alert-info" style="margin-top:12px">
<span class="mi">database</span>
<div><strong>Database</strong>
<p>Spreadsheet <code>DB_SIM_PKL</code> berisi seluruh data. Buat salinan berkala sebagai cadangan.</p></div>
</div>
<a class="btn btn-outline btn-block" style="margin-top:12px"
href="${HTTPS}docs.google.com/spreadsheets/d/${esc(c.spreadsheetId || '')}"
target="_blank" rel="noopener">
<span class="mi">table_view</span> Buka Spreadsheet Database</a>`;
}
muatTabelAkun();
} catch (err) { toast(err.message, 'error'); }
}
function pratinjauLogo() {
const url = $('stLogo') ? $('stLogo').value.trim() : '';
const box = $('logoPreview'), img = $('logoPreviewImg');
if (!box || !img) return;
if (!url) { box.hidden = true; return; }
img.src = url;
img.onerror = () => { box.hidden = true; };
img.onload = () => { box.hidden = false; };
}
async function simpanFormPengaturan(event) {
event.preventDefault();
const radius = Number($('stRadius').value);
if (radius && (radius < 20 || radius > 1000)) { toast('Radius harus antara 20 dan 1000 meter.', 'warning'); return; }
tampilkanSibuk('Menyimpan pengaturan…');
try {
const res = await panggil('simpanPengaturan', AppState.sessionToken, {
appName: $('stAppName').value.trim() || 'SIM PKL',
appTagline: $('stTagline').value.trim(),
appDesc: $('stAppDesc').value.trim(),
logoUrl: $('stLogo').value.trim(),
namaSekolah: $('stNamaSekolah').value.trim(),
alamatSekolah: $('stAlamatSekolah').value.trim(),
kepalaSekolah: $('stKepsek').value.trim(),
nipKepalaSekolah: $('stNipKepsek').value.trim(),
radiusDefault: String(radius || 100),
toleransiTelat: String(Number($('stToleransi').value) || 15),
notifikasiEmail: $('stNotif').value,
adminEmail: $('stAdminEmail').value.trim()
});
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) { batalkanPaketData(); await muatBootstrap(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function muatTabelAkun() {
const box = $('tabelAkun');
if (!box) return;
try {
const res = await panggilCepat('getDaftarAkun', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Akses ditolak', res.message); return; }
AppState.dataAkun = res.data;
buatTabel({
id: 'akun', mount: 'tabelAkun', idPrefix: 'ak',
judulEkspor: 'Akun Pengguna',
data: res.data, kunciPilih: 'ID', sortAwal: 'Username',
cariField: ['Username', 'Nama', 'Role', 'Email', 'Tertaut'],
kosong: { ikon: 'manage_accounts', judul: 'Belum ada akun', desc: '' },
kolom: [
{ k: 'Username', label: 'Username', sortable: true,
render: r => `<div class="td-strong">${esc(r.Username)}</div>
<div class="td-sub">${esc(r.Email || 'email belum ditautkan')}</div>` },
{ k: 'Nama', label: 'Nama', sortable: true },
{ k: 'Role', label: 'Peran', sortable: true,
render: r => `<span class="chip ${r.Role === 'admin' ? 'chip-info' :
r.Role === 'guru' ? 'chip-success' : 'chip-neutral'}">${esc(r.Role)}</span>` },
{ k: 'Aktif', label: 'Status', sortable: true,
render: r => chipStatus(String(r.Aktif) === 'Ya' ? 'Aktif' : 'Nonaktif') },
{ k: 'TerakhirLogin', label: 'Terakhir Masuk', sortable: true,
render: r => r.TerakhirLogin ? esc(r.TerakhirLogin) : '<span class="td-sub">belum pernah</span>' }
],
aksi: r => `
<button class="btn-icon" aria-label="Lihat detail akun"
onclick="lihatDetailAkun('${esc(r.ID)}')"><span class="mi">visibility</span></button>
<button class="btn-icon" aria-label="Reset password"
onclick="bukaResetPassword('${esc(r.ID)}','${esc(r.Username)}')"><span class="mi">lock_reset</span></button>
<button class="btn-icon danger" aria-label="Hapus akun" ${r.DiriSendiri ? 'disabled' : ''}
onclick="hapusAkunUI('${esc(r.ID)}','${esc(r.Username)}')"><span class="mi">delete</span></button>`
});
} catch (err) {
box.innerHTML = emptyState('error', 'Gagal memuat akun', err.message);
}
}
function lihatDetailAkun(id) {
const a = (AppState.dataAkun || []).find(x => x.ID === id);
if (!a) return;
const baris = [['Username', a.Username], ['Nama', a.Nama || '—'], ['Peran', a.Role],
['Data Tertaut', a.Tertaut], ['Email Google', a.Email || 'belum ditautkan'],
['Nomor HP', a.NoHP || '—'], ['Status', a.Aktif === 'Ya' ? 'Aktif' : 'Nonaktif'],
['Terakhir Masuk', a.TerakhirLogin || 'belum pernah']];
bukaModal('Detail Akun', `
<div style="text-align:center;margin-bottom:16px">
<div class="avatar avatar-lg" style="margin:0 auto 10px;width:70px;height:70px;font-size:26px">
${a.Foto ? `<img src="${esc(a.Foto)}" alt="Foto profil">` : esc((a.Nama || a.Username || '?').charAt(0).toUpperCase())}
</div>
<div style="font-size:17px;font-weight:700">${esc(a.Nama || a.Username)}</div>
</div>
<div class="list">${baris.map(([l, v]) => `
<div class="list-item"><div class="list-main">
<div class="data-label">${esc(l)}</div><div class="data-value">${esc(v)}</div></div></div>`).join('')}</div>`,
[{ label: 'Tutup', kelas: 'btn-outline', aksi: tutupModal },
{ label: a.Aktif === 'Ya' ? '<span class="mi">block</span> Nonaktifkan' : '<span class="mi">check</span> Aktifkan',
kelas: a.Aktif === 'Ya' ? 'btn-danger' : 'btn-success',
aksi: () => ubahStatusAkunUI(a.ID, a.Aktif !== 'Ya') }]);
}
async function ubahStatusAkunUI(id, aktif) {
tampilkanSibuk('Memperbarui status…');
try {
const res = await panggil('ubahStatusAkun', AppState.sessionToken, id, aktif);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error');
if (res.success) { tutupModal(); muatTabelAkun(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function hapusAkunUI(id, username) {
const ya = await konfirmasi('Hapus Akun',
`Akun "${username}" akan dihapus permanen. Data siswa/guru yang tertaut tidak ikut terhapus. Lanjutkan?`);
if (!ya) return;
tampilkanSibuk('Menghapus akun…');
try {
const res = await panggil('hapusAkun', AppState.sessionToken, id);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6000);
if (res.success) muatTabelAkun();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function bukaFormAkunBaru() {
tampilkanSibuk('Menyiapkan formulir…');
try {
const res = await panggil('formAkunBaru', AppState.sessionToken);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error'); return; }
bukaModal('Tambah Akun Pengguna', res.data,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">person_add</span> Buat Akun', kelas: 'btn-primary', aksi: kirimAkunBaru }]);
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
async function gantiPeranAkunBaru() {
const role = $('akRole').value;
const wrap = $('akTautWrap');
wrap.hidden = (role === 'admin');
if (role === 'admin') return;
try {
const res = await panggil('getOpsiPenautan', AppState.sessionToken, role);
const sel = $('akRefId');
if (!sel) return;
sel.innerHTML = (res.success && res.data.length)
? '<option value="">— Pilih data —</option>' + res.data.map(x =>
`<option value="${esc(x.id)}" data-nama="${esc(x.nama)}">${esc(x.nama)} (${esc(x.kode)})</option>`).join('')
: '<option value="">Semua data sudah memiliki akun</option>';
sel.onchange = () => {
const opt = sel.options[sel.selectedIndex];
if (opt && opt.dataset.nama && $('akNama')) $('akNama').value = opt.dataset.nama;
};
} catch (e) {}
}
async function kirimAkunBaru() {
const payload = {
role: $('akRole').value, refId: $('akRefId') ? $('akRefId').value : '',
nama: $('akNama').value.trim(), username: $('akUsername').value.trim(),
password: $('akPassword').value, email: $('akEmail').value.trim(), noHp: $('akNoHp').value.trim()
};
$('errAkun').textContent = '';
if (payload.username.length < 3) { $('errAkun').textContent = 'Username minimal 3 karakter.'; return; }
if (payload.password.length < 6) { $('errAkun').textContent = 'Password minimal 6 karakter.'; return; }
tampilkanSibuk('Membuat akun…');
try {
const res = await panggil('buatAkunBaru', AppState.sessionToken, payload);
sembunyikanSibuk();
if (!res.success) { $('errAkun').textContent = res.message; return; }
tutupModal();
toast(res.message, 'success', 5500);
muatTabelAkun();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}
function bukaResetPassword(akunId, username) {
bukaModal('Reset Password — ' + username, `
<div class="alert alert-warning" style="margin-bottom:16px">
<span class="mi">warning</span>
<div><strong>Perhatian</strong>
<p>Password lama akan langsung diganti. Sampaikan password baru kepada pengguna
dan minta mereka menggantinya sendiri setelah masuk.</p></div>
</div>
<div class="field">
<label class="field-label" for="rsPass">Password Baru</label>
<input class="field-input" id="rsPass" type="text" minlength="6" value="${esc(username)}">
<p class="field-help">Minimal 6 karakter.</p>
<div class="field-error" id="errRsPass"></div>
</div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">lock_reset</span> Reset Password', kelas: 'btn-danger',
aksi: async () => {
const p = $('rsPass').value;
if (!p || p.length < 6) { $('errRsPass').textContent = 'Minimal 6 karakter.'; return; }
tampilkanSibuk('Mereset password…');
try {
const res = await panggil('resetPassword', AppState.sessionToken, akunId, p);
sembunyikanSibuk();
if (!res.success) { $('errRsPass').textContent = res.message; return; }
tutupModal();
toast('Password ' + username + ' berhasil direset.', 'success');
muatTabelAkun();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
} }]);
}
async function mulaiAplikasi() {
const batasBoot = setTimeout(() => {
if (splashMasihTampil()) {
tampilkanGalatFatal('Aplikasi tidak merespons dalam 20 detik. ' +
'Periksa koneksi internet Anda, lalu muat ulang halaman.');
}
}, 20000);
try {
terapkanTema(Simpanan.ambil('tema') || 'light');
if ($('footerYear')) $('footerYear').textContent = new Date().getFullYear();
document.addEventListener('keydown', e => {
if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
e.preventDefault();
if (AppState.sessionToken) {
if ($('cmdk').hidden) bukaPencarianGlobal(); else tutupPencarianGlobal();
}
return;
}
if (!$('cmdk').hidden) {
if (e.key === 'Escape') { e.preventDefault(); tutupPencarianGlobal(); return; }
if (e.key === 'ArrowDown') { e.preventDefault(); navigasiPencarian(1); return; }
if (e.key === 'ArrowUp') { e.preventDefault(); navigasiPencarian(-1); return; }
if (e.key === 'Enter') { e.preventDefault(); pilihHasilPencarian(AppState.cmdkIndex); return; }
}
if (e.key === 'Escape') {
if (!$('modalPreview').hidden) { tutupPratinjau(); return; }
if (!$('modal').hidden) { tutupModal(); return; }
tutupMenuProfil();
}
});
const inp = $('cmdkInput');
if (inp) inp.addEventListener('input', () => cariGlobalDebounce(inp.value));
document.addEventListener('click', e => {
const menu = document.querySelector('.avatar-menu');
if (menu && !menu.contains(e.target)) tutupMenuProfil();
});
document.addEventListener('visibilitychange', () => {
if (!document.hidden) return;
hentikanKamera();
if (typeof setelKontrolKamera === 'function' && !AppState.fotoTerambil) setelKontrolKamera('mati');
});
window.addEventListener('beforeunload', () => { hentikanKamera(); hentikanPantauLokasi(); });
const token = Simpanan.ambil('sesi');
if (token) {
AppState.sessionToken = token;
try {
await muatBootstrap();
clearTimeout(batasBoot);
sembunyikanSplash();
await navigateTo('beranda');
return;
} catch (e) {
console.warn('Sesi lama tidak dapat dipulihkan:', e);
Simpanan.hapus('sesi');
AppState.sessionToken = null;
}
}
tampilkanKerangkaAplikasi(false);
clearTimeout(batasBoot);
sembunyikanSplash();
await navigateTo('login');
} catch (e) {
clearTimeout(batasBoot);
console.error('Boot gagal:', e);
tampilkanGalatFatal(e.message || 'Terjadi kesalahan saat memulai aplikasi.');
}
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', mulaiAplikasi);
} else {
mulaiAplikasi();
}

// ── Pemeriksa integritas penempatan (menu Pengaturan) ──────
async function periksaPenempatan() {
const box = $('boxIntegritas');
if (!box) return;
box.innerHTML = memuatInline('Memeriksa data penempatan…');
try {
const res = await panggil('periksaIntegritasPenempatan', AppState.sessionToken);
if (!res.success) { box.innerHTML = emptyState('block', 'Gagal memeriksa', res.message); return; }
const d = res.data;
if (d.sehat) {
box.innerHTML = `<div class="alert alert-success"><span class="mi">check_circle</span>
<div><strong>Semua sesuai</strong>
<p>${d.penempatanAktif} penempatan aktif, tanpa penempatan ganda, dan seluruh kuota tempat PKL
sudah cocok dengan jumlah siswa yang ditempatkan.</p></div></div>`;
return;
}
const yatim = d.yatim || [];
box.innerHTML = `
${yatim.length ? `<div class="alert alert-error"><span class="mi">link_off</span>
<div><strong>Penempatan tanpa tempat PKL</strong>
<p>Siswa berikut masih berstatus PKL aktif, tetapi tempat PKL-nya sudah dihapus dari daftar.
Selama begini mereka tidak dapat presensi dan tidak dapat dihapus dari Data Siswa.</p>
<ul style="margin:8px 0 0 18px">${yatim.map(y => `<li>${esc(y.nama)}</li>`).join('')}</ul>
<div class="btn-row" style="margin-top:12px">
<button class="btn btn-primary btn-sm" onclick="tutupYatim()">
<span class="mi">link_off</span> Tutup Penempatan Ini</button></div>
<p style="margin-top:10px;font-size:13px">Setelah ditutup, siswa kembali berstatus belum
ditempatkan — silakan tempatkan ulang lewat menu Pendaftaran, atau hapus datanya bila memang
tidak terpakai.</p></div></div>` : ''}
${d.gandaSiswa.length ? `<div class="alert alert-error" style="margin-top:12px"><span class="mi">error</span>
<div><strong>Penempatan ganda ditemukan</strong>
<p>Siswa berikut memiliki lebih dari satu penempatan aktif. Buka menu Monitoring, lalu tutup
penempatan yang tidak dipakai lewat perpindahan, agar presensinya tidak salah lokasi.</p>
<ul style="margin:8px 0 0 18px">${d.gandaSiswa.map(g =>
`<li>${esc(g.nama)} — ${g.jumlah} penempatan aktif</li>`).join('')}</ul></div></div>` : ''}
${d.kuotaMeleset.length ? `<div class="alert alert-warning" style="margin-top:12px">
<span class="mi">warning</span>
<div><strong>Kuota tidak sinkron</strong>
<p>Angka kuota terisi berbeda dengan jumlah penempatan aktif yang sebenarnya.</p>
<ul style="margin:8px 0 0 18px">${d.kuotaMeleset.map(k =>
`<li>${esc(k.nama)} — tercatat ${k.tercatat}, sebenarnya ${k.sebenarnya}</li>`).join('')}</ul>
<div class="btn-row" style="margin-top:12px">
<button class="btn btn-primary btn-sm" onclick="selaraskanKuota()">
<span class="mi">sync</span> Selaraskan Kuota</button></div></div></div>` : ''}`;
} catch (err) { box.innerHTML = emptyState('error', 'Gagal memeriksa', err.message); }
}
async function selaraskanKuota() {
const ya = await konfirmasi('Selaraskan Kuota',
'Angka kuota terisi setiap tempat PKL akan dihitung ulang dari jumlah penempatan aktif. ' +
'Data penempatan siswa tidak diubah. Lanjutkan?', 'Ya, selaraskan', 'btn-primary');
if (!ya) return;
tampilkanSibuk('Menyelaraskan kuota…');
try {
const res = await panggil('selaraskanKuotaTempat', AppState.sessionToken);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 5500);
if (res.success) { batalkanPaketData(); periksaPenempatan(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}


async function tutupYatim() {
const ya = await konfirmasi('Tutup Penempatan Tanpa Tempat PKL',
'Penempatan yang tempat PKL-nya sudah dihapus akan ditutup. Siswa kembali berstatus belum ' +
'ditempatkan, dan presensi maupun jurnal yang sudah tercatat tidak ikut dihapus. Lanjutkan?',
'Ya, tutup', 'btn-primary');
if (!ya) return;
tampilkanSibuk('Menutup penempatan…');
try {
const res = await panggil('tutupPenempatanYatim', AppState.sessionToken);
sembunyikanSibuk();
toast(res.message, res.success ? 'success' : 'error', 6500);
if (res.success) { batalkanPaketData(); periksaPenempatan(); }
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

window.__blok = 6;
window.__SIMPKL_EOF = '3.0';

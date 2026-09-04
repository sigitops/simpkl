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
box.innerHTML = memuatInline('Mengambil daftar sertifikat…');
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
bukaModal('Pengumuman', memuatInline('Mengambil pengumuman…'), []);
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
// Pendengar global hanya boleh dipasang SEKALI seumur halaman.
//
// Dulu semuanya berada di dalam mulaiAplikasi(), dan mulaiAplikasi() dipanggil
// lagi setiap kali tombol "Coba Lagi" ditekan. Setiap percobaan menambah satu
// set pendengar keydown dan click baru di atas yang lama, sehingga sesudah
// beberapa kali gagal, satu tekan Esc menutup modal berkali-kali dan pencarian
// global berkedip. Sekarang pemasangannya dijaga penanda.
let PENDENGAR_TERPASANG = false;
function pasangPendengarGlobal() {
if (PENDENGAR_TERPASANG) return;
PENDENGAR_TERPASANG = true;
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
}

let BOOT_SEDANG_JALAN = false;
async function mulaiAplikasi() {
if (BOOT_SEDANG_JALAN) return;
// Diperiksa sebelum apa pun tergambar. Meneruskan boot dengan CSS atau JS
// versi lama hanya menghasilkan layar yang salah tapi meyakinkan.
if (jagaVersiAset()) return;
bersihkanKerangkaLama();
BOOT_SEDANG_JALAN = true;
// Splash dimunculkan lagi supaya percobaan ulang terlihat sedang bekerja dan
// supaya penjaga galat global tahu aplikasi masih dalam tahap boot.
const splash = $('bootLoader');
if (splash) splash.hidden = false;
const batasBoot = setTimeout(() => {
if (splashMasihTampil()) {
tampilkanGalatFatal('Server tidak menjawab dalam 30 detik.', 'jaringan');
}
}, 30000);
try {
terapkanTema(Simpanan.ambil('tema') || 'light');
if ($('footerYear')) $('footerYear').textContent = new Date().getFullYear();
pasangPendengarGlobal();
const token = Simpanan.ambil('sesi');
if (token) {
AppState.sessionToken = token;
try {
await muatBootstrap();
clearTimeout(batasBoot);
// Splash bertahan sampai dashboard tergambar, bukan sampai datanya tiba.
await navigateTo('beranda');
sembunyikanSplash();
return;
} catch (e) {
// Pembedaan yang dahulu tidak ada, dan itulah inti masalahnya.
//
// Blok ini dulu selalu menjalankan Simpanan.hapus('sesi'). Artinya satu
// permintaan yang tidak sampai ke server — koneksi mati sedetik sesudah
// ponsel bangun, misalnya — sudah cukup untuk mengeluarkan pengguna dari
// aplikasi, padahal sesinya masih sah sepenuhnya. Token hanya dibuang
// bila server benar-benar MENJAWAB bahwa sesi itu tidak berlaku.
if (iniGalatJaringan(e)) {
console.warn('Server belum dapat dihubungi saat memulihkan sesi:', e.message);
clearTimeout(batasBoot);
tampilkanGalatFatal(e.message, 'jaringan');
return;
}
console.warn('Sesi lama ditolak server:', e && e.message);
Simpanan.hapus('sesi');
AppState.sessionToken = null;
}
}
tampilkanKerangkaAplikasi(false);
clearTimeout(batasBoot);
await navigateTo('login');
sembunyikanSplash();
} catch (e) {
clearTimeout(batasBoot);
console.error('Boot gagal:', e);
tampilkanGalatFatal(e && e.message || 'Terjadi kesalahan saat memulai aplikasi.',
iniGalatJaringan(e) ? 'jaringan' : undefined);
} finally {
BOOT_SEDANG_JALAN = false;
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
${(d.hariKerjaMeragukan || []).length ? `<div class="alert alert-warning" style="margin-top:12px">
<span class="mi">event_busy</span>
<div><strong>Hari kerja tidak terbaca</strong>
<p>Kolom <em>Hari Kerja</em> di tempat PKL berikut tidak dapat ditafsirkan, jadi sistem memakai
Senin–Jumat. Bila hari kerja sebenarnya berbeda, siswa akan tercatat Alpha pada hari yang
sebetulnya libur — atau sebaliknya, tidak pernah Alpha pada hari yang seharusnya masuk.</p>
<ul style="margin:8px 0 0 18px">${d.hariKerjaMeragukan.map(h =>
`<li><strong>${esc(h.nama)}</strong> — tertulis “${esc(h.teks || '(kosong)')}”, dipakai sebagai
${esc(h.dipakai)}${h.siswa ? ` · ${h.siswa} siswa aktif` : ''}</li>`).join('')}</ul>
<p style="margin-top:10px;font-size:13px">Perbaiki lewat menu Tempat PKL. Yang dikenali antara
lain <code>Senin-Jumat</code>, <code>Senin s/d Sabtu</code>, <code>Setiap Hari</code>,
<code>Senin, Rabu, Jumat</code>, dan <code>Senin-Sabtu, Minggu libur</code>.</p>
<div class="btn-row" style="margin-top:12px">
<button class="btn btn-outline btn-sm" onclick="navigateTo('kelola-tempat')">
<span class="mi">domain</span> Buka Tempat PKL</button></div></div></div>` : ''}
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


// ══════════════════════════════════════════════════════════
// JADWAL SHIFT
//
// Kisi bulanan: baris siswa, kolom tanggal. Perubahan dikumpulkan dulu di
// memori dan baru dikirim saat tombol Simpan ditekan — satu perjalanan server
// untuk tiga puluh sel, bukan tiga puluh perjalanan.
// ══════════════════════════════════════════════════════════
const Jadwal = { data: null, ubah: {}, bulan: '' };

function bulanIniIso() {
const d = new Date();
return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}

function initJadwalShift() {
const inp = $('jsBulan');
if (inp && !inp.value) inp.value = Jadwal.bulan || bulanIniIso();
muatJadwalShift();
}

function geserBulanJadwal(arah) {
const inp = $('jsBulan');
if (!inp) return;
const p = String(inp.value || bulanIniIso()).split('-');
const d = new Date(Number(p[0]), Number(p[1]) - 1 + arah, 1);
inp.value = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
muatJadwalShift();
}

async function muatJadwalShift() {
const kotak = $('jsKisi');
if (!kotak) return;
const bulan = ($('jsBulan') || {}).value || bulanIniIso();
if (Object.keys(Jadwal.ubah).length && bulan !== Jadwal.bulan) {
const lanjut = await konfirmasi('Perubahan belum disimpan',
'Ada perubahan jadwal yang belum disimpan. Berpindah bulan akan membuangnya. Lanjutkan?',
'Ya, buang perubahan', 'btn-danger');
if (!lanjut) { $('jsBulan').value = Jadwal.bulan; return; }
}
Jadwal.ubah = {};
Jadwal.bulan = bulan;
setelTombolSimpanJadwal();
kotak.innerHTML = memuatInline('Mengambil jadwal…');
try {
const res = await panggilCepat('getJadwalShift', AppState.sessionToken, bulan);
if (!res.success) { kotak.innerHTML = emptyState('block', 'Tidak dapat memuat', res.message); return; }
Jadwal.data = res.data;
gambarKisiJadwal();
} catch (err) {
kotak.innerHTML = emptyState('wifi_off', 'Gagal memuat jadwal', err.message);
}
}

function gambarKisiJadwal() {
const kotak = $('jsKisi');
const d = Jadwal.data;
if (!kotak || !d) return;

if (!d.siswa.length) {
const wadahKosong = $('jsEksporWrap');
if (wadahKosong) wadahKosong.hidden = true;
kotak.innerHTML = emptyState('event_busy', 'Belum ada siswa bershift',
'Jadwal hanya berlaku untuk siswa yang ditempatkan di tempat PKL dengan sistem shift aktif. ' +
'Aktifkan sistem shift lewat menu Tempat PKL terlebih dahulu.');
setelRingkasJadwal();
return;
}

const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
// Tanggal hari ini ditandai supaya mata langsung menemukan kolom yang paling
// sering dicari — pada kisi selebar tiga puluh satu kolom, itu menghemat lebih
// banyak waktu daripada hiasan mana pun.
const kunciHariIni = new Date().getFullYear() + '-' +
  ('0' + (new Date().getMonth() + 1)).slice(-2) + '-' +
  ('0' + new Date().getDate()).slice(-2);

const kepala = [];
for (let i = 1; i <= d.jumlahHari; i++) {
const iso = d.bulan + '-' + ('0' + i).slice(-2);
const tgl = new Date(iso + 'T00:00:00Z');
const hd = tgl.getUTCDay();
kepala.push('<th class="js-tgl' + (hd === 0 || hd === 6 ? ' js-pekan' : '') +
(iso === kunciHariIni ? ' js-kini' : '') + '"' +
(iso === kunciHariIni ? ' aria-current="date"' : '') + '>' +
'<span class="js-hari">' + hari[hd] + '</span><span class="js-angka">' + i + '</span></th>');
}

const baris = d.siswa.map(function (s) {
const opsi = d.shiftPerTempat[s.tempatId] || [];
const sel = [];
let terisiBaris = 0, perluBaris = 0;
for (let i = 1; i <= d.jumlahHari; i++) {
const kol = 'T' + ('0' + i).slice(-2);
const iso = d.bulan + '-' + ('0' + i).slice(-2);
const nilai = kunciUbah(s.siswaId, kol) in Jadwal.ubah
  ? Jadwal.ubah[kunciUbah(s.siswaId, kol)] : (s.isi[kol] || '');
const diubah = kunciUbah(s.siswaId, kol) in Jadwal.ubah;
const tgl = new Date(iso + 'T00:00:00Z');
const akhirPekan = tgl.getUTCDay() === 0 || tgl.getUTCDay() === 6;
const kerja = hariKerjaSiswa(s, tgl.getUTCDay());
if (kerja) { perluBaris++; if (nilai) terisiBaris++; }
// Warna sel mengikuti urutan shift, bukan kodenya, supaya sekolah bebas
// memberi nama apa pun tanpa kehilangan pembedaan visualnya.
const urut = opsi.findIndex(function (o) { return o.kode === nilai; });
sel.push('<td class="js-sel' + (akhirPekan ? ' js-pekan' : '') +
  (iso === kunciHariIni ? ' js-kini' : '') +
  (nilai ? ' js-terisi js-warna-' + ((urut % 4) + 1) : '') +
  (diubah ? ' js-diubah' : '') +
  (kerja && !nilai ? ' js-kosong' : '') + '"' +
  (kerja ? ' data-kerja="1"' : '') + ' data-tempat="' + esc(s.tempatId) + '">' +
  '<select class="js-pilih" aria-label="Shift ' + esc(s.nama) + ' tanggal ' + i + '"' +
  (d.bolehUbah ? '' : ' disabled') +
  ' onchange="ubahSelJadwal(\'' + esc(s.siswaId) + '\',\'' + kol + '\',this.value,this)">' +
  '<option value=""' + (nilai ? '' : ' selected') + '>–</option>' +
  opsi.map(function (o) {
    return '<option value="' + esc(o.kode) + '"' + (nilai === o.kode ? ' selected' : '') + '>' +
      esc(o.kode) + '</option>';
  }).join('') +
  '</select></td>');
}
const lengkap = perluBaris > 0 && terisiBaris === perluBaris;
return '<tr><th class="js-nama">' +
  '<div class="js-nama-baris"><span class="js-avatar">' + esc(inisialNama(s.nama)) + '</span>' +
  '<span class="js-nama-teks"><span class="js-nama-utama">' + esc(s.nama) + '</span>' +
  '<span class="js-nama-kaki"><span class="js-nama-sub">' + esc(s.kelas) + ' · ' + esc(s.tempat) +
  '</span><span class="js-hitung' + (lengkap ? ' lengkap' : '') +
  '" title="Hari kerja yang sudah terjadwal">' + terisiBaris + '/' + perluBaris + '</span></span>' +
  '</span></div></th>' + sel.join('') + '</tr>';
});

// Legenda kode shift supaya kolom sesempit ini tetap terbaca.
const semuaShift = {};
Object.keys(d.shiftPerTempat).forEach(function (t) {
(d.shiftPerTempat[t] || []).forEach(function (o, i) {
  semuaShift[o.kode] = { teks: o.nama + ' · ' + o.jamMasuk + '–' + o.jamPulang, urut: (i % 4) + 1 };
});
});
const legenda = Object.keys(semuaShift).map(function (k) {
return '<span class="js-legenda"><b class="js-warna-' + semuaShift[k].urut + '">' + esc(k) +
  '</b> ' + esc(semuaShift[k].teks) + '</span>';
}).join('') +
'<span class="js-legenda js-legenda-kosong"><b>–</b> belum dijadwalkan</span>';

const wadahEkspor = $('jsEksporWrap');
if (wadahEkspor) wadahEkspor.hidden = false;

kotak.innerHTML =
'<div class="js-legenda-bar">' + legenda + '</div>' +
'<div class="table-wrap js-gulir"><table class="data-table js-kisi">' +
'<thead><tr><th class="js-nama">Siswa</th>' + kepala.join('') + '</tr></thead>' +
'<tbody>' + baris.join('') + '</tbody></table></div>';
setelRingkasJadwal();
}

/**
 * Hari kerja seorang siswa pada hari tertentu (0 = Minggu).
 *
 * Yang dipakai lebih dulu adalah `hariKerjaAngka` yang DIKIRIM SERVER — hasil
 * hariKerjaSet() yang sama persis dengan yang dipakai untuk menghitung Alpha dan
 * meter kemajuan. Dengan begitu tidak ada dua penafsiran atas satu kolom teks.
 *
 * Penguraian di klien hanya cadangan untuk Kode.gs yang belum mengirim bidang
 * itu, dan sengaja dipertahankan sebagai kembaran yang diuji.
 */
function hariKerjaSiswa(s, hariAngka) {
if (s && Object.prototype.toString.call(s.hariKerjaAngka) === '[object Array]') {
return s.hariKerjaAngka.indexOf(hariAngka) >= 0;
}
return hariKerjaKlien(hariAngka, s ? s.hariKerja : '');
}

/**
 * Kembaran uraiHariKerja()/hariKerjaSet() di Kode.gs — WAJIB menghasilkan
 * himpunan yang sama persis, dan sengaja ditulis mandiri agar uji-kembaran.js
 * dapat menjalankannya berdampingan dengan sisi server tanpa merakit apa pun.
 *
 * Kolom HariKerja adalah teks bebas, dan menafsirkannya dua kali dengan dua
 * penafsir yang "mirip" pernah menghasilkan dua kenyataan berbeda untuk satu
 * siswa: meter berbunyi 22 hari kerja, lencana barisnya 0/4. Sekarang server
 * mengirim hasil penafsirannya (hariKerjaAngka) dan fungsi ini hanya cadangan
 * bila Kode.gs belum tersebar — tetapi cadangan pun harus benar, sebab justru
 * di sela penyebaran itulah selisihnya dulu muncul.
 *
 * @return {number[]} nomor hari 0–6, terurut.
 */
function setHariKerjaKlien(teks) {
const PETA = {
minggu: 0, mingu: 0, mgg: 0, ming: 0, min: 0, ahad: 0, akhad: 0,
senin: 1, senen: 1, sen: 1, snn: 1,
selasa: 2, slasa: 2, sel: 2, sls: 2,
rabu: 3, rebo: 3, rab: 3, rbu: 3,
kamis: 4, kemis: 4, kam: 4, kms: 4,
jumat: 5, jumaat: 5, jumt: 5, jum: 5, jmt: 5,
sabtu: 6, saptu: 6, sab: 6, sbt: 6
};
const PENUH = ['minggu', 'mingu', 'ahad', 'akhad', 'senin', 'senen',
'selasa', 'slasa', 'rabu', 'rebo', 'kamis', 'kemis', 'jumat', 'jumaat', 'sabtu', 'saptu'];
const NEGASI = /\b(?:libur|kecuali|selain|tutup|off)\b/;

const t = String(teks == null ? '' : teks)
.toLowerCase()
.replace(/[‘’ʼ'`´]/g, '')
.replace(/[‐-―−]/g, '-')
.replace(/\s*(?:\bsampai dengan\b|\bsampai\b|\bhingga\b|s\s*\/\s*d|s\s*\.\s*d\s*\.?|\bsd\b|~|→)\s*/g, '-')
.replace(/\s*-\s*/g, '-')
.replace(/-+/g, '-')
.replace(/\s+/g, ' ')
.trim();
if (!t) return [1, 2, 3, 4, 5];

function nomor(potongan) {
const q = String(potongan || '').trim()
.replace(/^(?:(?:hari|setiap|tiap|pada|mulai|dari|jam)\s+)+/, '')
.replace(/[.\s]+$/, '');
return PETA[q] === undefined ? null : PETA[q];
}

function dalam(potongan) {
const p = String(potongan || '').trim();
if (!p) return [];
if (/\bhari kerja\b/.test(p)) return [1, 2, 3, 4, 5];
if (/\b(?:setiap|tiap|semua|full)\b[^]*\bhari\b/.test(p) ||
    /^7\s*hari\b/.test(p) || /\bfulltime\b/.test(p)) return [0, 1, 2, 3, 4, 5, 6];

const hasil = [];
const tambah = function (n) { if (hasil.indexOf(n) < 0) hasil.push(n); };
p.split(/\bdan\b|&|\+/).forEach(function (bagian) {
const q = bagian.trim();
if (!q) return;
const sisi = q.split('-');
if (sisi.length === 2) {
const a = nomor(sisi[0]), b = nomor(sisi[1]);
if (a !== null && b !== null) {
for (let i = a; ; i = (i + 1) % 7) { tambah(i); if (i === b) break; }
return;
}
}
if (sisi.length === 1) {
const satu = nomor(q);
if (satu !== null) { tambah(satu); return; }
}
PENUH.forEach(function (n) { if (q.indexOf(n) >= 0) tambah(PETA[n]); });
});
return hasil;
}

const nyala = [], padam = [];
const kumpul = function (wadah, daftar) {
daftar.forEach(function (n) { if (wadah.indexOf(n) < 0) wadah.push(n); });
};
t.split(/[,;]/).forEach(function (bagian) {
const i = bagian.search(NEGASI);
if (i < 0) { kumpul(nyala, dalam(bagian)); return; }
const depan = bagian.slice(0, i);
const belakang = bagian.slice(i).replace(NEGASI, ' ').trim();
if (!belakang) { kumpul(padam, dalam(depan)); return; }
kumpul(nyala, dalam(depan));
kumpul(padam, dalam(belakang));
});

if (!nyala.length && !padam.length) return [1, 2, 3, 4, 5];
const dasar = nyala.length ? nyala : [0, 1, 2, 3, 4, 5, 6];
const hari = dasar.filter(function (n) { return padam.indexOf(n) < 0; })
.sort(function (a, b) { return a - b; });
return hari.length ? hari : [1, 2, 3, 4, 5];
}

function hariKerjaKlien(hariAngka, teksHariKerja) {
return setHariKerjaKlien(teksHariKerja).indexOf(hariAngka) >= 0;
}

function inisialNama(nama) {
const bagian = String(nama || '?').trim().split(/\s+/);
return ((bagian[0] || '?').charAt(0) + (bagian.length > 1 ? bagian[1].charAt(0) : '')).toUpperCase();
}

function kunciUbah(siswaId, kol) { return siswaId + '|' + kol; }

function ubahSelJadwal(siswaId, kol, kode, elemen) {
const d = Jadwal.data;
if (!d) return;
const s = d.siswa.find(function (x) { return x.siswaId === siswaId; });
const semula = s ? (s.isi[kol] || '') : '';
const k = kunciUbah(siswaId, kol);
const berubah = String(kode || '') !== semula;
if (berubah) Jadwal.ubah[k] = String(kode || '');
else delete Jadwal.ubah[k];

// Selnya dicat ulang di tempat, bukan lewat gambar ulang seluruh kisi.
// Menggambar ulang tiga puluh satu kolom kali sekian siswa pada setiap
// perubahan bukan hanya boros — ia juga merebut fokus dari kotak yang baru
// saja disentuh pengguna, sehingga pengisian berturut-turut jadi tersendat.
const sel = elemen && elemen.parentElement;
if (sel) catSelJadwal(sel, String(kode || ''), berubah);

setelTombolSimpanJadwal();
setelRingkasJadwal();
}

/** Menyesuaikan kelas satu sel kisi tanpa menggambar ulang apa pun. */
function catSelJadwal(sel, kode, belumDisimpan) {
const d = Jadwal.data;
for (let i = 1; i <= 4; i++) sel.classList.remove('js-warna-' + i);
sel.classList.remove('js-terisi', 'js-kosong', 'js-diubah');
if (kode) {
const opsi = (d && d.shiftPerTempat[sel.dataset.tempat]) || [];
const urut = opsi.findIndex(function (o) { return o.kode === kode; });
sel.classList.add('js-terisi', 'js-warna-' + ((Math.max(0, urut) % 4) + 1));
} else if (sel.dataset.kerja === '1') {
sel.classList.add('js-kosong');
}
if (belumDisimpan) sel.classList.add('js-diubah');
}

function setelTombolSimpanJadwal() {
const btn = $('btnSimpanJadwal');
if (!btn) return;
const n = Object.keys(Jadwal.ubah).length;
btn.disabled = n === 0;
btn.innerHTML = '<span class="mi">save</span> ' + (n ? 'Simpan ' + n + ' Perubahan' : 'Simpan Perubahan');
}

/**
 * Kemajuan pengisian ditampilkan sebagai batang, bukan sekadar angka.
 *
 * Angka "42 hari kerja belum dijadwalkan" tidak memberi tahu apakah itu banyak
 * atau sedikit; batang yang terisi separuh langsung menjawabnya tanpa dibaca.
 */
function setelRingkasJadwal() {
const el = $('jsMeter');
const d = Jadwal.data;
if (!el || !d) return;
const ditambah = Object.keys(Jadwal.ubah).filter(function (k) { return !!Jadwal.ubah[k]; }).length;
const dikosongkan = Object.keys(Jadwal.ubah).filter(function (k) { return !Jadwal.ubah[k]; }).length;
const total = d.ringkas.totalHariKerja;
const belum = Math.max(0, Math.min(total, d.ringkas.belumDiisi - ditambah + dikosongkan));
const terisi = total - belum;
if (!total) { el.innerHTML = ''; return; }
const persen = Math.round(terisi / total * 100);
el.innerHTML =
'<div class="meter-teks"><span class="meter-angka">' + persen + '%</span>' +
'<span class="meter-label">' + terisi + ' dari ' + total + ' hari kerja terjadwal</span></div>' +
'<div class="meter-bar" role="progressbar" aria-valuenow="' + persen + '" aria-valuemin="0" aria-valuemax="100">' +
'<span class="meter-isi' + (belum ? '' : ' penuh') + '" style="width:' + persen + '%"></span></div>';
}

// ── EKSPOR JADWAL ──────────────────────────────────────────────────────────
//
// Sengaja menumpang eksporTabel() alih-alih menulis pengekspor sendiri, supaya
// berkas Excel, gaya cetak PDF, nama berkas, dan pesan galatnya sama persis
// dengan menu lain. Yang berbeda hanya bentuk datanya, dan itulah yang disusun
// di sini.
function paketEksporJadwal() {
const d = Jadwal.data;
if (!d || !d.siswa.length) return null;
const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const judul = ['Nama Siswa', 'NIS', 'Kelas', 'Tempat PKL'];
for (let i = 1; i <= d.jumlahHari; i++) {
const t = new Date(d.bulan + '-' + ('0' + i).slice(-2) + 'T00:00:00Z');
judul.push(i + '\n' + hari[t.getUTCDay()]);
}
judul.push('Terjadwal');

const baris = d.siswa.map(function (s) {
const sel = [s.nama, s.nis, s.kelas, s.tempat];
let terisi = 0, perlu = 0;
for (let i = 1; i <= d.jumlahHari; i++) {
const kol = 'T' + ('0' + i).slice(-2);
const k = kunciUbah(s.siswaId, kol);
const nilai = (k in Jadwal.ubah) ? Jadwal.ubah[k] : (s.isi[kol] || '');
const t = new Date(d.bulan + '-' + ('0' + i).slice(-2) + 'T00:00:00Z');
if (hariKerjaSiswa(s, t.getUTCDay())) { perlu++; if (nilai) terisi++; }
sel.push(nilai || '');
}
sel.push(terisi + '/' + perlu);
return sel;
});

const bln = new Date(d.bulan + '-01T00:00:00Z')
.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
return {
nama: 'Jadwal Shift ' + bln,
judul: judul, baris: baris,
// Tiga puluh satu kolom tidak muat dengan padding bawaan; keterangan shift
// ikut dicetak supaya lembarannya dapat dibaca tanpa membuka aplikasi.
gayaTambahan:
'table{font-size:9px;table-layout:fixed}' +
'th,td{padding:3px 2px;text-align:center;word-break:normal}' +
'th:nth-child(-n+4),td:nth-child(-n+4){text-align:left;padding:4px 6px}' +
'th:first-child,td:first-child{width:15%}' +
'th:nth-child(4),td:nth-child(4){width:14%}' +
'.sub{margin-bottom:8px}'
};
}

function eksporJadwalShift(format) {
const paket = paketEksporJadwal();
const menu = $('jsEksporMenu');
if (menu) menu.hidden = true;
if (!paket) { toast('Belum ada jadwal untuk diekspor.', 'warning'); return; }
eksporTabel('js', format, paket);
}

async function simpanPerubahanJadwal() {
const kunci = Object.keys(Jadwal.ubah);
if (!kunci.length) return;
const perubahan = kunci.map(function (k) {
const p = k.split('|');
return { siswaId: p[0], tanggal: p[1], kode: Jadwal.ubah[k] };
});
tampilkanSibuk('Menyimpan ' + perubahan.length + ' perubahan…');
try {
const res = await panggil('simpanJadwalShift', AppState.sessionToken, Jadwal.bulan, perubahan);
sembunyikanSibuk();
if (!res.success) { toast(res.message, 'error', 6500); return; }
toast(res.message, 'success', 6000);
Jadwal.ubah = {};
batalkanPaketData();
lupakanKunci('getJadwalShift', [AppState.sessionToken, Jadwal.bulan]);
await muatJadwalShift();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

function bukaIsiMassalShift() {
const d = Jadwal.data;
if (!d || !d.siswa.length) { toast('Belum ada siswa bershift untuk dijadwalkan.', 'warning'); return; }
const semuaShift = {};
Object.keys(d.shiftPerTempat).forEach(function (t) {
(d.shiftPerTempat[t] || []).forEach(function (o) { semuaShift[o.kode] = o.nama; });
});
const hariNama = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
bukaModal('Isi Jadwal Massal', `
<p class="field-help" style="margin-bottom:16px">Mengisi banyak tanggal sekaligus.
Yang sudah terisi dapat dilewati agar penyesuaian manual Anda tidak tertimpa.</p>

<div class="field">
<label class="field-label">Siswa</label>
<div class="pilih-box" id="imSiswa" style="max-height:200px">
${d.siswa.map(s => `<label class="pilih-baris">
<input type="checkbox" value="${esc(s.siswaId)}" checked>
<span class="pilih-teks"><span class="pilih-nama">${esc(s.nama)}</span>
<span class="pilih-sub">${esc(s.kelas)} &middot; ${esc(s.tempat)}</span></span>
</label>`).join('')}
</div>
</div>

<div class="grid-2">
<div class="field">
<label class="field-label" for="imDari">Dari tanggal</label>
<input class="field-input" id="imDari" type="number" min="1" max="${d.jumlahHari}" value="1">
</div>
<div class="field">
<label class="field-label" for="imSampai">Sampai tanggal</label>
<input class="field-input" id="imSampai" type="number" min="1" max="${d.jumlahHari}" value="${d.jumlahHari}">
</div>
</div>

<div class="field">
<label class="field-label">Hanya pada hari</label>
<div class="chip-pilih" id="imHari">
${hariNama.map((h, i) => `<label class="chip-pilih-item">
<input type="checkbox" value="${i}"${i >= 1 && i <= 5 ? ' checked' : ''}><span>${h}</span></label>`).join('')}
</div>
<p class="field-help">Kosongkan seluruhnya untuk mengenai semua hari.</p>
</div>

<div class="field">
<label class="field-label" for="imKode">Shift</label>
<select class="field-input" id="imKode">
${Object.keys(semuaShift).map(k => `<option value="${esc(k)}">${esc(k)} — ${esc(semuaShift[k])}</option>`).join('')}
<option value="">Kosongkan (hapus jadwal)</option>
</select>
</div>

<label class="pilih-baris" style="margin-top:4px">
<input type="checkbox" id="imLewati" checked>
<span>Lewati tanggal yang sudah terisi</span>
</label>
<div class="field-error" id="errIsiMassal"></div>`,
[{ label: 'Batal', kelas: 'btn-outline', aksi: tutupModal },
{ label: '<span class="mi">grid_on</span> Isi Sekarang', kelas: 'btn-primary', aksi: kirimIsiMassal }]);
}

async function kirimIsiMassal() {
const siswaIds = $$('#imSiswa input:checked').map(function (i) { return i.value; });
if (!siswaIds.length) { $('errIsiMassal').textContent = 'Pilih minimal satu siswa.'; return; }
const dari = Number($('imDari').value) || 1;
const sampai = Number($('imSampai').value) || Jadwal.data.jumlahHari;
if (dari > sampai) { $('errIsiMassal').textContent = 'Rentang tanggal terbalik.'; return; }
const hari = $$('#imHari input:checked').map(function (i) { return Number(i.value); });

tampilkanSibuk('Mengisi jadwal…');
try {
const res = await panggil('isiMassalJadwal', AppState.sessionToken, {
bulan: Jadwal.bulan, siswaIds: siswaIds, dari: dari, sampai: sampai,
hari: hari, kode: $('imKode').value, lewatiTerisi: $('imLewati').checked });
sembunyikanSibuk();
if (!res.success) { $('errIsiMassal').textContent = res.message; return; }
tutupModal();
toast(res.message, 'success', 6000);
Jadwal.ubah = {};
batalkanPaketData();
lupakanKunci('getJadwalShift', [AppState.sessionToken, Jadwal.bulan]);
await muatJadwalShift();
} catch (err) { sembunyikanSibuk(); toast(err.message, 'error'); }
}

window.__blok = 6;
window.__SIMPKL_EOF = '4.8';

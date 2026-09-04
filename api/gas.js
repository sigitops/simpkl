/**
 * PROXY CADANGAN — Vercel Serverless Function.
 *
 * Jalur utama memanggil Apps Script langsung dari browser dengan fetch(). Bila
 * jalur itu gagal berulang kali, `kirimKeServer()` di app1.js mengalihkan
 * permintaan ke sini secara otomatis: /api/gas satu domain dengan halaman,
 * sehingga CORS tidak berlaku sama sekali, dan Vercel meneruskannya ke Apps
 * Script dari sisi server.
 *
 * CATATAN PENTING TENTANG SINTAKS.
 *
 * Berkas ini dahulu ditulis dengan `export default` (ESM). Repo ini tidak punya
 * package.json, jadi Vercel menjalankan berkas .js di folder api/ sebagai
 * CommonJS — dan `export default` adalah galat sintaks di sana. Akibatnya fungsi
 * ini tidak pernah terbangun dan /api/gas menjawab 404, yang baru ketahuan
 * ketika pengalihan otomatis mulai benar-benar memakainya. Karena itu berkas ini
 * sekarang memakai `module.exports`. Jangan diubah ke `export default` kecuali
 * sekalian menambahkan package.json berisi {"type":"module"}.
 */

const URL_EXEC = process.env.SIMPKL_EXEC_URL ||
  'https://script.google.com/macros/s/AKfycbxnO0GrKENLXrEOQNiTeZ4W2KaK91UUGvOZbjI2_UFlIz75BiCidWWo8NSlODvwroXppA/exec';

/**
 * Menerjemahkan halaman HTML Google menjadi sebab yang bisa ditindaklanjuti.
 *
 * Ini bagian terpenting dari berkas ini. Ketika Apps Script gagal, ia tidak
 * membalas JSON melainkan halaman HTML-nya sendiri — dan halaman itu TIDAK
 * membawa header CORS, sehingga di jalur langsung peramban hanya bisa berkata
 * "blocked by CORS policy". Sebab sesungguhnya tidak pernah terlihat dari sisi
 * klien. Proxy inilah satu-satunya tempat yang bisa membacanya, jadi ia tidak
 * boleh membuangnya seperti dulu — dulu ia menebak "kemungkinan penerapan belum
 * dibuat versi barunya", tebakan yang menuntun ke tempat yang salah.
 */
function bacaGalatGoogle(status, teks, alamatAkhir) {
  const t = String(teks || '');
  const kecil = t.toLowerCase();
  let sebab = '';

  if (/service invoked too many times|too many times for one day|quota/.test(kecil)) {
    sebab = 'Kuota harian Apps Script habis. Akun Gmail biasa dibatasi 90 menit ' +
      'total waktu jalan per hari; kuotanya pulih sendiri lewat tengah malam PST.';
  } else if (/exceeded maximum execution time/.test(kecil)) {
    sebab = 'Satu eksekusi Apps Script melewati batas 6 menit dan dihentikan Google.';
  } else if (/authorization is required|authorize|izin/.test(kecil)) {
    sebab = 'Apps Script meminta otorisasi ulang. Buka editor Apps Script, jalankan ' +
      'satu fungsi secara manual, lalu setujui izinnya.';
  } else if (/sign in|masuk dengan akun google|accounts\.google\.com/.test(kecil)) {
    sebab = 'Penerapan meminta login. Setelan Deploy harus "Execute as: Me" dan ' +
      '"Who has access: Anyone".';
  } else if (/unable to open the file|you need permission|tidak dapat membuka/.test(kecil)) {
    sebab = 'Penerapan tidak dapat dibuka. Periksa apakah alamat /exec masih berlaku ' +
      'dan aksesnya masih "Anyone".';
  } else if (/exception|typeerror|referenceerror|is not defined/.test(kecil)) {
    sebab = 'Kode di Kode.gs melempar galat sebelum sempat membalas JSON.';
  }

  // Judul halaman dan sepotong teksnya ikut dibawa: bila polanya tidak dikenali,
  // inilah satu-satunya petunjuk yang tersisa — dan lebih baik daripada tebakan.
  const judul = (t.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  const cuplikan = t.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);

  return 'Apps Script membalas bukan JSON (HTTP ' + status + ').' +
    (sebab ? ' ' + sebab : '') +
    (judul ? ' Judul halaman: "' + judul.trim() + '".' : '') +
    (cuplikan ? ' Isi: "' + cuplikan + '".' : '') +
    (alamatAkhir ? ' Alamat akhir: ' + alamatAkhir : '');
}

module.exports = async function handler(req, res) {
  // GET dipakai sebagai pemeriksaan kesehatan: memanggil /api/gas dari peramban
  // harus menjawab 200 dengan penanda ini. Bila yang muncul 404, berarti fungsi
  // ini belum ikut ter-deploy — periksa apakah folder api/ sudah terdorong ke
  // GitHub, bukan hanya berkas di akar repo.
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(JSON.stringify({ siap: true, proxy: 'SIM PKL', metode: 'POST' }));
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ __galat: 'Hanya menerima POST.' });
  }
  try {
    const isi = (typeof req.body === 'string') ? req.body : JSON.stringify(req.body || {});
    const balas = await fetch(URL_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: isi,
      redirect: 'follow'
    });
    const teks = await balas.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    // Apps Script yang sehat selalu membalas JSON. Bila yang datang halaman HTML
    // Google, meneruskannya apa adanya hanya membuat klien gagal mengurai tanpa
    // tahu sebabnya — jadi diterjemahkan lebih dulu menjadi pesan yang jelas.
    const awal = teks.trim().slice(0, 1);
    if (awal !== '{' && awal !== '[') {
      return res.status(502).send(JSON.stringify({
        __galat: bacaGalatGoogle(balas.status, teks, balas.url)
      }));
    }
    return res.status(200).send(teks);
  } catch (e) {
    return res.status(502).send(JSON.stringify({
      __galat: 'Proxy gagal menghubungi Apps Script: ' + e.message
    }));
  }
};

/**
 * Batas waktu fungsi ini. Vercel memberi 10 detik secara bawaan, sedangkan satu
 * eksekusi Apps Script di aplikasi ini terukur 8–10 detik — persis di garis
 * batas, sehingga proxy kadang dipotong Vercel di tengah jalan dan yang sampai
 * ke pengguna hanya "Server menjawab kode 502" tanpa sebab yang bisa ditelusuri.
 * 60 detik adalah batas tertinggi paket Hobby.
 *
 * Dipasang SESUDAH module.exports diisi — menaruhnya di atas membuatnya tertimpa
 * oleh penugasan handler-nya sendiri, dan setelannya diam-diam tidak berlaku.
 */
module.exports.config = { maxDuration: 60 };

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
    const awal = teks.slice(0, 1).trim();
    if (awal !== '{' && awal !== '[') {
      return res.status(502).send(JSON.stringify({
        __galat: 'Apps Script membalas bukan JSON (kode ' + balas.status + '). ' +
                 'Kemungkinan penerapan belum dibuat versi barunya.'
      }));
    }
    return res.status(200).send(teks);
  } catch (e) {
    return res.status(502).send(JSON.stringify({
      __galat: 'Proxy gagal menghubungi Apps Script: ' + e.message
    }));
  }
};

# 📸 Otomotif × Engineering Photobooth

Website photobooth tema "pastel engineering" (bengkel × blueprint). Vanilla HTML/CSS/JS,
tanpa framework atau build tool — tinggal buka dan jalankan.

## Struktur folder

```
photobooth-otomotif-engineering/
├── index.html          → struktur halaman & semua layar (start, kamera, review, hasil)
├── css/
│   └── style.css        → tema visual pastel engineering, mobile-first
├── js/
│   └── script.js         → logika kamera, countdown, capture, compose canvas, download
└── README.md
```

## Fitur

- Kamera depan/belakang HP langsung dari browser (`getUserMedia`)
- Countdown otomatis 3‑2‑1 sebelum tiap jepretan, 4 foto per sesi
- Retake per foto (tidak perlu ulang semua) di layar review
- 2 format: **Photostrip vertikal** (2×6 inci) dan **Kolase 2×2** (4×6 inci)
- 3 tema frame: Blueprint Navy, Workshop Cream, Garage Sage
- Ekspor PNG kualitas cetak 300 DPI (lossless), siap dibawa ke studio foto
- Mobile‑first, responsif, menangani izin kamera ditolak/tidak tersedia

---

## 1. Menjalankan di VS Code (lokal)

1. Buka folder `photobooth-otomotif-engineering` di VS Code (`File → Open Folder…`).
2. Install extension **Live Server** (oleh Ritwick Dey) dari tab Extensions.
3. Klik kanan `index.html` → **Open with Live Server**.
4. Browser akan terbuka di `http://127.0.0.1:5500` (atau port lain).

> Di komputer sendiri, kamera akan jalan normal karena `localhost` dianggap
> "secure context" oleh browser walau tanpa HTTPS.

## 2. Menguji lewat HP (wajib HTTPS)

Browser di HP **menolak akses kamera** kalau halaman dibuka lewat `http://` biasa
(kecuali `localhost`, yang tidak bisa diakses dari HP lain). Jadi untuk tes di HP,
pakai salah satu cara berikut:

### Cara tercepat — Netlify Drop (tanpa akun, tanpa install apa pun)
1. Buka **https://app.netlify.com/drop** di komputer.
2. Drag & drop folder `photobooth-otomotif-engineering` ke halaman tersebut.
3. Netlify akan memberi link `https://xxxx.netlify.app` dalam beberapa detik.
4. Buka link itu di HP → izinkan kamera saat diminta → selesai.

### Cara permanen — GitHub Pages
1. Buat repo baru di GitHub, upload semua isi folder ini.
2. Masuk ke **Settings → Pages**, pilih branch `main` dan folder `/root`.
3. Tunggu ±1 menit, GitHub memberi link `https://username.github.io/nama-repo/`.
4. Buka link tersebut di HP.

### Cara alternatif — tunnel dari Live Server (ngrok)
1. Jalankan Live Server di VS Code seperti langkah sebelumnya.
2. Install [ngrok](https://ngrok.com/download), lalu jalankan:
   ```
   ngrok http 5500
   ```
3. Ngrok memberi URL `https://xxxx.ngrok-free.app` yang bisa dibuka langsung di HP.

Setelah terbuka di HP:
- Izinkan permintaan **"Izinkan akses kamera?"** saat muncul.
- Jika tombol "Mulai Photobooth" tidak memunculkan gambar kamera, cek:
  - Situs dibuka lewat `https://` (bukan `http://`)?
  - Izin kamera browser untuk situs ini belum diblokir sebelumnya?
  - Tidak ada aplikasi lain yang sedang memakai kamera?

## 3. Tips kualitas cetak

- File hasil download berformat **PNG 300 DPI**, lossless (tidak dikompresi ulang).
- Photostrip = 600×1800 px (2×6"), Kolase 2×2 = 1200×1800 px (4×6").
- Saat mencetak dari aplikasi galeri/printer, pilih **cetak ukuran asli / 100%**
  (jangan "fit to page") supaya DPI tetap akurat.
- Untuk mencetak di studio foto/minilab, file ini sudah siap pakai sesuai ukuran
  standar strip & kolase umum.

## 4. Kustomisasi cepat

Semua angka penting ada di bagian atas `js/script.js`:

| Konstanta | Fungsi |
|---|---|
| `SHOTS_REQUIRED` | jumlah foto per sesi (default 4) |
| `COUNTDOWN_SECONDS` | lama hitung mundur per jepretan |
| `PRINT_DPI` | resolusi ekspor (default 300) |
| `SIZES` | ukuran cetak (inci) per format |
| `FRAME_THEMES` | warna & label tiap tema frame |

Untuk menambah tema frame baru: tambahkan satu entri di objek `FRAME_THEMES`
(di `script.js`) lalu tambahkan satu tombol `.frame-card` baru di `index.html`
dengan `data-frame` yang sama.

## 5. Kompatibilitas browser

Dites berjalan baik di Chrome/Edge (Android) dan Safari (iOS 14.3+), yang
mendukung `getUserMedia`, `canvas.toBlob`, dan `facingMode`. Browser lama atau
WebView tertanam (mis. dalam aplikasi Instagram/TikTok) kadang membatasi akses
kamera — kalau terjadi, buka link di browser utama (Chrome/Safari) langsung.

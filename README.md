# Sistem Ujian Online

Aplikasi web ujian online 3 peran (Admin, Guru, Siswa), dibangun dengan HTML/CSS/JS murni + Firebase (Auth, Firestore, Storage). Bisa dihosting gratis di **GitHub Pages** dan disematkan ke **Blogger** lewat `<iframe>`.

## Struktur folder
```
ujian-online/
├── index.html          # Login (semua peran)
├── admin.html          # Panel admin: kelola guru, siswa, kelas
├── guru.html            # Panel guru: buat ujian, upload soal Excel, rekap hasil
├── siswa.html           # Dashboard siswa: pilih ujian, riwayat nilai
├── ujian.html           # Halaman mengerjakan ujian
├── css/style.css
├── js/
│   ├── firebase-config.js   # ⚠️ WAJIB DIISI dengan config Firebase Anda
│   ├── auth.js
│   ├── admin.js
│   ├── guru.js
│   ├── siswa.js
│   └── ujian.js
├── template/
│   ├── template_soal.xlsx   # Contoh format Excel untuk upload soal
│   └── template_siswa.xlsx  # Contoh format Excel untuk impor massal siswa
├── firestore.rules      # Aturan keamanan database
└── storage.rules        # Aturan keamanan penyimpanan file
```

## 1. Buat project Firebase
1. Buka [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Di dalam project, buka **Build > Authentication** → tab **Sign-in method** → aktifkan **Email/Password**.
3. Buka **Build > Firestore Database** → **Create database** → mode production.
4. Buka **Build > Storage** → **Get started** (untuk arsip file soal asli).
5. Di **Project settings > General**, scroll ke "Your apps" → klik ikon web `</>` → daftarkan app → salin objek `firebaseConfig`.
6. Tempel config tersebut ke `js/firebase-config.js`, menggantikan seluruh isi `GANTI_...`.

## 2. Pasang aturan keamanan
Install [Firebase CLI](https://firebase.google.com/docs/cli), lalu dari folder project ini:
```bash
firebase login
firebase init firestore storage   # pilih project Anda, gunakan file .rules yang sudah ada
firebase deploy --only firestore:rules,storage:rules
```
Atau, cara manual: buka Firestore/Storage di console → tab **Rules** → tempel isi `firestore.rules` / `storage.rules` → **Publish**.

## 3. Buat akun Admin pertama (manual, sekali saja)
Akun admin pertama tidak bisa dibuat lewat aplikasi (karena aplikasi butuh admin untuk membuat akun lain), jadi buat manual:
1. **Authentication > Users > Add user** → isi email & password admin.
2. **Firestore Database > Start collection** → nama koleksi `users`.
3. Buat dokumen dengan **Document ID = UID user** yang barusan dibuat (lihat kolom UID di tab Users).
4. Isi field: `nama` (string), `email` (string), `role` (string, isi persis `admin`).
5. Simpan. Sekarang login ke `index.html` dengan email/password tadi akan masuk ke panel admin.

## 4. Alur pemakaian
1. **Admin** login → buat data **Kelas** (nama, jurusan, prodi) → buat akun **Guru** dan **Siswa** (satu per satu atau impor massal siswa via `template_siswa.xlsx`).
2. **Guru** login → buat **Ujian** (judul, durasi, kelas tujuan) → buka **Kelola Soal** → upload file Excel soal (format sama seperti `template_soal.xlsx`) → klik **Aktifkan untuk Siswa**.
3. **Siswa** login → lihat ujian yang aktif untuk kelasnya di dashboard → **Mulai Ujian** → mengerjakan dengan tampilan interaktif (timer, navigasi soal, progress bar) → nilai langsung dihitung otomatis saat dikumpulkan.
4. **Guru** membuka tab **Rekap Hasil** untuk melihat nilai semua siswa per ujian, bisa difilter per kelas/jurusan, lengkap dengan rata-rata, nilai tertinggi, dan terendah.

## 5. Format Excel soal (wajib nama kolom persis sama)
| Pertanyaan | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Kunci Jawaban | Poin |
|---|---|---|---|---|---|---|
| Ibu kota Indonesia adalah... | Jakarta | Bandung | Surabaya | Medan | A | 10 |

- **Kunci Jawaban** diisi salah satu huruf: A, B, C, atau D.
- **Poin** adalah bobot nilai soal tersebut (boleh berbeda-beda tiap soal). Nilai akhir dihitung otomatis: `(total poin benar / total semua poin) x 100`.
- Mengunggah file baru ke ujian yang sama akan **mengganti seluruh soal** ujian tersebut.

## 6. Deploy ke GitHub Pages
```bash
git init
git add .
git commit -m "Sistem ujian online"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
Lalu di GitHub: **Settings > Pages > Source: Deploy from branch > main / (root)** → simpan. Situs akan aktif di `https://USERNAME.github.io/NAMA-REPO/`.

## 7. Sematkan ke Blogger (iframe)
Di editor HTML postingan/halaman Blogger, tempel:
```html
<iframe src="https://USERNAME.github.io/NAMA-REPO/" width="100%" height="800" style="border:none;"></iframe>
```
> Catatan: beberapa browser membatasi cookie/pop-up pihak ketiga di dalam iframe. Jika login bermasalah saat diakses lewat Blogger, sediakan juga tombol "Buka di tab baru" yang mengarah langsung ke link GitHub Pages-nya.

## Catatan keamanan & batasan
- Menghapus "profil" guru/siswa dari panel Admin hanya menghapus data di Firestore, **bukan** akun login di Authentication. Untuk menonaktifkan login sepenuhnya, hapus juga manual di **Authentication > Users**.
- Tidak ada batas hardware/IP untuk mencegah kecurangan (buka tab lain, dsb.) — ini adalah aplikasi client-side murni. Untuk kebutuhan ujian resmi/berisiko tinggi, pertimbangkan tambahan seperti proctoring browser lockdown.
- Firestore free tier (Spark plan) cukup untuk penggunaan sekolah skala kecil–menengah; pantau kuota di Firebase Console jika jumlah siswa besar.

// ============================================================
// GANTI seluruh isi objek di bawah ini dengan config project
// Firebase Anda sendiri.
// Cara ambil: Firebase Console > Project Settings > General >
// scroll ke "Your apps" > pilih ikon Web (</>) > copy config.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDX2E4DHy6H1AjQ4YyoHbYq_vqV6lJIWNc",
  authDomain: "ujiansmkcalmv2.firebaseapp.com",
  projectId: "ujiansmkcalmv2",
  storageBucket: "ujiansmkcalmv2.firebasestorage.app",
  messagingSenderId: "480908369627",
  appId: "1:480908369627:web:d779d79ecc313caa4736fe"
};

// App utama (dipakai untuk sesi login yang sedang aktif)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// App kedua khusus dipakai Admin untuk MEMBUAT akun guru/siswa baru
// tanpa mengganti sesi login admin yang sedang aktif.
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = secondaryApp.auth();

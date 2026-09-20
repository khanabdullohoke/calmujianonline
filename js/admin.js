let profile = null;
let kelasCache = []; // {id, nama, jurusan, prodi}

guardPage(["admin"]).then((p) => {
  profile = p;
  fillWhoBadge("whoBadge", p);
  loadKelas();
  loadGuru();
  loadSiswa();
});
setupLogout("logoutBtn");

/* ---------------- tabs ---------------- */
document.querySelectorAll(".tabbar button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabbar button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ["kelas", "guru", "siswa"].forEach((t) => {
      document.getElementById("tab-" + t).style.display = t === btn.dataset.tab ? "block" : "none";
    });
  });
});

/* ================= KELAS ================= */
function loadKelas() {
  db.collection("kelas").orderBy("nama").onSnapshot((snap) => {
    kelasCache = [];
    const tbody = document.querySelector("#tblKelas tbody");
    tbody.innerHTML = "";
    const select = document.getElementById("siswaKelas");
    select.innerHTML = '<option value="">Pilih kelas...</option>';
    snap.forEach((doc) => {
      const k = { id: doc.id, ...doc.data() };
      kelasCache.push(k);
      tbody.innerHTML += `<tr>
        <td>${esc(k.nama)}</td><td>${esc(k.jurusan || "-")}</td><td>${esc(k.prodi || "-")}</td>
        <td><button class="btn btn-sm btn-danger" onclick="hapusKelas('${k.id}')">Hapus</button></td>
      </tr>`;
      select.innerHTML += `<option value="${k.id}">${esc(k.nama)}</option>`;
    });
    document.getElementById("kelasEmpty").style.display = snap.empty ? "block" : "none";
    document.getElementById("statKelas").textContent = kelasCache.length;
    renderSiswaTable(); // kelas names may have changed
  });
}

document.getElementById("btnAddKelas").addEventListener("click", async () => {
  const nama = document.getElementById("kelasNama").value.trim();
  const jurusan = document.getElementById("kelasJurusan").value.trim();
  const prodi = document.getElementById("kelasProdi").value.trim();
  const err = document.getElementById("kelasErr");
  err.classList.remove("show");
  if (!nama) { err.textContent = "Nama kelas wajib diisi."; err.classList.add("show"); return; }
  await db.collection("kelas").add({ nama, jurusan, prodi, dibuatPada: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById("kelasNama").value = "";
  document.getElementById("kelasJurusan").value = "";
  document.getElementById("kelasProdi").value = "";
});

async function hapusKelas(id) {
  if (!confirm("Hapus kelas ini? Siswa yang terdaftar di kelas ini tidak akan ikut terhapus.")) return;
  await db.collection("kelas").doc(id).delete();
}

/* ================= GURU ================= */
let guruCache = [];
function loadGuru() {
  db.collection("users").where("role", "==", "guru").onSnapshot((snap) => {
    guruCache = [];
    const tbody = document.querySelector("#tblGuru tbody");
    tbody.innerHTML = "";
    snap.forEach((doc) => {
      const g = doc.data();
      guruCache.push({ id: doc.id, ...g });
      tbody.innerHTML += `<tr>
        <td>${esc(g.nama)}</td><td>${esc(g.email)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="hapusProfil('${doc.id}')">Hapus profil</button></td>
      </tr>`;
    });
    document.getElementById("guruEmpty").style.display = snap.empty ? "block" : "none";
    document.getElementById("statGuru").textContent = guruCache.length;
  });
}

document.getElementById("btnExportGuru").addEventListener("click", () => {
  if (guruCache.length === 0) { alert("Belum ada data guru untuk diunduh."); return; }
  const rows = guruCache.map((g) => ({ Nama: g.nama, Email: g.email }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Guru");
  XLSX.writeFile(wb, `Daftar_Guru_${tanggalFile()}.xlsx`);
});

document.getElementById("btnAddGuru").addEventListener("click", async () => {
  const nama = document.getElementById("guruNama").value.trim();
  const email = document.getElementById("guruEmail").value.trim();
  const pass = document.getElementById("guruPass").value;
  const err = document.getElementById("guruErr");
  const ok = document.getElementById("guruOk");
  err.classList.remove("show"); ok.classList.remove("show");
  if (!nama || !email || pass.length < 6) {
    err.textContent = "Lengkapi semua kolom. Kata sandi minimal 6 karakter.";
    err.classList.add("show");
    return;
  }
  try {
    // Dibuat lewat secondaryAuth supaya sesi login admin tidak ikut berpindah.
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(cred.user.uid).set({
      nama, email, role: "guru", dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
    });
    await secondaryAuth.signOut();
    ok.textContent = `Akun guru "${nama}" berhasil dibuat.`;
    ok.classList.add("show");
    document.getElementById("guruNama").value = "";
    document.getElementById("guruEmail").value = "";
    document.getElementById("guruPass").value = "";
  } catch (e) {
    err.textContent = terjemahkanError(e);
    err.classList.add("show");
  }
});

/* ================= SISWA ================= */
let siswaCache = [];
function loadSiswa() {
  db.collection("users").where("role", "==", "siswa").onSnapshot((snap) => {
    siswaCache = [];
    snap.forEach((doc) => siswaCache.push({ id: doc.id, ...doc.data() }));
    renderSiswaTable();
  });
}

function renderSiswaTable() {
  const tbody = document.querySelector("#tblSiswa tbody");
  tbody.innerHTML = "";
  siswaCache.forEach((s) => {
    const kelas = kelasCache.find((k) => k.id === s.kelasId);
    tbody.innerHTML += `<tr>
      <td>${esc(s.nama)}</td><td>${esc(s.email)}</td><td>${esc(kelas ? kelas.nama : "-")}</td>
      <td><button class="btn btn-sm btn-danger" onclick="hapusProfil('${s.id}')">Hapus profil</button></td>
    </tr>`;
  });
  document.getElementById("siswaEmpty").style.display = siswaCache.length === 0 ? "block" : "none";
  document.getElementById("statSiswa").textContent = siswaCache.length;
}

document.getElementById("btnExportSiswa").addEventListener("click", () => {
  if (siswaCache.length === 0) { alert("Belum ada data siswa untuk diunduh."); return; }
  const rows = siswaCache.map((s) => {
    const kelas = kelasCache.find((k) => k.id === s.kelasId);
    return { Nama: s.nama, Email: s.email, Kelas: kelas ? kelas.nama : "-", Jurusan: kelas ? (kelas.jurusan || "-") : "-" };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 26 }, { wch: 28 }, { wch: 16 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Siswa");
  XLSX.writeFile(wb, `Daftar_Siswa_${tanggalFile()}.xlsx`);
});

function tanggalFile() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

document.getElementById("btnAddSiswa").addEventListener("click", async () => {
  const nama = document.getElementById("siswaNama").value.trim();
  const email = document.getElementById("siswaEmail").value.trim();
  const pass = document.getElementById("siswaPass").value;
  const kelasId = document.getElementById("siswaKelas").value;
  const err = document.getElementById("siswaErr");
  const ok = document.getElementById("siswaOk");
  err.classList.remove("show"); ok.classList.remove("show");
  if (!nama || !email || pass.length < 6 || !kelasId) {
    err.textContent = "Lengkapi semua kolom (termasuk pilih kelas). Kata sandi minimal 6 karakter.";
    err.classList.add("show");
    return;
  }
  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(cred.user.uid).set({
      nama, email, role: "siswa", kelasId, dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
    });
    await secondaryAuth.signOut();
    ok.textContent = `Akun siswa "${nama}" berhasil dibuat.`;
    ok.classList.add("show");
    document.getElementById("siswaNama").value = "";
    document.getElementById("siswaEmail").value = "";
    document.getElementById("siswaPass").value = "";
    document.getElementById("siswaKelas").value = "";
  } catch (e) {
    err.textContent = terjemahkanError(e);
    err.classList.add("show");
  }
});

async function hapusProfil(uid) {
  if (!confirm("Hapus profil akun ini dari database? (Akun login di Firebase Authentication tidak ikut terhapus otomatis — hapus manual di Firebase Console bila perlu.)")) return;
  await db.collection("users").doc(uid).delete();
}

/* -------- impor massal siswa dari Excel -------- */
document.getElementById("siswaExcelFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const log = document.getElementById("importLog");
  log.textContent = "Membaca file...";
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    let sukses = 0, gagal = 0;
    for (const row of rows) {
      const nama = String(row["Nama"] || "").trim();
      const email = String(row["Email"] || "").trim();
      const pass = String(row["Password"] || "").trim();
      const namaKelas = String(row["Nama Kelas"] || "").trim();
      const kelas = kelasCache.find((k) => k.nama.toLowerCase() === namaKelas.toLowerCase());
      if (!nama || !email || pass.length < 6 || !kelas) { gagal++; continue; }
      try {
        const cred = await secondaryAuth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(cred.user.uid).set({
          nama, email, role: "siswa", kelasId: kelas.id, dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
        });
        await secondaryAuth.signOut();
        sukses++;
      } catch (err) { gagal++; }
    }
    log.textContent = `Impor selesai: ${sukses} berhasil, ${gagal} gagal (email duplikat/kelas tidak cocok/data kosong).`;
  } catch (err) {
    log.textContent = "Gagal membaca file: " + err.message;
  }
  e.target.value = "";
});

/* -------- util -------- */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function terjemahkanError(e) {
  const m = e.code || "";
  if (m.includes("email-already-in-use")) return "Email ini sudah terdaftar.";
  if (m.includes("invalid-email")) return "Format email tidak valid.";
  if (m.includes("weak-password")) return "Kata sandi terlalu lemah (minimal 6 karakter).";
  return e.message || "Terjadi kesalahan.";
}

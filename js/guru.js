let profile = null;
let kelasCache = [];
let ujianCache = [];

guardPage(["guru"]).then((p) => {
  profile = p;
  fillWhoBadge("whoBadge", p);
  loadKelasUntukForm();
  loadUjian();
});
setupLogout("logoutBtn");

/* ---------------- tabs ---------------- */
document.querySelectorAll(".tabbar button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabbar button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ["ujian", "hasil"].forEach((t) => {
      document.getElementById("tab-" + t).style.display = t === btn.dataset.tab ? "block" : "none";
    });
  });
});

/* ================= FORM BUAT UJIAN ================= */
document.getElementById("btnShowForm").addEventListener("click", () => {
  document.getElementById("formUjian").style.display = "block";
});
document.getElementById("btnCancelForm").addEventListener("click", () => {
  document.getElementById("formUjian").style.display = "none";
});

function loadKelasUntukForm() {
  db.collection("kelas").orderBy("nama").onSnapshot((snap) => {
    kelasCache = [];
    snap.forEach((doc) => kelasCache.push({ id: doc.id, ...doc.data() }));
    const wrap = document.getElementById("ujKelasList");
    if (kelasCache.length === 0) {
      wrap.innerHTML = '<span class="muted">Belum ada kelas. Minta admin membuat kelas dahulu.</span>';
    } else {
      wrap.innerHTML = kelasCache.map((k) =>
        `<label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:6px;">
          <input type="checkbox" value="${k.id}" class="ujKelasChk" style="width:auto;">
          ${esc(k.nama)} <span class="muted" style="font-size:12px;">(${esc(k.jurusan || "-")})</span>
        </label>`
      ).join("");
    }
    // filter dropdown di tab hasil
    const filterSel = document.getElementById("hasilKelasFilter");
    filterSel.innerHTML = '<option value="">Semua kelas</option>' +
      kelasCache.map((k) => `<option value="${k.id}">${esc(k.nama)}</option>`).join("");
  });
}

document.getElementById("btnSaveUjian").addEventListener("click", async () => {
  const judul = document.getElementById("ujJudul").value.trim();
  const durasi = parseInt(document.getElementById("ujDurasi").value, 10);
  const acak = document.getElementById("ujAcak").value === "ya";
  const kelasIds = Array.from(document.querySelectorAll(".ujKelasChk:checked")).map((c) => c.value);
  const err = document.getElementById("ujErr");
  err.classList.remove("show");
  if (!judul || !durasi || kelasIds.length === 0) {
    err.textContent = "Isi judul, durasi, dan pilih minimal satu kelas.";
    err.classList.add("show");
    return;
  }
  await db.collection("ujian").add({
    judul, durasiMenit: durasi, acak, kelasIds,
    guruId: profile.uid, guruNama: profile.nama,
    status: "draft", soal: [],
    dibuatPada: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById("ujJudul").value = "";
  document.getElementById("formUjian").style.display = "none";
});

/* ================= LIST UJIAN ================= */
function loadUjian() {
  db.collection("ujian").where("guruId", "==", profile.uid).onSnapshot((snap) => {
    ujianCache = [];
    snap.forEach((doc) => ujianCache.push({ id: doc.id, ...doc.data() }));
    ujianCache.sort((a, b) => (b.dibuatPada?.seconds || 0) - (a.dibuatPada?.seconds || 0));
    renderUjianList();
    renderHasilSelect();
    updateStats();
  });
}

function updateStats() {
  document.getElementById("statTotalUjian").textContent = ujianCache.length;
  document.getElementById("statAktif").textContent = ujianCache.filter((u) => u.status === "aktif").length;
  document.getElementById("statTotalSoal").textContent = ujianCache.reduce((sum, u) => sum + (u.soal?.length || 0), 0);
  if (profile?.nama) document.getElementById("greetTitle").textContent = `Halo, ${profile.nama.split(" ")[0]} 👋`;
}

function renderUjianList() {
  const wrap = document.getElementById("listUjian");
  document.getElementById("ujianEmpty").style.display = ujianCache.length === 0 ? "block" : "none";
  wrap.innerHTML = ujianCache.map((u) => {
    const namaKelas = u.kelasIds.map((id) => kelasCache.find((k) => k.id === id)?.nama || "?").join(", ");
    const statusBadge = u.status === "aktif"
      ? '<span class="badge badge-green"><span class="badge-dot"></span>Aktif</span>'
      : '<span class="badge badge-gray"><span class="badge-dot"></span>Draft</span>';
    return `
    <div class="card hoverable mb-16">
      <div class="flex-between">
        <div>
          <div style="font-weight:700;font-size:15.5px;font-family:'Poppins';margin-bottom:4px;">${esc(u.judul)} ${statusBadge}</div>
          <div class="hint">❓ ${u.soal.length} soal · ⏱ ${u.durasiMenit} menit · 🏫 ${esc(namaKelas) || "-"}</div>
        </div>
      </div>
      <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
        <button class="btn btn-sm btn-outline" onclick="toggleSoalPanel('${u.id}')">📄 Kelola Soal</button>
        <button class="btn btn-sm ${u.status === "aktif" ? "btn-danger" : "btn-amber"}" onclick="toggleStatus('${u.id}','${u.status}')">
          ${u.status === "aktif" ? "Nonaktifkan" : "Aktifkan untuk Siswa"}
        </button>
        <button class="btn btn-sm btn-danger" onclick="hapusUjian('${u.id}')">Hapus</button>
      </div>
      <div id="soalPanel-${u.id}" style="display:none;" class="mt-16">
        <div class="hint mb-16">Unggah file Excel (.xlsx) dengan kolom: <b>Pertanyaan | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Kunci Jawaban | Poin</b>. Mengunggah file baru akan MENGGANTI seluruh soal ujian ini.</div>
        <input type="file" accept=".xlsx,.xls" onchange="uploadSoal('${u.id}', this)">
        <div id="soalLog-${u.id}" class="hint mt-16"></div>
        ${u.soal.length > 0 ? renderSoalPreview(u.soal) : ""}
      </div>
    </div>`;
  }).join("");
}

function renderSoalPreview(soal) {
  const rows = soal.slice(0, 5).map((s, i) =>
    `<tr><td>${i + 1}</td><td>${esc(s.pertanyaan).slice(0, 60)}${s.pertanyaan.length > 60 ? "…" : ""}</td><td>${esc(s.kunci)}</td><td>${s.poin}</td></tr>`
  ).join("");
  return `<div class="table-wrap mt-16"><table>
    <thead><tr><th>#</th><th>Pertanyaan</th><th>Kunci</th><th>Poin</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>${soal.length > 5 ? `<div class="hint">...dan ${soal.length - 5} soal lainnya.</div>` : ""}`;
}

function toggleSoalPanel(id) {
  const panel = document.getElementById("soalPanel-" + id);
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function toggleStatus(id, currentStatus) {
  await db.collection("ujian").doc(id).update({ status: currentStatus === "aktif" ? "draft" : "aktif" });
}

async function hapusUjian(id) {
  if (!confirm("Hapus ujian ini beserta seluruh soalnya? Hasil siswa yang sudah tersimpan tidak ikut terhapus.")) return;
  await db.collection("ujian").doc(id).delete();
}

/* -------- upload & parse excel soal -------- */
async function uploadSoal(ujianId, input) {
  const file = input.files[0];
  if (!file) return;
  const log = document.getElementById("soalLog-" + ujianId);
  log.textContent = "Membaca file...";
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const soal = [];
    rows.forEach((row, i) => {
      const pertanyaan = String(row["Pertanyaan"] || "").trim();
      if (!pertanyaan) return;
      const a = String(row["Pilihan A"] || "").trim();
      const b = String(row["Pilihan B"] || "").trim();
      const c = String(row["Pilihan C"] || "").trim();
      const d = String(row["Pilihan D"] || "").trim();
      let kunci = String(row["Kunci Jawaban"] || "").trim().toUpperCase();
      const poin = Number(row["Poin"]) || 1;
      if (!["A", "B", "C", "D"].includes(kunci)) kunci = "A";
      soal.push({
        id: "q" + i,
        pertanyaan,
        pilihan: { A: a, B: b, C: c, D: d },
        kunci, poin
      });
    });
    if (soal.length === 0) {
      log.textContent = "Tidak ada baris valid ditemukan. Periksa kembali nama kolom di file Excel.";
      return;
    }
    await db.collection("ujian").doc(ujianId).update({ soal });
    log.textContent = `Berhasil! ${soal.length} soal tersimpan.`;
  } catch (e) {
    log.textContent = "Gagal memproses file: " + e.message;
  }
  input.value = "";
}

/* ================= REKAP HASIL ================= */
function renderHasilSelect() {
  const sel = document.getElementById("hasilUjianSelect");
  const current = sel.value;
  sel.innerHTML = '<option value="">Pilih...</option>' +
    ujianCache.map((u) => `<option value="${u.id}">${esc(u.judul)}</option>`).join("");
  if (current) sel.value = current;
}

document.getElementById("hasilUjianSelect").addEventListener("change", loadHasil);
document.getElementById("hasilKelasFilter").addEventListener("change", loadHasil);

let hasilRowsCache = []; // dipakai untuk fitur unduh Excel
let ujianTerpilihCache = null;

async function loadHasil() {
  const ujianId = document.getElementById("hasilUjianSelect").value;
  const kelasFilter = document.getElementById("hasilKelasFilter").value;
  const tbody = document.querySelector("#tblHasil tbody");
  const ringkasan = document.getElementById("ringkasanHasil");
  const countHint = document.getElementById("hasilCountHint");
  tbody.innerHTML = "";
  ringkasan.innerHTML = "";
  hasilRowsCache = [];
  ujianTerpilihCache = ujianCache.find((u) => u.id === ujianId) || null;
  if (!ujianId) {
    document.getElementById("hasilEmpty").style.display = "block";
    countHint.textContent = "";
    return;
  }

  const snap = await db.collection("hasil").where("ujianId", "==", ujianId).get();
  let rows = [];
  snap.forEach((doc) => rows.push(doc.data()));
  if (kelasFilter) rows = rows.filter((r) => r.kelasId === kelasFilter);

  document.getElementById("hasilEmpty").style.display = rows.length === 0 ? "block" : "none";

  rows.sort((a, b) => (b.nilai || 0) - (a.nilai || 0));
  hasilRowsCache = rows;
  countHint.textContent = rows.length > 0 ? `${rows.length} siswa telah mengerjakan` : "";

  rows.forEach((r, i) => {
    const kelas = kelasCache.find((k) => k.id === r.kelasId);
    const waktu = formatWaktu(r.selesaiPada);
    const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
    const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
    tbody.innerHTML += `<tr>
      <td class="${rankCls}">${rankIcon}</td>
      <td>${esc(r.siswaNama)}</td><td>${esc(kelas?.nama || "-")}</td><td>${esc(kelas?.jurusan || "-")}</td>
      <td><b>${r.nilai}</b></td><td>${waktu}</td>
    </tr>`;
  });

  if (rows.length > 0) {
    const nilaiArr = rows.map((r) => r.nilai || 0);
    const rata = (nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length).toFixed(1);
    const tertinggi = Math.max(...nilaiArr);
    const terendah = Math.min(...nilaiArr);
    ringkasan.innerHTML = `
      <div class="stat-card blue"><div class="stat-ic">📈</div><div class="stat-num">${rata}</div><div class="stat-label">Rata-rata Nilai</div></div>
      <div class="stat-card green"><div class="stat-ic">🏆</div><div class="stat-num">${tertinggi}</div><div class="stat-label">Nilai Tertinggi</div></div>
      <div class="stat-card red"><div class="stat-ic">📉</div><div class="stat-num">${terendah}</div><div class="stat-label">Nilai Terendah</div></div>
    `;
  }
}

/* ================= UNDUH HASIL (Excel) ================= */
document.getElementById("btnUnduhExcel").addEventListener("click", () => {
  if (!ujianTerpilihCache) { alert("Pilih ujian terlebih dahulu."); return; }
  if (hasilRowsCache.length === 0) { alert("Belum ada hasil siswa untuk ujian ini."); return; }

  const rows = hasilRowsCache.map((r, i) => {
    const kelas = kelasCache.find((k) => k.id === r.kelasId);
    return {
      Peringkat: i + 1,
      "Nama Siswa": r.siswaNama,
      Kelas: kelas?.nama || "-",
      Jurusan: kelas?.jurusan || "-",
      "Jawaban Benar": r.benar ?? "-",
      "Total Soal": r.totalSoal ?? "-",
      Nilai: r.nilai,
      "Waktu Selesai": formatWaktu(r.selesaiPada)
    };
  });
  const nilaiArr = hasilRowsCache.map((r) => r.nilai || 0);
  const rata = (nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length).toFixed(1);

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
  XLSX.utils.sheet_add_aoa(ws, [
    [],
    ["Ringkasan", ""],
    ["Rata-rata", Number(rata)],
    ["Nilai Tertinggi", Math.max(...nilaiArr)],
    ["Nilai Terendah", Math.min(...nilaiArr)],
    ["Jumlah Peserta", hasilRowsCache.length]
  ], { origin: -1 });

  const wb = XLSX.utils.book_new();
  const namaSheet = (ujianTerpilihCache.judul || "Hasil").slice(0, 28).replace(/[\\/?*[\]:]/g, "");
  XLSX.utils.book_append_sheet(wb, ws, namaSheet || "Hasil");
  const namaFile = `Rekap_${(ujianTerpilihCache.judul || "Ujian").replace(/[^a-zA-Z0-9]+/g, "_")}.xlsx`;
  XLSX.writeFile(wb, namaFile);
});

/* -------- util -------- */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

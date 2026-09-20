let profile = null;
let ujian = null;
let soalList = [];
let jawaban = {}; // { qId: 'A'|'B'|'C'|'D' }
let currentIndex = 0;
let timerInterval = null;
let sisaDetik = 0;
let sudahSubmit = false;

const params = new URLSearchParams(window.location.search);
const ujianId = params.get("id");

guardPage(["siswa"]).then(async (p) => {
  profile = p;
  if (!ujianId) return gagalMuat("Ujian tidak ditemukan.");

  const doc = await db.collection("ujian").doc(ujianId).get();
  if (!doc.exists) return gagalMuat("Ujian tidak ditemukan.");
  ujian = { id: doc.id, ...doc.data() };

  if (ujian.status !== "aktif") return gagalMuat("Ujian ini belum atau sudah tidak aktif.");
  if (!ujian.kelasIds.includes(profile.kelasId)) return gagalMuat("Ujian ini bukan untuk kelasmu.");

  const doneSnap = await db.collection("hasil")
    .where("ujianId", "==", ujianId).where("siswaId", "==", profile.uid).get();
  if (!doneSnap.empty) return gagalMuat("Kamu sudah mengerjakan ujian ini sebelumnya.");

  if (!ujian.soal || ujian.soal.length === 0) return gagalMuat("Ujian ini belum memiliki soal.");

  soalList = ujian.acak ? shuffle([...ujian.soal]) : [...ujian.soal];
  sisaDetik = ujian.durasiMenit * 60;

  mulaiTampilanUjian();
});

function gagalMuat(pesan) {
  document.getElementById("loadingScreen").innerHTML =
    `<div style="margin:auto;text-align:center;color:#DDE4F0;padding:0 24px;">
      <div style="font-size:34px;margin-bottom:10px;">⚠️</div>
      <div style="margin-bottom:18px;">${esc(pesan)}</div>
      <button class="btn btn-amber" onclick="window.location.href='siswa.html'">Kembali</button>
    </div>`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mulaiTampilanUjian() {
  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("examScreen").style.display = "flex";
  document.getElementById("examJudul").textContent = ujian.judul;

  renderGrid();
  renderSoal();
  startTimer();

  window.addEventListener("beforeunload", (e) => {
    if (!sudahSubmit) { e.preventDefault(); e.returnValue = ""; }
  });
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    sisaDetik--;
    updateTimerDisplay();
    if (sisaDetik <= 0) {
      clearInterval(timerInterval);
      submitUjian(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(sisaDetik / 60);
  const s = sisaDetik % 60;
  const box = document.getElementById("timerBox");
  box.textContent = `⏱ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  box.className = "timer" + (sisaDetik <= 60 ? " danger" : sisaDetik <= 300 ? " warn" : "");
}

function renderSoal() {
  const q = soalList[currentIndex];
  document.getElementById("qCounter").textContent = `Soal ${currentIndex + 1} dari ${soalList.length}`;
  document.getElementById("qText").textContent = q.pertanyaan;
  document.getElementById("progressFill").style.width = `${((currentIndex + 1) / soalList.length) * 100}%`;

  const optWrap = document.getElementById("qOptions");
  optWrap.innerHTML = "";
  ["A", "B", "C", "D"].forEach((letter) => {
    const teks = q.pilihan[letter];
    if (!teks) return;
    const selected = jawaban[q.id] === letter;
    const div = document.createElement("div");
    div.className = "opt" + (selected ? " selected" : "");
    div.innerHTML = `<div class="letter">${letter}</div><div class="txt">${esc(teks)}</div>`;
    div.addEventListener("click", () => {
      jawaban[q.id] = letter;
      renderSoal();
      renderGrid();
    });
    optWrap.appendChild(div);
  });

  document.getElementById("btnPrev").style.visibility = currentIndex === 0 ? "hidden" : "visible";
  const isLast = currentIndex === soalList.length - 1;
  document.getElementById("btnNext").style.display = isLast ? "none" : "inline-flex";
  document.getElementById("btnSubmit").style.display = isLast ? "inline-flex" : "none";
}

function renderGrid() {
  const grid = document.getElementById("qGrid");
  grid.innerHTML = soalList.map((q, i) => {
    let cls = "";
    if (jawaban[q.id]) cls += " answered";
    if (i === currentIndex) cls += " current";
    return `<button class="${cls}" onclick="lompatKe(${i})">${i + 1}</button>`;
  }).join("");
}

function lompatKe(i) {
  currentIndex = i;
  renderSoal();
  renderGrid();
}

document.getElementById("btnPrev").addEventListener("click", () => {
  if (currentIndex > 0) { currentIndex--; renderSoal(); renderGrid(); }
});
document.getElementById("btnNext").addEventListener("click", () => {
  if (currentIndex < soalList.length - 1) { currentIndex++; renderSoal(); renderGrid(); }
});
document.getElementById("btnSubmit").addEventListener("click", () => {
  const belumDijawab = soalList.filter((q) => !jawaban[q.id]).length;
  const pesan = belumDijawab > 0
    ? `Masih ada ${belumDijawab} soal belum dijawab. Yakin ingin mengumpulkan sekarang?`
    : "Yakin ingin mengumpulkan jawaban sekarang?";
  if (confirm(pesan)) submitUjian(false);
});

async function submitUjian(otomatis) {
  if (sudahSubmit) return;
  sudahSubmit = true;
  clearInterval(timerInterval);

  let totalPoin = 0, poinBenar = 0, jumlahBenar = 0;
  soalList.forEach((q) => {
    totalPoin += q.poin;
    if (jawaban[q.id] === q.kunci) { poinBenar += q.poin; jumlahBenar++; }
  });
  const nilai = totalPoin > 0 ? Math.round((poinBenar / totalPoin) * 100) : 0;

  await db.collection("hasil").add({
    ujianId: ujian.id,
    ujianJudul: ujian.judul,
    siswaId: profile.uid,
    siswaNama: profile.nama,
    kelasId: profile.kelasId,
    jawaban,
    nilai,
    benar: jumlahBenar,
    totalSoal: soalList.length,
    selesaiPada: firebase.firestore.FieldValue.serverTimestamp()
  });

  tampilkanHasil(nilai, jumlahBenar, soalList.length, otomatis);
}

let hasilTerakhir = null;

function tampilkanHasil(nilai, benar, total, otomatis) {
  document.getElementById("examScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "flex";
  document.getElementById("resultDetail").textContent =
    (otomatis ? "Waktu habis · " : "") + `${benar} dari ${total} soal benar`;

  hasilTerakhir = { judul: ujian.judul, nama: profile.nama, nilai, benar, total, waktu: new Date().toLocaleString("id-ID") };

  // animasi angka nilai
  const scoreEl = document.getElementById("resultScore");
  let n = 0;
  const step = Math.max(1, Math.round(nilai / 30));
  const anim = setInterval(() => {
    n = Math.min(nilai, n + step);
    scoreEl.textContent = n;
    if (n >= nilai) clearInterval(anim);
  }, 25);

  // animasi ring skor (keliling = 2*pi*60 ≈ 377)
  const ring = document.getElementById("resultRing");
  const circumference = 377;
  requestAnimationFrame(() => {
    setTimeout(() => {
      ring.style.strokeDashoffset = circumference - (circumference * Math.min(100, nilai)) / 100;
    }, 100);
  });

  // badge predikat
  const { label, cls } = predikat(nilai);
  document.getElementById("resultBadgeWrap").innerHTML = `<div class="result-badge badge ${cls}">${label}</div>`;

  if (nilai >= 70) tembakConfetti();
}

function predikat(nilai) {
  if (nilai >= 85) return { label: "🌟 Sangat Baik", cls: "badge-green" };
  if (nilai >= 70) return { label: "👍 Baik", cls: "badge-blue" };
  if (nilai >= 55) return { label: "📘 Cukup", cls: "badge-amber" };
  return { label: "💪 Perlu Belajar Lagi", cls: "badge-red" };
}

function tembakConfetti() {
  const hero = document.getElementById("resultHero");
  const warna = ["#F2A93B", "#3B74C4", "#3EAA6D", "#FFD98A", "#E15554"];
  for (let i = 0; i < 26; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.left = Math.random() * 100 + "%";
    el.style.width = 5 + Math.random() * 4 + "px";
    el.style.height = 8 + Math.random() * 6 + "px";
    el.style.background = warna[Math.floor(Math.random() * warna.length)];
    el.style.animationDuration = 1.6 + Math.random() * 1.2 + "s";
    el.style.animationDelay = Math.random() * 0.4 + "s";
    hero.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}

/* ================= UNDUH HASIL (PDF) ================= */
document.getElementById("btnUnduhHasil").addEventListener("click", () => {
  if (!hasilTerakhir) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(11, 18, 32);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(242, 169, 59);
  doc.roundedRect(28, 24, 44, 44, 10, 10, "F");
  doc.setTextColor(11, 18, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("U", 50, 52, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("Kartu Hasil Ujian", 86, 46);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 195, 220);
  doc.text("Sistem Ujian Online", 86, 62);

  let y = 130;
  doc.setTextColor(27, 36, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text(String(hasilTerakhir.judul || "-"), 28, y);

  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const baris = [
    ["Nama Siswa", hasilTerakhir.nama || "-"],
    ["Waktu Selesai", hasilTerakhir.waktu || "-"],
    ["Jawaban Benar", `${hasilTerakhir.benar} dari ${hasilTerakhir.total} soal`]
  ];
  baris.forEach(([label, val]) => {
    doc.setTextColor(140, 150, 165);
    doc.text(label, 28, y);
    doc.setTextColor(27, 36, 48);
    doc.text(String(val), 150, y);
    y += 20;
  });

  const cx = W / 2, cy = y + 78, r = 56;
  doc.setDrawColor(230, 234, 240);
  doc.setLineWidth(10);
  doc.circle(cx, cy, r, "S");
  doc.setDrawColor(242, 169, 59);
  doc.circle(cx, cy, r, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(220, 143, 30);
  doc.text(String(hasilTerakhir.nilai ?? 0), cx, cy + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 150, 165);
  doc.text("NILAI AKHIR", cx, cy + r + 22, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(170, 178, 190);
  doc.text("Dokumen ini dibuat otomatis oleh Sistem Ujian Online.", W / 2, H - 24, { align: "center" });

  doc.save(`Kartu_Nilai_${(hasilTerakhir.judul || "Ujian").replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`);
});

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

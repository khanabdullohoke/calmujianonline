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

function tampilkanHasil(nilai, benar, total, otomatis) {
  document.getElementById("examScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "flex";
  document.getElementById("resultDetail").textContent =
    (otomatis ? "Waktu habis · " : "") + `${benar} dari ${total} soal benar`;

  const scoreEl = document.getElementById("resultScore");
  let n = 0;
  const step = Math.max(1, Math.round(nilai / 30));
  const anim = setInterval(() => {
    n = Math.min(nilai, n + step);
    scoreEl.textContent = n;
    if (n >= nilai) clearInterval(anim);
  }, 25);
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

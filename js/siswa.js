let profile = null;

guardPage(["siswa"]).then((p) => {
  profile = p;
  fillWhoBadge("whoBadge", p);
  document.getElementById("greetTitle").textContent = `Halo, ${(p.nama || "Siswa").split(" ")[0]}`;
  loadUjianTersedia();
  loadRiwayat();
});
setupLogout("logoutBtn");

document.querySelectorAll(".tabbar button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabbar button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ["tersedia", "riwayat"].forEach((t) => {
      document.getElementById("tab-" + t).style.display = t === btn.dataset.tab ? "block" : "none";
    });
  });
});

async function loadUjianTersedia() {
  if (!profile.kelasId) {
    document.getElementById("tersediaEmpty").style.display = "block";
    document.getElementById("statTersedia").textContent = 0;
    return;
  }
  const snap = await db.collection("ujian")
    .where("status", "==", "aktif")
    .where("kelasIds", "array-contains", profile.kelasId)
    .get();

  // cek mana yang sudah dikerjakan
  const doneSnap = await db.collection("hasil").where("siswaId", "==", profile.uid).get();
  const doneIds = new Set();
  doneSnap.forEach((d) => doneIds.add(d.data().ujianId));

  const wrap = document.getElementById("listUjianTersedia");
  let list = [];
  snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
  list = list.filter((u) => !doneIds.has(u.id));

  document.getElementById("statTersedia").textContent = list.length;
  document.getElementById("tersediaEmpty").style.display = list.length === 0 ? "block" : "none";
  wrap.innerHTML = list.map((u) => `
    <div class="card hoverable mb-16">
      <div class="flex-between">
        <div>
          <div class="exam-card-title">${esc(u.judul)}</div>
          <div class="hint mt-8">${IC.clock} ${u.durasiMenit} menit &nbsp;·&nbsp; ${IC.help} ${u.soal.length} soal &nbsp;·&nbsp; ${IC.teacher} ${esc(u.guruNama)}</div>
        </div>
        <span class="badge badge-blue"><span class="badge-dot"></span>Aktif</span>
      </div>
      <button class="btn btn-primary btn-block mt-16" onclick="mulaiUjian('${u.id}')">${IC.play} Mulai Ujian</button>
    </div>
  `).join("");
}

function mulaiUjian(id) {
  if (!confirm("Timer akan mulai berjalan begitu kamu klik Mulai. Pastikan koneksi internet stabil. Lanjutkan?")) return;
  window.location.href = `ujian.html?id=${id}`;
}

let riwayatCache = [];
async function loadRiwayat() {
  const snap = await db.collection("hasil").where("siswaId", "==", profile.uid).get();
  let list = [];
  snap.forEach((doc) => list.push(doc.data()));
  list.sort((a, b) => (b.selesaiPada?.seconds || 0) - (a.selesaiPada?.seconds || 0));
  riwayatCache = list;

  document.getElementById("statSelesai").textContent = list.length;
  if (list.length > 0) {
    const rata = (list.reduce((s, r) => s + (r.nilai || 0), 0) / list.length).toFixed(1);
    document.getElementById("statRata").textContent = rata;
  }

  document.getElementById("riwayatEmpty").style.display = list.length === 0 ? "block" : "none";
  document.getElementById("listRiwayat").innerHTML = list.map((r, i) => {
    const waktu = formatWaktu(r.selesaiPada);
    const grade = gradeFromNilai(r.nilai);
    return `
    <div class="card hoverable mb-16">
      <div class="flex-between">
        <div class="flex items-center gap-10">
          <div class="grade-chip grade-${grade}">${grade}</div>
          <div>
            <div class="exam-card-title">${esc(r.ujianJudul)}</div>
            <div class="hint">${waktu} · ${r.benar ?? "-"}/${r.totalSoal ?? "-"} benar</div>
          </div>
        </div>
        <div class="score-num">${r.nilai}</div>
      </div>
      <button class="btn btn-sm btn-outline mt-16" onclick="unduhKartuNilai(${i})">${IC.download} Unduh Kartu Nilai (PDF)</button>
    </div>`;
  }).join("");
}

function gradeFromNilai(n) {
  n = n || 0;
  if (n >= 85) return "A";
  if (n >= 70) return "B";
  if (n >= 55) return "C";
  return "D";
}

/* ================= UNDUH KARTU NILAI (PDF) ================= */
function unduhKartuNilai(i) {
  const r = riwayatCache[i];
  if (!r) return;
  buatPdfKartuNilai({
    judul: r.ujianJudul,
    nama: profile.nama,
    kelas: null, // resolved lazily below via profile
    nilai: r.nilai,
    benar: r.benar,
    total: r.totalSoal,
    waktu: formatWaktu(r.selesaiPada)
  });
}

async function buatPdfKartuNilai(data) {
  const logo = await loadLogoForPdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // header band
  doc.setFillColor(11, 61, 145);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(28, 24, 44, 44, 10, 10, "F");
  doc.setTextColor(11, 61, 145);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  if (logo) {
    const box = 34, k = Math.min(box / logo.w, box / logo.h), lw = logo.w * k, lh = logo.h * k;
    doc.addImage(logo.data, logo.type, 50 - lw / 2, 46 - lh / 2, lw, lh);
  } else {
    doc.text("C", 50, 52, { align: "center" });
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("Kartu Hasil Ujian", 86, 46);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(190, 210, 245);
  doc.text("SMK Ciledug Al Musaddadiyah", 86, 62);

  let y = 130;
  doc.setTextColor(11, 27, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text(String(data.judul || "-"), 28, y);

  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(75, 87, 104);
  const baris = [
    ["Nama Siswa", data.nama || "-"],
    ["Waktu Selesai", data.waktu || "-"],
    ["Jawaban Benar", `${data.benar ?? "-"} dari ${data.total ?? "-"} soal`]
  ];
  baris.forEach(([label, val]) => {
    doc.setTextColor(136, 149, 173);
    doc.text(label, 28, y);
    doc.setTextColor(11, 27, 58);
    doc.text(String(val), 150, y);
    y += 20;
  });

  // score circle
  const cx = W / 2, cy = y + 78, r = 56;
  doc.setDrawColor(211, 229, 248);
  doc.setLineWidth(10);
  doc.circle(cx, cy, r, "S");
  doc.setDrawColor(33, 96, 196);
  doc.circle(cx, cy, r, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(11, 61, 145);
  doc.text(String(data.nilai ?? 0), cx, cy + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(136, 149, 173);
  doc.text("NILAI AKHIR", cx, cy + r + 22, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(170, 178, 190);
  doc.text("Dokumen ini dibuat otomatis oleh Sistem Ujian Online.", W / 2, H - 24, { align: "center" });

  const namaFile = `Kartu_Nilai_${(data.judul || "Ujian").replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;
  doc.save(namaFile);
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

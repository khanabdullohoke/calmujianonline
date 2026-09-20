let profile = null;

guardPage(["siswa"]).then((p) => {
  profile = p;
  fillWhoBadge("whoBadge", p);
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

  document.getElementById("tersediaEmpty").style.display = list.length === 0 ? "block" : "none";
  wrap.innerHTML = list.map((u) => `
    <div class="card mb-16">
      <div style="font-weight:600;font-size:15px;">${esc(u.judul)}</div>
      <div class="hint mt-8">⏱ ${u.durasiMenit} menit · ${u.soal.length} soal · Oleh ${esc(u.guruNama)}</div>
      <button class="btn btn-amber mt-16" onclick="mulaiUjian('${u.id}')">Mulai Ujian</button>
    </div>
  `).join("");
}

function mulaiUjian(id) {
  if (!confirm("Timer akan mulai berjalan begitu kamu klik Mulai. Pastikan koneksi internet stabil. Lanjutkan?")) return;
  window.location.href = `ujian.html?id=${id}`;
}

async function loadRiwayat() {
  const snap = await db.collection("hasil").where("siswaId", "==", profile.uid).get();
  let list = [];
  snap.forEach((doc) => list.push(doc.data()));
  list.sort((a, b) => (b.selesaiPada?.seconds || 0) - (a.selesaiPada?.seconds || 0));

  document.getElementById("riwayatEmpty").style.display = list.length === 0 ? "block" : "none";
  document.getElementById("listRiwayat").innerHTML = list.map((r) => {
    const waktu = r.selesaiPada?.toDate ? r.selesaiPada.toDate().toLocaleString("id-ID") : "-";
    return `
    <div class="card mb-16 flex-between">
      <div>
        <div style="font-weight:600;">${esc(r.ujianJudul)}</div>
        <div class="hint">${waktu}</div>
      </div>
      <div style="font-size:24px;font-weight:700;color:var(--blue-600);">${r.nilai}</div>
    </div>`;
  }).join("");
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

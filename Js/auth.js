// ============================================================
// Helper autentikasi & penjagaan akses per-role.
// Dipakai oleh semua halaman kecuali index.html (login).
// ============================================================

/**
 * Menjaga halaman: hanya boleh diakses oleh user yang sudah login
 * DAN memiliki role sesuai `allowedRoles`. Kalau tidak, redirect.
 * Mengembalikan Promise yang resolve dengan { uid, ...dataUser }.
 */
function guardPage(allowedRoles) {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "index.html";
        return reject("not-logged-in");
      }
      try {
        const doc = await db.collection("users").doc(user.uid).get();
        if (!doc.exists) {
          alert("Data akun tidak ditemukan. Hubungi admin.");
          await auth.signOut();
          window.location.href = "index.html";
          return reject("no-profile");
        }
        const profile = { uid: user.uid, email: user.email, ...doc.data() };
        if (!allowedRoles.includes(profile.role)) {
          alert("Anda tidak punya akses ke halaman ini.");
          redirectByRole(profile.role);
          return reject("wrong-role");
        }
        resolve(profile);
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  });
}

function redirectByRole(role) {
  if (role === "admin") window.location.href = "admin.html";
  else if (role === "guru") window.location.href = "guru.html";
  else if (role === "siswa") window.location.href = "siswa.html";
  else window.location.href = "index.html";
}

function setupLogout(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });
}

function fillWhoBadge(elId, profile) {
  const el = document.getElementById(elId);
  if (!el) return;
  const roleLabel = { admin: "Admin", guru: "Guru", siswa: "Siswa" }[profile.role] || profile.role;
  el.textContent = `${profile.nama || profile.email} · ${roleLabel}`;
}

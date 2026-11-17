// ============================================================
// Identitas sekolah — ubah di sini, berlaku di semua halaman.
// Untuk memakai logo lokal: taruh file di assets/logo.png lalu
// ganti nilai `logo` menjadi "assets/logo.png".
// ============================================================
const BRAND = {
  nama: "SMK Ciledug Al Musaddadiyah",
  singkat: "SMK CALM",
  warna: "#0B3D91",
  logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiD-8YPFS6i86EyZZNDUhwuam5ro_mtc9So2muvB7EDWz1Zp6rarLubvVS3vfVVoto_S6SaHlIPPnmNaddUugGUztWkJYhDwwT8CU1BcUuq9TNyxnHKa6B44iDBx6LjR1-z3r7_C34jviaWeOYgk4bNJHsziPV4KR5mQjY69HVhyphenhyphenR3STD4xp-b46x_HeR4/s160/An8Em6pLCtVUNFZTK-rgdQG9pKiDxE1AR7m_1QO_5slD3C5qFXYq7S9suI1ztpViB_aUnbOGE2-Y71AU9SF3GjQzZ09xbw5aat-JT_7ptJ4VcfdGeJ73DWbHD9IDtVHa_16MjCj09HJ4eGBvZMo-removebg-preview.png"
};

(function applyBrand() {
  // isi semua <img data-logo>; kalau gagal dimuat tampil huruf "C"
  document.querySelectorAll("img[data-logo]").forEach((img) => {
    img.addEventListener("error", () => img.parentNode.classList.add("noimg"));
    img.src = BRAND.logo;
  });
  // favicon
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = BRAND.logo;
  document.head.appendChild(link);
})();

/** Logo sebagai data-URL untuk dipakai di PDF (null jika gagal dimuat). */
let _logoPdfCache = null;
function loadLogoForPdf() {
  if (_logoPdfCache) return _logoPdfCache;
  _logoPdfCache = (async () => {
    try {
      const res = await fetch(BRAND.logo, { mode: "cors" });
      const blob = await res.blob();
      const data = await new Promise((ok, no) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = no;
        fr.readAsDataURL(blob);
      });
      const dim = await new Promise((ok, no) => {
        const im = new Image();
        im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = no;
        im.src = data;
      });
      return { data, w: dim.w, h: dim.h, type: blob.type.includes("jpeg") ? "JPEG" : "PNG" };
    } catch (e) {
      return null;
    }
  })();
  return _logoPdfCache;
}

/**
 * Utilitas konversi angka nominal ke kalimat terbilang bahasa Indonesia resmi.
 * Contoh: 15000000 -> "Lima Belas Juta Rupiah"
 */

const SATUAN = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
];

function angkaKeKata(n: number): string {
  n = Math.floor(Math.abs(n));

  if (n < 12) {
    return SATUAN[n];
  }
  if (n < 20) {
    return angkaKeKata(n - 10) + " Belas";
  }
  if (n < 100) {
    const sisa = n % 10;
    return angkaKeKata(Math.floor(n / 10)) + " Puluh" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 200) {
    const sisa = n % 100;
    return "Seratus" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 1000) {
    const sisa = n % 100;
    return angkaKeKata(Math.floor(n / 100)) + " Ratus" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 2000) {
    const sisa = n % 1000;
    return "Seribu" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 1000000) {
    const sisa = n % 1000;
    return angkaKeKata(Math.floor(n / 1000)) + " Ribu" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 1000000000) {
    const sisa = n % 1000000;
    return angkaKeKata(Math.floor(n / 1000000)) + " Juta" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 1000000000000) {
    const sisa = n % 1000000000;
    return angkaKeKata(Math.floor(n / 1000000000)) + " Miliar" + (sisa ? " " + angkaKeKata(sisa) : "");
  }
  if (n < 1000000000000000) {
    const sisa = n % 1000000000000;
    return angkaKeKata(Math.floor(n / 1000000000000)) + " Triliun" + (sisa ? " " + angkaKeKata(sisa) : "");
  }

  return n.toString();
}

/**
 * Parsing nilai nominal dari berbagai format: number, string rupiah ('Rp 15.000.000', '15.000.000', '15,000,000')
 */
export function parseNominal(nominal: number | string | null | undefined): number {
  if (nominal === null || nominal === undefined || nominal === "") {
    return 0;
  }
  if (typeof nominal === "number") {
    return isNaN(nominal) ? 0 : nominal;
  }

  let str = nominal.toString().trim();
  // Hilangkan prefix mata uang seperti Rp, IDR
  str = str.replace(/^(?:Rp|IDR)\.?\s*/i, "").trim();

  // Deteksi pemisah ribuan dan desimal
  if (str.includes(".") && str.includes(",")) {
    // Format: '15.000.000,00' -> titik ribuan, koma desimal
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // Format: '15,000,000.00' -> koma ribuan, titik desimal
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(".")) {
    const parts = str.split(".");
    // Jika ada lebih dari 1 titik atau 1 titik diikuti tepat 3 digit (mis. 15.000), ini pemisah ribuan
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, "");
    }
  } else if (str.includes(",")) {
    const parts = str.split(",");
    // Jika ada lebih dari 1 koma atau 1 koma diikuti tepat 3 digit, ini pemisah ribuan
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(",", ".");
    }
  }

  const num = parseFloat(str.replace(/[^\d.-]/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * Mengonversi nominal angka menjadi string terbilang Rupiah lengkap.
 * Mendukung input number maupun string terformat seperti "Rp 15.000.000".
 * @param nominal Angka nominal (e.g. 15000000 atau "Rp 15.000.000")
 * @returns Kalimat terbilang (e.g. "Lima Belas Juta Rupiah")
 */
export function terbilang(nominal: number | string | null | undefined): string {
  const num = parseNominal(nominal);

  if (num === 0) {
    return "Nol Rupiah";
  }

  const prefix = num < 0 ? "Minus " : "";
  const kata = angkaKeKata(Math.floor(Math.abs(num))).trim();

  // Bersihkan spasi ganda
  const cleanKata = kata.replace(/\s+/g, " ");

  return `${prefix}${cleanKata} Rupiah`;
}

export default terbilang;

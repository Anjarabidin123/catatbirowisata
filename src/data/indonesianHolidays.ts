/**
 * indonesianHolidays.ts
 * Database Hari Libur Nasional & Cuti Bersama Resmi Republik Indonesia (SKB 3 Menteri)
 * Digunakan untuk menandai Tanggal Merah, Hari Minggu, dan Peringatan Libur Nasional
 * pada Kalender Operasional Biro Wisata (High-Demand Tour Season).
 */

export interface HolidayInfo {
  date: string; // YYYY-MM-DD
  name: string;
  type: "nasional" | "cuti_bersama";
  isPeakSeason?: boolean;
  description?: string;
}

export const INDONESIAN_HOLIDAYS: Record<string, HolidayInfo> = {
  // ================= 2025 =================
  "2025-01-01": { date: "2025-01-01", name: "Tahun Baru 2025 Masehi", type: "nasional", isPeakSeason: true, description: "Libur awal tahun, demand wisata tinggi." },
  "2025-01-27": { date: "2025-01-27", name: "Isra Mi'raj Nabi Muhammad SAW", type: "nasional" },
  "2025-01-28": { date: "2025-01-28", name: "Cuti Bersama Tahun Baru Imlek", type: "cuti_bersama" },
  "2025-01-29": { date: "2025-01-29", name: "Tahun Baru Imlek 2576 Kongzili", type: "nasional", isPeakSeason: true },
  "2025-03-28": { date: "2025-03-28", name: "Cuti Bersama Hari Suci Nyepi", type: "cuti_bersama" },
  "2025-03-29": { date: "2025-03-29", name: "Hari Suci Nyepi (Tahun Baru Saka 1947)", type: "nasional" },
  "2025-03-31": { date: "2025-03-31", name: "Hari Raya Idul Fitri 1446 H", type: "nasional", isPeakSeason: true, description: "Mudik lebaran & libur panjang keluarga." },
  "2025-04-01": { date: "2025-04-01", name: "Hari Raya Idul Fitri 1446 H", type: "nasional", isPeakSeason: true },
  "2025-04-02": { date: "2025-04-02", name: "Cuti Bersama Idul Fitri", type: "cuti_bersama", isPeakSeason: true },
  "2025-04-03": { date: "2025-04-03", name: "Cuti Bersama Idul Fitri", type: "cuti_bersama", isPeakSeason: true },
  "2025-04-04": { date: "2025-04-04", name: "Cuti Bersama Idul Fitri", type: "cuti_bersama", isPeakSeason: true },
  "2025-04-07": { date: "2025-04-07", name: "Cuti Bersama Idul Fitri", type: "cuti_bersama", isPeakSeason: true },
  "2025-04-18": { date: "2025-04-18", name: "Wafat Yesus Kristus (Jumat Agung)", type: "nasional" },
  "2025-04-20": { date: "2025-04-20", name: "Hari Paskah", type: "nasional" },
  "2025-05-01": { date: "2025-05-01", name: "Hari Buruh Internasional", type: "nasional", isPeakSeason: true },
  "2025-05-12": { date: "2025-05-12", name: "Hari Raya Waisak 2569 BE", type: "nasional" },
  "2025-05-13": { date: "2025-05-13", name: "Cuti Bersama Hari Raya Waisak", type: "cuti_bersama" },
  "2025-05-29": { date: "2025-05-29", name: "Kenaikan Yesus Kristus", type: "nasional" },
  "2025-05-30": { date: "2025-05-30", name: "Cuti Bersama Kenaikan Yesus Kristus", type: "cuti_bersama" },
  "2025-06-01": { date: "2025-06-01", name: "Hari Lahir Pancasila", type: "nasional" },
  "2025-06-06": { date: "2025-06-06", name: "Hari Raya Idul Adha 1446 H", type: "nasional", isPeakSeason: true },
  "2025-06-09": { date: "2025-06-09", name: "Cuti Bersama Hari Raya Idul Adha", type: "cuti_bersama" },
  "2025-06-27": { date: "2025-06-27", name: "1 Muharram Tahun Baru Islam 1447 H", type: "nasional" },
  "2025-08-17": { date: "2025-08-17", name: "Hari Kemerdekaan RI Ke-80", type: "nasional", isPeakSeason: true, description: "HUT Kemerdekaan RI, pawai & wisata serentak." },
  "2025-09-05": { date: "2025-09-05", name: "Maulid Nabi Muhammad SAW", type: "nasional" },
  "2025-12-25": { date: "2025-12-25", name: "Hari Raya Natal", type: "nasional", isPeakSeason: true, description: "Puncak liburan Natal & Tahun Baru (Nataru)." },
  "2025-12-26": { date: "2025-12-26", name: "Cuti Bersama Hari Raya Natal", type: "cuti_bersama", isPeakSeason: true },

  // ================= 2026 (TAHUN AKTIF SISTEM) =================
  "2026-01-01": { date: "2026-01-01", name: "Tahun Baru 2026 Masehi", type: "nasional", isPeakSeason: true, description: "Libur awal tahun baru, demand pariwisata sangat tinggi." },
  "2026-01-16": { date: "2026-01-16", name: "Isra Mi'raj Nabi Muhammad SAW", type: "nasional" },
  "2026-02-16": { date: "2026-02-16", name: "Cuti Bersama Tahun Baru Imlek", type: "cuti_bersama" },
  "2026-02-17": { date: "2026-02-17", name: "Tahun Baru Imlek 2577 Kongzili", type: "nasional", isPeakSeason: true },
  "2026-03-19": { date: "2026-03-19", name: "Cuti Bersama Hari Raya Idul Fitri", type: "cuti_bersama", isPeakSeason: true },
  "2026-03-20": { date: "2026-03-20", name: "Hari Raya Idul Fitri 1447 H (Hari ke-1)", type: "nasional", isPeakSeason: true, description: "Hari Raya Idul Fitri & Peak Season Mudik / Wisata Keluarga Nusantara." },
  "2026-03-21": { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H (Hari ke-2)", type: "nasional", isPeakSeason: true },
  "2026-03-22": { date: "2026-03-22", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)", type: "nasional" },
  "2026-03-23": { date: "2026-03-23", name: "Cuti Bersama Hari Suci Nyepi", type: "cuti_bersama" },
  "2026-03-24": { date: "2026-03-24", name: "Cuti Bersama Hari Raya Idul Fitri", type: "cuti_bersama", isPeakSeason: true },
  "2026-04-03": { date: "2026-04-03", name: "Wafat Yesus Kristus (Jumat Agung)", type: "nasional", isPeakSeason: true, description: "Long weekend Paskah (Jumat s/d Minggu)." },
  "2026-04-05": { date: "2026-04-05", name: "Hari Paskah", type: "nasional" },
  "2026-05-01": { date: "2026-05-01", name: "Hari Buruh Internasional", type: "nasional", isPeakSeason: true, description: "Long weekend awal Mei, trip komunitas & gathering perusahaan." },
  "2026-05-14": { date: "2026-05-14", name: "Kenaikan Yesus Kristus", type: "nasional" },
  "2026-05-15": { date: "2026-05-15", name: "Cuti Bersama Kenaikan Yesus Kristus", type: "cuti_bersama" },
  "2026-05-27": { date: "2026-05-27", name: "Hari Raya Idul Adha 1447 H", type: "nasional", isPeakSeason: true },
  "2026-05-28": { date: "2026-05-28", name: "Cuti Bersama Hari Raya Idul Adha", type: "cuti_bersama" },
  "2026-05-31": { date: "2026-05-31", name: "Hari Raya Waisak 2570 BE", type: "nasional" },
  "2026-06-01": { date: "2026-06-01", name: "Hari Lahir Pancasila", type: "nasional" },
  "2026-06-16": { date: "2026-06-16", name: "Tahun Baru Islam 1448 Hijriah", type: "nasional" },
  "2026-08-17": { date: "2026-08-17", name: "Hari Proklamasi Kemerdekaan RI Ke-81", type: "nasional", isPeakSeason: true, description: "HUT RI ke-81, perayaan nasional dan karnaval kemerdekaan." },
  "2026-08-25": { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW", type: "nasional" },
  "2026-12-24": { date: "2026-12-24", name: "Cuti Bersama Hari Raya Natal", type: "cuti_bersama", isPeakSeason: true },
  "2026-12-25": { date: "2026-12-25", name: "Hari Raya Natal", type: "nasional", isPeakSeason: true, description: "Puncak Liburan Nataru (Natal & Tahun Baru). Siapkan armada & tour leader cadangan." },
  "2026-12-26": { date: "2026-12-26", name: "Cuti Bersama Hari Raya Natal", type: "cuti_bersama", isPeakSeason: true },

  // ================= 2027 =================
  "2027-01-01": { date: "2027-01-01", name: "Tahun Baru 2027 Masehi", type: "nasional", isPeakSeason: true },
  "2027-01-06": { date: "2027-01-06", name: "Isra Mi'raj Nabi Muhammad SAW", type: "nasional" },
  "2027-02-06": { date: "2027-02-06", name: "Tahun Baru Imlek 2578 Kongzili", type: "nasional", isPeakSeason: true },
  "2027-03-09": { date: "2027-03-09", name: "Hari Suci Nyepi (Tahun Baru Saka 1949)", type: "nasional" },
  "2027-03-10": { date: "2027-03-10", name: "Hari Raya Idul Fitri 1448 H (Hari ke-1)", type: "nasional", isPeakSeason: true },
  "2027-03-11": { date: "2027-03-11", name: "Hari Raya Idul Fitri 1448 H (Hari ke-2)", type: "nasional", isPeakSeason: true },
  "2027-03-26": { date: "2027-03-26", name: "Wafat Yesus Kristus (Jumat Agung)", type: "nasional" },
  "2027-05-01": { date: "2027-05-01", name: "Hari Buruh Internasional", type: "nasional", isPeakSeason: true },
  "2027-05-06": { date: "2027-05-06", name: "Kenaikan Yesus Kristus", type: "nasional" },
  "2027-05-16": { date: "2027-05-16", name: "Hari Raya Idul Adha 1448 H", type: "nasional", isPeakSeason: true },
  "2027-05-20": { date: "2027-05-20", name: "Hari Raya Waisak 2571 BE", type: "nasional" },
  "2027-06-01": { date: "2027-06-01", name: "Hari Lahir Pancasila", type: "nasional" },
  "2027-06-06": { date: "2027-06-06", name: "Tahun Baru Islam 1449 Hijriah", type: "nasional" },
  "2027-08-17": { date: "2027-08-17", name: "Hari Kemerdekaan RI Ke-82", type: "nasional", isPeakSeason: true },
  "2027-08-15": { date: "2027-08-15", name: "Maulid Nabi Muhammad SAW", type: "nasional" },
  "2027-12-25": { date: "2027-12-25", name: "Hari Raya Natal", type: "nasional", isPeakSeason: true },
};

/**
 * Format tanggal Date ke string key 'YYYY-MM-DD'
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Cek apakah sebuah tanggal adalah Hari Libur Nasional atau Cuti Bersama
 */
export function getIndonesianHoliday(date: Date): HolidayInfo | null {
  const key = toDateKey(date);
  return INDONESIAN_HOLIDAYS[key] || null;
}

/**
 * Cek apakah hari adalah Minggu (Sunday in JS = 0)
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Cek apakah hari adalah Sabtu (Saturday in JS = 6)
 */
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

export interface RedDateEvaluation {
  isRedDate: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  holiday: HolidayInfo | null;
  label: string;
}

/**
 * Evaluasi komprehensif apakah tanggal termasuk Tanggal Merah (Minggu / Libur Nasional / Cuti Bersama)
 */
export function evaluateRedDate(date: Date): RedDateEvaluation {
  const sun = isSunday(date);
  const sat = isSaturday(date);
  const hol = getIndonesianHoliday(date);

  const isRed = sun || hol !== null;
  let label = "";

  if (hol) {
    label = hol.name;
  } else if (sun) {
    label = "Hari Minggu";
  } else if (sat) {
    label = "Hari Sabtu";
  }

  return {
    isRedDate: isRed,
    isSunday: sun,
    isSaturday: sat,
    holiday: hol,
    label,
  };
}

/**
 * Ambil seluruh daftar hari libur dalam satu bulan tertentu
 */
export function getHolidaysInMonth(year: number, monthZeroBased: number): HolidayInfo[] {
  const prefix = `${year}-${String(monthZeroBased + 1).padStart(2, "0")}`;
  return Object.values(INDONESIAN_HOLIDAYS)
    .filter((h) => h.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date));
}

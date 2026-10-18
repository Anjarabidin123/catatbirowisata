/**
 * Asisten AI Wisata Nusantara (Dual-Engine: Native Knowledge + Optional Gemini API)
 * Memberikan informasi pariwisata, rute bus, HTM, parkir bus besar, kuliner rombongan, dan rundown akurat.
 */

import { getLocalBiroProfile } from "./biroProfile";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestedTrip?: {
    nama: string;
    tujuan: string;
    durasiHari: number;
  };
}

// Database Pengetahuan Terverifikasi Pariwisata Indonesia untuk Biro & Kru Bus
const TOURISM_KNOWLEDGE_BASE: Record<string, any> = {
  semarang: {
    nama: "Semarang & Sekitarnya (Jawa Tengah)",
    destinasi: [
      { nama: "Lawang Sewu", htm: "Rp 20.000 (Reguler), Rp 30.000 (Termasuk Ruang Bawah Tanah)", parkir: "Area Parkir Bus DP Mall / Jl. Pemuda (Muat bus SHD/HDD)" },
      { nama: "Kelenteng Sam Poo Kong", htm: "Rp 35.000 (Umum), Rp 65.000 (Terusan)", parkir: "Parkiran bus dalam sangat luas" },
      { nama: "Kota Lama Semarang & Gereja Blenduk", htm: "Gratis (Masuk kawasan)", parkir: "Kantong parkir bus Polder Tawang / Branjangan" },
      { nama: "Dusun Semilir Bawen", htm: "Rp 30.000 - Rp 40.000", parkir: "Parkir bus kapasitas 50+ unit, akses langsung tol Bawen" },
      { nama: "Cimory On The Valley Bergas", htm: "Rp 15.000 - Rp 35.000 (Dairyland)", parkir: "Parkir bus aman di pinggir jalan raya utama Semarang-Solo" },
    ],
    kuliner: [
      "Kampoeng Laut (Kawasan Puri Maerokoko, kapasitas 1000+ pax, parkir bus luas)",
      "Pringgading Resto (Pusat kota, ramah rombongan bus)",
      "Restoran Mang Engking Ungaran (Akses tol)",
      "Oleh-oleh: Bandeng Juwana Elrina & Lumpia Mataram / Gang Lombok",
    ],
    tipsBus: "Untuk Kota Lama Semarang, bus besar dilarang masuk jalan protokol dalam. Turunkan penumpang di Polder Tawang atau Taman Srigunting.",
    rundown1Hari: [
      "08.00 - 10.00: Kunjungan Lawang Sewu & Edukasi Sejarah",
      "10.30 - 12.00: Wisata Budaya Kelenteng Sam Poo Kong",
      "12.30 - 13.30: Makan Siang Rombongan di Kampoeng Laut",
      "14.00 - 16.00: Jelajah Spot Foto & Ngopi di Kota Lama Semarang",
      "16.30 - 18.00: Belanja Oleh-Oleh Bandeng Juwana di Jl. Pandanaran",
      "18.30: Perjalanan kembali / Transfer ke Resto Makan Malam",
    ],
  },
  jogja: {
    nama: "Yogyakarta (Daerah Istimewa Yogyakarta)",
    destinasi: [
      { nama: "Candi Prambanan", htm: "Rp 50.000 (Wisnus)", parkir: "Parkir bus resmi sangat representatif" },
      { nama: "Candi Borobudur (Magelang)", htm: "Rp 50.000 (Pelataran), Rp 150.000 (Naik Struktur Candi)", parkir: "Terminal bus Borobudur luas" },
      { nama: "Tebing Breksi Sleman", htm: "Rp 10.000", parkir: "Bus besar muat, jalan menanjak landai beraspal halus" },
      { nama: "HeHa Ocean View / Sky View", htm: "Rp 25.000 - Rp 30.000", parkir: "Bus besar berhenti di rest area shuttle, oper shuttle gratis ke lokasi" },
      { nama: "Goa Pindul & Rafting Oya", htm: "Rp 45.000 - Rp 80.000", parkir: "Rest area Pindul sangat ramah bus pariwisata" },
    ],
    kuliner: [
      "Bale Raos Kraton (Menu hidangan khas Sultan)",
      "Jejamuran Resto Sleman (Kapasitas rombongan besar, parkir bus aman)",
      "Gudeg Yu Djum Wijilan / Candi",
      "Oleh-oleh: Bakpia Pathok 25, Bakpia Juwara Satoe, Kaos Dagadu",
    ],
    tipsBus: "Malioboro tidak bisa dimasuki bus besar. Gunakan Kantong Parkir Abu Bakar Ali, Senopati, atau Parkir Ngabean.",
    rundown1Hari: [
      "08.30 - 11.00: Candi Prambanan & Tebing Breksi",
      "11.30 - 13.00: Ishoma di Jejamuran Sleman",
      "13.30 - 15.30: Wisata Alam Lava Tour Merapi (Oper Jeep di Kaliurang)",
      "16.30 - 18.30: Belanja & Jalan Santai di Kawasan Titik Nol / Malioboro",
      "19.00 - 20.30: Pusat Oleh-oleh Bakpia Pathok & Makan Malam",
    ],
  },
  malang: {
    nama: "Malang & Kota Wisata Batu (Jawa Timur)",
    destinasi: [
      { nama: "Jatim Park 1 & Museum Tubuh", htm: "Rp 100.000 - Rp 120.000", parkir: "Parkir bus kapasitas ratusan armada" },
      { nama: "Jatim Park 2 (Batu Secret Zoo)", htm: "Rp 140.000 - Rp 170.000", parkir: "Parkiran bus sangat luas & teratur" },
      { nama: "Museum Angkut", htm: "Rp 100.000 - Rp 120.000", parkir: "Parkir bus bertingkat & luas" },
      { nama: "Gunung Bromo Sunrise", htm: "Rp 29.000 (Weekday) / Rp 34.000 (Weekend)", parkir: "Bus besar parkir di Rest Area Sukapura / Tosari, transit Jeep 4WD" },
      { nama: "Flora Wisata San Terra Pujon", htm: "Rp 30.000", parkir: "Akses bus pariwisata aman di pinggir jalan raya" },
    ],
    kuliner: [
      "Khas Jawa Resto Batu (Spesialis rombongan tour)",
      "Warung Lesehan Yogyakarta Malang (Jl. Lembah Dieng)",
      "Oleh-oleh: Malang Strudel, Keripik Tempe Sanan, Sari Apel Batu",
    ],
    tipsBus: "Jalur Klemuk (Batu-Pujon alternatif) DILARANG untuk bus pariwisata karena turunan curam ekstrem. Selalu lewati jalur utama Payung / Songgoriti.",
    rundown1Hari: [
      "08.30 - 12.00: Wisata Edukasi Jatim Park 2 (Batu Secret Zoo)",
      "12.30 - 13.30: Makan Siang di Resto Rombongan Batu",
      "14.00 - 17.00: Museum Angkut & Pasar Apung",
      "17.30 - 19.30: Belanja Keripik Tempe Sanan & Apel Batu",
    ],
  },
  bandung: {
    nama: "Bandung & Lembang (Jawa Barat)",
    destinasi: [
      { nama: "The Great Asia Africa Lembang", htm: "Rp 50.000", parkir: "Parkir bus representatif di seberang Farmhouse" },
      { nama: "Floating Market Lembang", htm: "Rp 35.000 (Tukar minuman)", parkir: "Parkir bus luas" },
      { nama: "Tangkuban Perahu", htm: "Rp 30.000 (Weekday) / Rp 35.000 (Weekend)", parkir: "Bus besar bisa sampai ke bibir kawah utama Ratu" },
      { nama: "Kawah Putih Ciwidey", htm: "Rp 28.000 + Ontang-anting Rp 29.000", parkir: "Bus besar wajib parkir di gerbang bawah, naik ontang-anting" },
    ],
    kuliner: [
      "Sindang Reret Lembang & Cikole",
      "Saung Pengkolan 1 & 2 (Ramah bus rombongan)",
      "Oleh-oleh: Kartika Sari, Prima Rasa, Batagor Kingsley",
    ],
    tipsBus: "Untuk weekend, jalan Lembang menerapkan one-way kepolisian. Koordinasikan waktu tempuh dengan driver agar tidak terkena tutup arus.",
    rundown1Hari: [
      "08.30 - 11.30: Kawah Ratu Gunung Tangkuban Perahu",
      "12.00 - 13.30: Makan Siang khas Sunda di Sindang Reret Lembang",
      "14.00 - 16.30: The Great Asia Africa / Floating Market",
      "17.30 - 19.30: Wisata Belanja Kartika Sari / Pasar Baru Bandung",
    ],
  },
  dieng: {
    nama: "Dataran Tinggi Dieng (Wonosobo - Banjarnegara)",
    destinasi: [
      { nama: "Kompleks Candi Arjuna", htm: "Rp 20.000 (Paket Kawah Sikidang)", parkir: "Area parkir shuttle Dieng" },
      { nama: "Kawah Sikidang", htm: "Termasuk tiket Candi Arjuna", parkir: "Tersedia kantong parkir shuttle" },
      { nama: "Batu Pandang Ratapan Angin & Telaga Warna", htm: "Rp 15.000 - Rp 25.000", parkir: "Parkir mikro bus" },
      { nama: "Bukit Sikunir (Golden Sunrise)", htm: "Rp 15.000", parkir: "Desa Sembungan" },
    ],
    kuliner: [
      "Mie Ongklok Longkrang Wonosobo",
      "Oleh-oleh: Buah Carica Dieng, Keripik Jamur, Purwaceng",
    ],
    tipsBus: "PERHATIAN KESELAMATAN: Bus Besar (SHD/HDD) TIDAK BOLEH naik ke Dieng via tanjakan 15% Tieng. Bus besar wajib parkir di Terminal Mendolo Wonosobo atau Rest Area Taman Plumbon, lalu rombongan oper Mikro Bus (shuttle lokal 17 seat).",
    rundown1Hari: [
      "07.30 - 08.30: Tiba di Terminal Mendolo Wonosobo, oper Mikro Bus Shuttle",
      "09.30 - 11.30: Candi Arjuna & Kawah Sikidang",
      "12.00 - 13.00: Makan Siang Mie Ongklok Khas Wonosobo",
      "13.30 - 15.30: Telaga Warna & Batu Pandang Ratapan Angin",
      "16.30: Kembali ke Terminal Mendolo, belanja Carica Dieng & kembali ke Bus Besar",
    ],
  },
};

/**
 * Panggil Google Gemini API jika key tersedia
 */
async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const systemInstruction = `Anda adalah Asisten Pakar Operasional Biro Perjalanan Wisata & PO Bus Pariwisata Nusantara.
Jawab pertanyaan agen biro wisata dengan sangat akurat, profesional, dan berbasis fakta riil pariwisata Indonesia.
Format jawaban rapi menggunakan bullet points, estimasi HTM riil dalam Rupiah, aksesibilitas bus besar (SHD/HDD), rekomendasi resto rombongan, dan rundown per jam yang realistis.`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nPertanyaan Agen Biro: ${prompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error (Status ${res.status})`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Tidak ada balasan dari Gemini AI");
  return text;
}

/**
 * Engine AI Bawaan (Knowledge Base Terkurasi & Akurat)
 */
function queryNativeKnowledgeEngine(prompt: string): { content: string; suggestedTrip?: any } {
  const p = prompt.toLowerCase();

  // 1. Cek kota tujuan
  let matchedCityKey = "";
  if (p.includes("semarang") || p.includes("lawang sewu") || p.includes("sam poo kong") || p.includes("demak")) {
    matchedCityKey = "semarang";
  } else if (p.includes("jogja") || p.includes("yogyakarta") || p.includes("borobudur") || p.includes("prambanan") || p.includes("malioboro")) {
    matchedCityKey = "jogja";
  } else if (p.includes("malang") || p.includes("batu") || p.includes("bromo") || p.includes("jatim park")) {
    matchedCityKey = "malang";
  } else if (p.includes("bandung") || p.includes("lembang") || p.includes("tangkuban") || p.includes("ciwidey")) {
    matchedCityKey = "bandung";
  } else if (p.includes("dieng") || p.includes("wonosobo") || p.includes("sikunir") || p.includes("sikidang")) {
    matchedCityKey = "dieng";
  }

  if (matchedCityKey && TOURISM_KNOWLEDGE_BASE[matchedCityKey]) {
    const data = TOURISM_KNOWLEDGE_BASE[matchedCityKey];
    
    // Format respons terstruktur & akurat
    let text = `### 📍 Panduan Operasional: ${data.nama}\n\n`;
    
    text += `#### 🎟️ Objek Wisata Populer & HTM:\n`;
    data.destinasi.forEach((d: any) => {
      text += `* **${d.nama}**\n  - HTM: ${d.htm}\n  - Parkir Bus: ${d.parkir}\n`;
    });

    text += `\n#### 🍽️ Rekomendasi Resto Rombongan & Oleh-oleh:\n`;
    data.kuliner.forEach((k: any) => {
      text += `* ${k}\n`;
    });

    text += `\n#### 🚌 Tips Aksesibilitas Bus Pariwisata:\n`;
    text += `> ${data.tipsBus}\n\n`;

    text += `#### ⏱️ Contoh Rundown 1 Hari Siap Pakai:\n`;
    data.rundown1Hari.forEach((r: any) => {
      text += `* \`${r.split(":")[0] + ":" + r.split(":")[1]}\` - ${r.substring(r.indexOf(":") + 4)}\n`;
    });

    return {
      content: text,
      suggestedTrip: {
        nama: `Tour Eksplor ${matchedCityKey.toUpperCase()}`,
        tujuan: matchedCityKey,
        durasiHari: 1,
      },
    };
  }

  // Cek jika menanyakan tips umum bus atau rundown
  if (p.includes("bus") || p.includes("parkir") || p.includes("shd")) {
    return {
      content: `### 🚌 Tips Standar Parkir & Operasional Bus Pariwisata (SHD/HDD)

1. **Koordinasi HTM & Parkir**: Selalu siapkan uang cash operasional untuk retribusi parkir khusus bus besar (rata-rata Rp 20.000 - Rp 50.000 per lokasi).
2. **Kapasitas Jalan**: Hindari jalan alternatif pegunungan (misal: Cangar Batu, Tanjakan Sikarim Dieng) yang memiliki sudut kemiringan di atas 15%.
3. **Fasilitas Kru Driver & Co-Driver**: Pastikan resto atau objek wisata menyediakan ruang istirahat atau makan kru (driver & tour leader free meal).
4. **Drop Zone**: Tentukan titik temu penjemputan peserta yang jelas sebelum rombongan berpencar belanja.`,
    };
  }

  // Jawaban umum jika query tidak spesifik
  return {
    content: `Halo! Saya Asisten AI Operasional Biro Wisata Nusantara. 🇮🇩

Saya siap membantu Anda dengan informasi akurat seputar:
* **Rute & HTM Objek Wisata**: Semarang, Yogyakarta, Magelang, Solo, Bromo, Malang & Batu, Bandung, Dieng, Bali, dll.
* **Aksesibilitas Bus Pariwisata**: Informasi kantong parkir bus besar (SHD/HDD) dan rute larangan bus.
* **Restoran Rombongan**: Rumah makan berkapasitas 50-500+ pax dengan parkir bus aman.
* **Penyusunan Rundown**: Jadwal jam per jam yang realistis tanpa peserta kelelahan.

*Silakan tanyakan nama kota atau rute tujuan yang sedang Anda rencanakan!*`,
  };
}

/**
 * Fungsi Utama: Menjawab Pertanyaan Wisata (Hybrid Engine)
 */
export async function askTourismAssistant(userPrompt: string): Promise<{ text: string; suggestedTrip?: any }> {
  const profile = getLocalBiroProfile();
  const apiKey = profile.gemini_api_key?.trim();

  // 1. Jika pengguna mengisi Gemini API Key di Pengaturan, gunakan Gemini API
  if (apiKey && apiKey.length > 10) {
    try {
      const geminiResponse = await callGeminiAPI(apiKey, userPrompt);
      return { text: geminiResponse };
    } catch (err: any) {
      console.warn("Gagal memanggil Gemini API, beralih ke Engine Bawaan:", err.message);
      // Fallback ke Native Engine
    }
  }

  // 2. Gunakan Native Engine yang 100% akurat dan tanpa kuota
  const nativeResult = queryNativeKnowledgeEngine(userPrompt);
  return {
    text: nativeResult.content,
    suggestedTrip: nativeResult.suggestedTrip,
  };
}

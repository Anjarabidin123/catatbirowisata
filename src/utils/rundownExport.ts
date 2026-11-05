import { Capacitor } from "@capacitor/core";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { generateRundownPDF } from "./pdfGenerator";

interface TripRow {
  id: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
  nama_kendaraan?: string | null;
  nomor_polisi?: string | null;
  nama_driver?: string | null;
  jumlah_penumpang?: number | null;
  catatan?: string | null;
}

interface RundownRow {
  hari_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  judul_acara: string;
  keterangan: string | null;
}

const loadTripAndRundown = async (tripId: string) => {
  const [tripRes, rundownRes, destRes] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase
      .from("rundown_acara")
      .select("*")
      .eq("trip_id", tripId)
      .order("hari_ke", { ascending: true })
      .order("jam_mulai", { ascending: true }),
    supabase
      .from("trip_destinations")
      .select("*")
      .eq("trip_id", tripId)
      .order("urutan", { ascending: true }),
  ]);

  if (tripRes.error || !tripRes.data) {
    throw new Error("Trip tidak ditemukan");
  }

  return {
    trip: tripRes.data as TripRow,
    rundown: (rundownRes.data || []) as RundownRow[],
    destinations: destRes.data || [],
  };
};

/** Buat & unduh PDF rundown resmi (lengkap dengan keterangan tiap acara). */
export const exportTripRundownPDF = async (tripId: string): Promise<void> => {
  const { trip, rundown, destinations } = await loadTripAndRundown(tripId);
  if (rundown.length === 0) {
    throw new Error("Belum ada data rundown acara");
  }

  await generateRundownPDF({
    trip,
    rundown: rundown.map((r) => ({
      hariKe: r.hari_ke,
      jamMulai: r.jam_mulai?.substring(0, 5),
      jamSelesai: r.jam_selesai?.substring(0, 5),
      judulAcara: r.judul_acara,
      keterangan: r.keterangan || undefined,
    })),
    destinations: destinations.map((d: any) => ({
      nama: d.nama_destinasi,
      lokasi: d.lokasi || undefined,
      catatan: d.catatan || undefined,
    })),
    autoDownload: true,
  });
};

/** Bagikan rundown (teks lengkap + keterangan) ke WhatsApp. */
export const shareTripRundownWA = async (tripId: string): Promise<void> => {
  const { trip, rundown } = await loadTripAndRundown(tripId);
  if (rundown.length === 0) {
    throw new Error("Belum ada data rundown acara");
  }

  const grouped = rundown.reduce<Record<number, RundownRow[]>>((acc, item) => {
    (acc[item.hari_ke] ||= []).push(item);
    return acc;
  }, {});

  const body = Object.entries(grouped)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, items]) =>
      [
        `*Hari ${day}*`,
        ...items.map((it) => {
          const note = it.keterangan ? `\n   ${it.keterangan}` : "";
          return `• ${it.jam_mulai?.substring(0, 5)} - ${it.jam_selesai?.substring(0, 5)} ${it.judul_acara}${note}`;
        }),
      ].join("\n")
    )
    .join("\n\n");

  const tgl = format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: localeId });
  const tglAkhir =
    trip.tanggal_selesai && trip.tanggal_selesai !== trip.tanggal
      ? ` s/d ${format(new Date(trip.tanggal_selesai), "dd MMMM yyyy", { locale: localeId })}`
      : "";

  const text = `*Rundown: ${trip.nama_trip}*\nTanggal: ${tgl}${tglAkhir}\nTujuan: ${trip.tujuan}\n\n${body}`;
  const encoded = encodeURIComponent(text);

  if (Capacitor.isNativePlatform()) {
    window.location.assign(`whatsapp://send?text=${encoded}`);
  } else {
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
  }
};

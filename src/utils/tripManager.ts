import { supabase } from "@/integrations/supabase/client";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

/**
 * Menghapus trip beserta seluruh data relasinya di database Supabase dan cache lokal
 */
export async function deleteTripFull(tripId: string, tripName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Hapus entitas anak di database secara terurut agar tidak melanggar foreign key constraint
    const childTables = [
      "rundown_acara",
      "trip_price_notes",
      "trip_destination_notes",
      "trip_destinations",
      "trip_vehicles",
      "keuangan",
      "media",
      "reminders",
      "notes",
    ];

    for (const table of childTables) {
      try {
        await supabase.from(table as any).delete().eq("trip_id", tripId);
      } catch (err) {
        console.warn(`Peringatan saat menghapus relasi ${table}:`, err);
      }
    }

    // 2. Hapus trip utama
    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    if (error) throw error;

    // 3. Bersihkan data lokal/cache yang terkait trip ini
    try {
      localStorage.removeItem(`bus_seat_manifest_${tripId}`);
      localStorage.removeItem(`trip_checklist_${tripId}`);
      localStorage.removeItem(`trip_cashback_${tripId}`);
      
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const updated = list.filter((t: any) => t.id !== tripId);
          localStorage.setItem("catatbiro_cached_trips", JSON.stringify(updated));
        }
      }
    } catch {}

    // 4. Catat aktivitas audit
    try {
      logCrewActivity({
        kategori: "operasional_trip",
        aksi: "Menghapus Trip",
        detail: `Menghapus trip "${tripName || tripId}" beserta seluruh data operasional, rundown, dan manifest terkait.`,
        tripName: tripName || undefined,
        status: "sukses",
      });
    } catch {}

    // 5. Kirim event global agar seluruh halaman (Dashboard, Trips, Laporan) langsung sinkron
    window.dispatchEvent(new CustomEvent("catatbiro-trips-updated", { detail: { deletedId: tripId } }));

    return { success: true };
  } catch (err: any) {
    console.error("Gagal menghapus trip:", err);
    return { success: false, error: err.message || "Gagal menghapus trip dari database" };
  }
}

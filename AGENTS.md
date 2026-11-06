# Aturan Arsitektur & Standar Pengembangan SaaS CatatBiro Wisata

Dokumen aturan ini wajib dipatuhi oleh seluruh asisten pengembang dan AI agents yang bekerja pada repositori `trip-catat-app`.

---

## 1. Pemisahan Ketat Rute Klien vs Konsol Internal Super Admin
- **Rute Publik & Klien Biro**:
  - Rute-rute seperti `/goal` (Target Omset & Armada), `/boost` (Katalog Upgrade Lisensi & Cloud VPS), `/learn` (Pusat SOP & Panduan Operasional), `/dashboard`, `/keuangan`, `/trips`, `/laporan`, dan `/pengaturan` adalah hak akses bagi klien biro wisata.
  - **DILARANG KERAS** mengalihkan (*redirect*) rute-rute publik/klien ini ke dalam konsol internal Super Admin (`/super-admin/*`), karena akun biro biasa akan terblokir oleh *barrier* otorisasi (`anjarbdn@gmail.com`).
- **Konsol Root Super Admin**:
  - Semua modul internal manajemen platform SaaS harus selalu berada di bawah namespace terproteksi `/super-admin/*` (misal `/super-admin/overview`, `/super-admin/tenants`, `/super-admin/feature-gating`, `/super-admin/broadcasts`, `/super-admin/tickets`, `/super-admin/settings`, dsb).
  - Konsol Super Admin dilindungi oleh whitelist email Founder (`anjarbdn@gmail.com`).

---

## 2. Pola Sinkronisasi Reaktif Supabase (Anti-Flicker & Optimistic Updates)
- Setiap interaksi sakelar (*toggle switch*) seperti Mode Desktop PC, AI Asisten, PDF Bersih, atau Kuota Trip/Kru di modul Super Admin harus menerapkan **Optimistic Local State Update**:
  1. Perbarui *state* lokal React seketika (0 ms delay) agar antarmuka tidak mengalami *flicker* atau mental kembali ke posisi lama.
  2. Simpan ke `localStorage` melalui fungsi pembantu `updateTenant()`.
  3. Kirim mutasi pembaruan asinkron langsung ke tabel Supabase (`public.feature_entitlements` dan `public.tenants`) melalui `updateTenantInSupabase()`.
  4. **JANGAN** memanggil fungsi `onRefresh()` atau `fetchTenantsFromSupabase()` secara langsung sebelum mutasi Supabase selesai, karena akan mengambil baris data lama dari server dan menimpa *state* baru di layar.

---

## 3. Standar Pengaman Impersonasi Multi-Tenant
- Ketika Super Admin mengaktifkan mode impersonasi untuk melihat atau menguji antarmuka biro klien:
  - Wajib menampilkan banner tetap (`ImpersonationBanner.tsx`) di bagian paling atas seluruh layar aplikasi PWA.
  - Banner harus dengan jelas menampilkan nama biro yang sedang aktif disimulasikan dan tombol merah yang mudah dijangkau: **"Kembali ke Super Admin"** (`stopImpersonation()`).

---

## 4. Perlindungan Fitur Operasional PWA Biro
- Seluruh fitur teknis operasional harian biro wisata (*Word Rundown Parser, Denah Kursi Bus 50-Seat, Kas Laba/Rugi, Kwitansi/Invoice Tamu, WhatsApp Broadcast, Cashback*) **tetap terbuka bebas 100% tanpa paywall buatan** untuk semua biro yang terdaftar.
- Pembatasan lisensi hanya berlaku pada aspek komersial tingkat enterprise: *Akses Mode Desktop di PC Laptop, Watermark PDF kop surat resmi, Asisten AI Wisata Gemini, dan Kuota Trip/Kru Maksimal*.

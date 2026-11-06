# Aturan Arsitektur Routing & Isolasi Multi-Tenant

1. Pemisahan Rute Klien vs Super Admin:
   - Rute publik/klien biro (/boost, /learn, /goal, /auth, /pengaturan) TIDAK BOLEH dialihkan (redirect) ke dalam rute internal /super-admin/*.
   - Modul internal Super Admin harus selalu berada di bawah namespace terproteksi /super-admin/* dan hanya dapat diakses oleh whitelist Super Admin (anjarbdn@gmail.com).

2. Pola Sinkronisasi Data Supabase (Anti-Flicker):
   - Jangan memanggil fungsi fetch/refresh global seketika setelah mutasi user action.
   - Gunakan pendekatan optimis: perbarui state lokal dan localStorage seketika, lalu kirim mutasi asinkron ke Supabase.

3. Standar Impersonasi Tenant:
   - Setiap fitur impersonasi harus memunculkan banner status tetap di bagian atas layar PWA yang menampilkan nama biro yang sedang aktif disimulasikan dan tombol 'Kembali ke Super Admin'.

4. Non-Destructive Reset:
   - Tombol reset database pengembang tidak boleh menghapus histori audit logs tanpa jejak audit peristiwa reset itu sendiri.

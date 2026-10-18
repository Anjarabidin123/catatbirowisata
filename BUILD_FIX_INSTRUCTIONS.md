# Instruksi Perbaikan Build APK

## Masalah Database yang Diperbaiki

Aplikasi sekarang dapat menangani error database dengan graceful degradation. Namun, untuk fungsi penuh, Anda perlu menjalankan SQL berikut di Lovable Cloud SQL Editor:

### 1. Buat Tabel trip_vehicles (jika belum ada)

```sql
CREATE TABLE IF NOT EXISTS public.trip_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_po TEXT NOT NULL,
  harga_per_bus NUMERIC DEFAULT 0,
  dp NUMERIC DEFAULT 0,
  jumlah_penumpang_per_bus INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trip_vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own vehicles"
  ON public.trip_vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles"
  ON public.trip_vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
  ON public.trip_vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
  ON public.trip_vehicles FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. Tambahkan Kolom budget_dp ke Tabel trips (opsional)

```sql
-- Tambahkan kolom jika diperlukan untuk fitur DP
-- Jika tidak ada, aplikasi akan tetap berfungsi tanpa fitur ini
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS budget_dp NUMERIC DEFAULT 0;
```

## Cara Menjalankan SQL

1. Buka Lovable Cloud
2. Navigasi ke **Database → SQL Editor**
3. Copy-paste script di atas
4. Klik **Run** untuk execute

## Perubahan yang Telah Dilakukan

### 1. ✅ Halaman Keuangan - Dirombak Total
- Format tabel ringkas dan efisien
- Pemasukan = hijau, Pengeluaran = merah
- Ikon mata untuk cashback
- Edit dan hapus tersembunyi dalam dropdown (ChevronDown)
- Menampilkan waktu transaksi
- UI lebih simpel, muat lebih banyak dalam satu layar

### 2. ✅ Catatan Harga - Urutan Diperbaiki
- Catatan lama di atas, catatan baru di bawah

### 3. ✅ Tombol Search - Keyboard Mobile
- Menambahkan `type="search"` dan `inputMode="search"`
- Menambahkan `autoFocus` saat search aktif

### 4. ✅ Tombol Refresh - Berfungsi
- Refresh button di Dashboard sudah berfungsi dengan benar

### 5. ✅ Rundown Acara - Ikon Edit
- Mengganti ikon dollar dengan ikon pensil (edit)

### 6. ✅ Error Handling
- Aplikasi sekarang menangani database errors dengan graceful
- Tidak akan crash jika tabel/kolom tidak ada

### 7. ✅ Refactoring Lengkap
- Code lebih clean dan maintainable
- Komponen dioptimasi untuk performa

## Logo & Icon

Logo sudah dikonfigurasi dengan benar di:
- `public/malika-logo.png` - untuk web/PWA
- `resources/icon.png` - untuk native app (Android/iOS)

Jika logo tidak muncul di home screen:
1. Pastikan file `resources/icon.png` minimal 1024x1024px
2. Jalankan `npx cap sync` setelah update icon
3. Rebuild APK

## Build APK

Untuk build APK setelah perbaikan:

```bash
# 1. Install dependencies
npm install

# 2. Build project
npm run build

# 3. Sync dengan Capacitor
npx cap sync android

# 4. Open Android Studio
npx cap open android

# 5. Di Android Studio:
# - Build > Generate Signed Bundle/APK
# - Pilih APK
# - Follow wizard untuk sign dan build
```

## Catatan Penting

- Semua perubahan sudah di-commit
- Database errors sekarang di-handle dengan graceful
- Aplikasi tetap berfungsi meskipun ada missing tables/columns
- Untuk fungsi penuh, jalankan SQL scripts di atas

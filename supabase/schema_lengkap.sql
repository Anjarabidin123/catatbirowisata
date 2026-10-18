-- ============================================================
-- SCHEMA LENGKAP APLIKASI TRIP CATAT
-- Satu script lengkap untuk dijalankan di SQL Editor Supabase
-- Aman dijalankan berulang kali (Idempotent)
-- ============================================================

-- 1. Helper function untuk auto update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABEL: trips
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama_trip TEXT NOT NULL,
  tanggal DATE NOT NULL,
  tujuan TEXT NOT NULL,
  catatan TEXT,
  nama_kendaraan TEXT,
  jumlah_penumpang INTEGER,
  budget_estimasi NUMERIC,
  nomor_polisi TEXT,
  nama_driver TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastikan kolom tambahan trips ada
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS nama_kendaraan TEXT,
  ADD COLUMN IF NOT EXISTS jumlah_penumpang INTEGER,
  ADD COLUMN IF NOT EXISTS budget_estimasi NUMERIC,
  ADD COLUMN IF NOT EXISTS nomor_polisi TEXT,
  ADD COLUMN IF NOT EXISTS nama_driver TEXT;

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own trips" ON public.trips;
CREATE POLICY "Users can create their own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;
CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);


-- 3. TABEL: destinations (Daftar Master Destinasi)
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama_destinasi TEXT NOT NULL,
  lokasi TEXT,
  kategori TEXT,
  estimasi_biaya NUMERIC,
  durasi_standar INTEGER,
  deskripsi TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own destinations" ON public.destinations;
CREATE POLICY "Users can view their own destinations" ON public.destinations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own destinations" ON public.destinations;
CREATE POLICY "Users can create their own destinations" ON public.destinations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own destinations" ON public.destinations;
CREATE POLICY "Users can update their own destinations" ON public.destinations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own destinations" ON public.destinations;
CREATE POLICY "Users can delete their own destinations" ON public.destinations FOR DELETE USING (auth.uid() = user_id);


-- 4. TABEL: trip_destinations (Destinasi per Trip)
CREATE TABLE IF NOT EXISTS public.trip_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama_destinasi TEXT NOT NULL,
  lokasi TEXT,
  htm NUMERIC DEFAULT 0,
  biaya_parkir NUMERIC DEFAULT 0,
  biaya_makan NUMERIC DEFAULT 0,
  biaya_lain_lain NUMERIC DEFAULT 0,
  urutan INTEGER DEFAULT 1,
  durasi INTEGER,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trip_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trip destinations" ON public.trip_destinations;
CREATE POLICY "Users can view their own trip destinations" ON public.trip_destinations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own trip destinations" ON public.trip_destinations;
CREATE POLICY "Users can create their own trip destinations" ON public.trip_destinations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trip destinations" ON public.trip_destinations;
CREATE POLICY "Users can update their own trip destinations" ON public.trip_destinations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trip destinations" ON public.trip_destinations;
CREATE POLICY "Users can delete their own trip destinations" ON public.trip_destinations FOR DELETE USING (auth.uid() = user_id);


-- 5. TABEL: keuangan (Pencatatan Keuangan)
CREATE TABLE IF NOT EXISTS public.keuangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  jumlah NUMERIC NOT NULL,
  keterangan TEXT,
  tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cashback NUMERIC,
  harga_satuan NUMERIC,
  jumlah_item INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.keuangan 
  ADD COLUMN IF NOT EXISTS cashback NUMERIC,
  ADD COLUMN IF NOT EXISTS harga_satuan NUMERIC,
  ADD COLUMN IF NOT EXISTS jumlah_item INTEGER;

ALTER TABLE public.keuangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own keuangan" ON public.keuangan;
CREATE POLICY "Users can view their own keuangan" ON public.keuangan FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own keuangan" ON public.keuangan;
CREATE POLICY "Users can create their own keuangan" ON public.keuangan FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own keuangan" ON public.keuangan;
CREATE POLICY "Users can update their own keuangan" ON public.keuangan FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own keuangan" ON public.keuangan;
CREATE POLICY "Users can delete their own keuangan" ON public.keuangan FOR DELETE USING (auth.uid() = user_id);


-- 6. TABEL: notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  konten TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
CREATE POLICY "Users can create their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);


-- 7. TABEL: reminders (Pengingat)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  keterangan TEXT,
  tanggal_waktu TIMESTAMP WITH TIME ZONE NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
CREATE POLICY "Users can view their own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own reminders" ON public.reminders;
CREATE POLICY "Users can create their own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reminders" ON public.reminders;
CREATE POLICY "Users can update their own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;
CREATE POLICY "Users can delete their own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);


-- 8. TABEL: rundown_acara
CREATE TABLE IF NOT EXISTS public.rundown_acara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hari_ke INTEGER NOT NULL DEFAULT 1,
  jam_mulai TEXT NOT NULL,
  jam_selesai TEXT NOT NULL,
  judul_acara TEXT NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.rundown_acara ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rundown acara" ON public.rundown_acara;
CREATE POLICY "Users can view their own rundown acara" ON public.rundown_acara FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own rundown acara" ON public.rundown_acara;
CREATE POLICY "Users can create their own rundown acara" ON public.rundown_acara FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rundown acara" ON public.rundown_acara;
CREATE POLICY "Users can update their own rundown acara" ON public.rundown_acara FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rundown acara" ON public.rundown_acara;
CREATE POLICY "Users can delete their own rundown acara" ON public.rundown_acara FOR DELETE USING (auth.uid() = user_id);


-- 9. TABEL: trip_price_notes
CREATE TABLE IF NOT EXISTS public.trip_price_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keterangan TEXT NOT NULL,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trip_price_notes ADD COLUMN IF NOT EXISTS catatan TEXT;

ALTER TABLE public.trip_price_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trip price notes" ON public.trip_price_notes;
CREATE POLICY "Users can view their own trip price notes" ON public.trip_price_notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own trip price notes" ON public.trip_price_notes;
CREATE POLICY "Users can create their own trip price notes" ON public.trip_price_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trip price notes" ON public.trip_price_notes;
CREATE POLICY "Users can update their own trip price notes" ON public.trip_price_notes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trip price notes" ON public.trip_price_notes;
CREATE POLICY "Users can delete their own trip price notes" ON public.trip_price_notes FOR DELETE USING (auth.uid() = user_id);


-- 10. TABEL: trip_destination_notes
CREATE TABLE IF NOT EXISTS public.trip_destination_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  catatan TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trip_destination_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trip destination notes" ON public.trip_destination_notes;
CREATE POLICY "Users can view their own trip destination notes" ON public.trip_destination_notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own trip destination notes" ON public.trip_destination_notes;
CREATE POLICY "Users can create their own trip destination notes" ON public.trip_destination_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trip destination notes" ON public.trip_destination_notes;
CREATE POLICY "Users can update their own trip destination notes" ON public.trip_destination_notes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trip destination notes" ON public.trip_destination_notes;
CREATE POLICY "Users can delete their own trip destination notes" ON public.trip_destination_notes FOR DELETE USING (auth.uid() = user_id);


-- 11. TABEL: trip_vehicles (Kendaraan / Bus)
CREATE TABLE IF NOT EXISTS public.trip_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama_po TEXT NOT NULL,
  harga_per_bus NUMERIC NOT NULL DEFAULT 0,
  dp NUMERIC NOT NULL DEFAULT 0,
  jumlah_penumpang_per_bus INTEGER NOT NULL DEFAULT 0,
  cashback NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trip_vehicles ADD COLUMN IF NOT EXISTS cashback NUMERIC DEFAULT 0;

ALTER TABLE public.trip_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "Users can view their own trip vehicles" ON public.trip_vehicles;
CREATE POLICY "Users can view their own trip vehicles" ON public.trip_vehicles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "Users can create their own trip vehicles" ON public.trip_vehicles;
CREATE POLICY "Users can create their own trip vehicles" ON public.trip_vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "Users can update their own trip vehicles" ON public.trip_vehicles;
CREATE POLICY "Users can update their own trip vehicles" ON public.trip_vehicles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "Users can delete their own trip vehicles" ON public.trip_vehicles;
CREATE POLICY "Users can delete their own trip vehicles" ON public.trip_vehicles FOR DELETE USING (auth.uid() = user_id);


-- 12. TABEL: media (Dokumentasi / Foto)
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own media" ON public.media;
CREATE POLICY "Users can view their own media" ON public.media FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own media" ON public.media;
CREATE POLICY "Users can create their own media" ON public.media FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own media" ON public.media;
CREATE POLICY "Users can delete their own media" ON public.media FOR DELETE USING (auth.uid() = user_id);


-- 13. ENABLE REPLICA IDENTITY & REALTIME (Sinkronisasi Data Realtime)
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.destinations REPLICA IDENTITY FULL;
ALTER TABLE public.trip_destinations REPLICA IDENTITY FULL;
ALTER TABLE public.keuangan REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.reminders REPLICA IDENTITY FULL;
ALTER TABLE public.rundown_acara REPLICA IDENTITY FULL;
ALTER TABLE public.trip_price_notes REPLICA IDENTITY FULL;
ALTER TABLE public.trip_destination_notes REPLICA IDENTITY FULL;
ALTER TABLE public.trip_vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.media REPLICA IDENTITY FULL;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'trips', 'destinations', 'trip_destinations', 'keuangan', 
    'notes', 'reminders', 'rundown_acara', 'trip_price_notes', 
    'trip_destination_notes', 'trip_vehicles', 'media'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

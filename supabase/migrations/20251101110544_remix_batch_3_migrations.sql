
-- Migration: 20251101062956

-- Migration: 20251031033213

-- Migration: 20251031031225

-- Migration: 20251030133535

-- Migration: 20251030121514
-- Tabel untuk trip
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama_trip TEXT NOT NULL,
  tanggal DATE NOT NULL,
  tujuan TEXT NOT NULL,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk keuangan per trip
CREATE TABLE IF NOT EXISTS public.keuangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  jumlah DECIMAL(15,2) NOT NULL,
  keterangan TEXT,
  tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk media (foto/video)
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

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk trips
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies untuk keuangan
CREATE POLICY "Users can view their own keuangan"
  ON public.keuangan FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keuangan"
  ON public.keuangan FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keuangan"
  ON public.keuangan FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keuangan"
  ON public.keuangan FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies untuk media
CREATE POLICY "Users can view their own media"
  ON public.media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own media"
  ON public.media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.media FOR DELETE
  USING (auth.uid() = user_id);

-- Function untuk update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto update updated_at di trips
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime untuk semua tabel
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.keuangan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media;

-- Storage bucket untuk media
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-media', 'trip-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'trip-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public media is viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-media');


-- Migration: 20251030134309
-- Add tanggal_selesai column to trips table
ALTER TABLE public.trips 
ADD COLUMN tanggal_selesai date;

-- Create reminders table for alarm feature
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  keterangan TEXT,
  tanggal_waktu TIMESTAMP WITH TIME ZONE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminders
CREATE POLICY "Users can view their own reminders" 
ON public.reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" 
ON public.reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
ON public.reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
ON public.reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Migration: 20251031003428
-- Create table for rundown acara (trip itinerary/schedule)
CREATE TABLE public.rundown_acara (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  hari_ke INTEGER NOT NULL,
  judul_acara TEXT NOT NULL,
  jam_mulai TIME NOT NULL,
  jam_selesai TIME NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rundown_acara ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own rundown acara" 
ON public.rundown_acara 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rundown acara" 
ON public.rundown_acara 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rundown acara" 
ON public.rundown_acara 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rundown acara" 
ON public.rundown_acara 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_rundown_acara_trip_id ON public.rundown_acara(trip_id);
CREATE INDEX idx_rundown_acara_user_id ON public.rundown_acara(user_id);



-- Migration: 20251031033615
-- Enable realtime for rundown_acara table
ALTER TABLE public.rundown_acara REPLICA IDENTITY FULL;

-- Add rundown_acara to realtime publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rundown_acara;

-- Migration: 20251101061323
-- Fase 2: Tabel untuk sistem template wisata
CREATE TABLE public.destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nama_destinasi TEXT NOT NULL,
  deskripsi TEXT,
  kategori TEXT,
  lokasi TEXT,
  durasi_standar INTEGER, -- dalam menit
  estimasi_biaya NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk destinations
CREATE POLICY "Users can view their own destinations"
ON public.destinations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own destinations"
ON public.destinations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own destinations"
ON public.destinations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own destinations"
ON public.destinations
FOR DELETE
USING (auth.uid() = user_id);

-- Tabel untuk link trip dengan destinasi yang dipilih
CREATE TABLE public.trip_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  destination_id UUID NOT NULL,
  user_id UUID NOT NULL,
  hari_ke INTEGER NOT NULL,
  jam_mulai TIME,
  jam_selesai TIME,
  status TEXT DEFAULT 'planned',
  urutan INTEGER NOT NULL DEFAULT 0,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_destinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk trip_destinations
CREATE POLICY "Users can view their own trip destinations"
ON public.trip_destinations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip destinations"
ON public.trip_destinations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip destinations"
ON public.trip_destinations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip destinations"
ON public.trip_destinations
FOR DELETE
USING (auth.uid() = user_id);

-- Fase 3: Tabel untuk sistem catatan
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID,
  judul TEXT NOT NULL,
  konten TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk notes
CREATE POLICY "Users can view their own notes"
ON public.notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger untuk update timestamp
CREATE TRIGGER update_destinations_updated_at
BEFORE UPDATE ON public.destinations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251101074554
-- Trigger types regeneration
-- This comment ensures the types file is regenerated with the correct schema

-- Verify all tables exist
DO $$ 
BEGIN
  -- This is a no-op migration to trigger types regeneration
  -- All tables should already exist: trips, destinations, notes, reminders, etc.
  RAISE NOTICE 'Types regeneration triggered';
END $$;

-- Migration: 20251101090849
-- Add vehicle and other trip details columns
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS nama_kendaraan TEXT,
ADD COLUMN IF NOT EXISTS jumlah_penumpang INTEGER,
ADD COLUMN IF NOT EXISTS budget_estimasi NUMERIC,
ADD COLUMN IF NOT EXISTS nomor_polisi TEXT,
ADD COLUMN IF NOT EXISTS nama_driver TEXT;

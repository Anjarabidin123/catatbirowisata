-- Add cashback column to keuangan table
ALTER TABLE public.keuangan ADD COLUMN IF NOT EXISTS cashback numeric DEFAULT NULL;

-- Add vehicle info columns to trips table (sudah ada, tapi pastikan)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='nama_kendaraan') THEN
    ALTER TABLE public.trips ADD COLUMN nama_kendaraan text;
  END IF;
END $$;

-- Create table for trip price notes (catatan harga per trip)
CREATE TABLE IF NOT EXISTS public.trip_price_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  keterangan text NOT NULL,
  jumlah numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_price_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_price_notes
CREATE POLICY "Users can view their own trip price notes"
  ON public.trip_price_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip price notes"
  ON public.trip_price_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip price notes"
  ON public.trip_price_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip price notes"
  ON public.trip_price_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for trip destination notes (catatan destinasi per trip, independent)
CREATE TABLE IF NOT EXISTS public.trip_destination_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  destinasi_1 text,
  destinasi_2 text,
  destinasi_3 text,
  destinasi_4 text,
  destinasi_5 text,
  destinasi_6 text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_destination_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_destination_notes
CREATE POLICY "Users can view their own trip destination notes"
  ON public.trip_destination_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip destination notes"
  ON public.trip_destination_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip destination notes"
  ON public.trip_destination_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip destination notes"
  ON public.trip_destination_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for HTM (Harga Tiket Masuk) notes
CREATE TABLE IF NOT EXISTS public.htm_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE CASCADE,
  nama_destinasi text NOT NULL,
  harga_per_orang numeric NOT NULL,
  guru_dapat_cashback boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.htm_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for htm_notes
CREATE POLICY "Users can view their own htm notes"
  ON public.htm_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own htm notes"
  ON public.htm_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own htm notes"
  ON public.htm_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own htm notes"
  ON public.htm_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for catering notes
CREATE TABLE IF NOT EXISTS public.catering_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nama_catering text NOT NULL,
  harga_per_snack numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catering_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for catering_notes
CREATE POLICY "Users can view their own catering notes"
  ON public.catering_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own catering notes"
  ON public.catering_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own catering notes"
  ON public.catering_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own catering notes"
  ON public.catering_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger untuk update_updated_at
CREATE TRIGGER update_trip_destination_notes_updated_at
  BEFORE UPDATE ON public.trip_destination_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_htm_notes_updated_at
  BEFORE UPDATE ON public.htm_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catering_notes_updated_at
  BEFORE UPDATE ON public.catering_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
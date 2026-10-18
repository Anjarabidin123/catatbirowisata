-- Add missing columns to keuangan table
ALTER TABLE public.keuangan
ADD COLUMN IF NOT EXISTS cashback numeric,
ADD COLUMN IF NOT EXISTS harga_satuan numeric,
ADD COLUMN IF NOT EXISTS jumlah_item integer;

-- Create trip_price_notes table
CREATE TABLE IF NOT EXISTS public.trip_price_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  keterangan text NOT NULL,
  jumlah numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on trip_price_notes
ALTER TABLE public.trip_price_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trip_price_notes
CREATE POLICY "Users can view their own trip price notes"
ON public.trip_price_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip price notes"
ON public.trip_price_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip price notes"
ON public.trip_price_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip price notes"
ON public.trip_price_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trip_destination_notes table
CREATE TABLE IF NOT EXISTS public.trip_destination_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  catatan text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on trip_destination_notes
ALTER TABLE public.trip_destination_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trip_destination_notes
CREATE POLICY "Users can view their own trip destination notes"
ON public.trip_destination_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip destination notes"
ON public.trip_destination_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip destination notes"
ON public.trip_destination_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip destination notes"
ON public.trip_destination_notes
FOR DELETE
USING (auth.uid() = user_id);
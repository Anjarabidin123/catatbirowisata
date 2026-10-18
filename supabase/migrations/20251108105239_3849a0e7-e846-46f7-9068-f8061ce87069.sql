-- Create trip_vehicles table
CREATE TABLE public.trip_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nama_po TEXT NOT NULL,
  harga_per_bus NUMERIC NOT NULL DEFAULT 0,
  dp NUMERIC NOT NULL DEFAULT 0,
  jumlah_penumpang_per_bus INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trip_vehicles
CREATE POLICY "Users can view their own vehicles"
ON public.trip_vehicles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vehicles"
ON public.trip_vehicles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
ON public.trip_vehicles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
ON public.trip_vehicles
FOR DELETE
USING (auth.uid() = user_id);

-- Add catatan column to trip_price_notes if it doesn't exist
ALTER TABLE public.trip_price_notes 
ADD COLUMN IF NOT EXISTS catatan TEXT;
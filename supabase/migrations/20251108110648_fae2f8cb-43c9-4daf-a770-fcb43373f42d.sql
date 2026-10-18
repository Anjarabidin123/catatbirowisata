-- Add cashback column to trip_vehicles table
ALTER TABLE public.trip_vehicles 
ADD COLUMN IF NOT EXISTS cashback NUMERIC;
-- Add missing columns to trips table for vehicle and budget information
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS nama_kendaraan text,
  ADD COLUMN IF NOT EXISTS jumlah_penumpang integer,
  ADD COLUMN IF NOT EXISTS budget_estimasi numeric,
  ADD COLUMN IF NOT EXISTS nomor_polisi text,
  ADD COLUMN IF NOT EXISTS nama_driver text;

-- Add helpful comments
COMMENT ON COLUMN public.trips.nama_kendaraan IS 'Nama kendaraan/bus yang digunakan';
COMMENT ON COLUMN public.trips.jumlah_penumpang IS 'Jumlah penumpang dalam trip';
COMMENT ON COLUMN public.trips.budget_estimasi IS 'Estimasi budget untuk trip';
COMMENT ON COLUMN public.trips.nomor_polisi IS 'Nomor polisi kendaraan';
COMMENT ON COLUMN public.trips.nama_driver IS 'Nama driver kendaraan';
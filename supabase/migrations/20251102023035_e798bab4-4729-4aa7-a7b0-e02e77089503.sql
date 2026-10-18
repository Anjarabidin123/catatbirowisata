-- Add budget and status columns to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget_dp numeric DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS status text DEFAULT 'upcoming';

-- Add calculator fields to keuangan table
ALTER TABLE keuangan ADD COLUMN IF NOT EXISTS harga_satuan numeric;
ALTER TABLE keuangan ADD COLUMN IF NOT EXISTS jumlah_item integer;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_tanggal ON trips(tanggal);
CREATE INDEX IF NOT EXISTS idx_keuangan_tanggal ON keuangan(tanggal);
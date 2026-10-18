-- Enable replica identity for all tables (safe to run multiple times)
ALTER TABLE public.destinations REPLICA IDENTITY FULL;
ALTER TABLE public.trip_destinations REPLICA IDENTITY FULL;
ALTER TABLE public.reminders REPLICA IDENTITY FULL;
ALTER TABLE public.media REPLICA IDENTITY FULL;
ALTER TABLE public.trip_destination_notes REPLICA IDENTITY FULL;
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.keuangan REPLICA IDENTITY FULL;
ALTER TABLE public.trip_vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.trip_price_notes REPLICA IDENTITY FULL;
ALTER TABLE public.rundown_acara REPLICA IDENTITY FULL;

-- Add tables that aren't already in realtime (ignore errors if already added)
DO $$
BEGIN
    -- Add destinations
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'destinations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.destinations;
    END IF;
    
    -- Add trip_destinations
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trip_destinations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_destinations;
    END IF;
    
    -- Add reminders
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'reminders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
    END IF;
    
    -- Add trip_destination_notes
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trip_destination_notes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_destination_notes;
    END IF;
    
    -- Add trips
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trips'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
    END IF;
    
    -- Add keuangan
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'keuangan'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.keuangan;
    END IF;
    
    -- Add trip_vehicles
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trip_vehicles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_vehicles;
    END IF;
    
    -- Add notes
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
    END IF;
    
    -- Add trip_price_notes
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trip_price_notes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_price_notes;
    END IF;
    
    -- Add rundown_acara
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'rundown_acara'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rundown_acara;
    END IF;
END $$;
-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.catering_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.htm_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.destinations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_destinations;
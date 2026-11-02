-- Migration: 20261030093000_rbac_manajemen_kru_audit.sql
-- Deskripsi: Skema Tabel RBAC, Manajemen Personel Kru, Pelacakan Sesi Perangkat (Device Login),
--            Log Aktivitas Kru (Audit Trail), dan Profil Rekening Biro Wisata.

-- 1. Tabel Profil & Rekening Biro Wisata
CREATE TABLE IF NOT EXISTS public.biro_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nama_biro TEXT NOT NULL DEFAULT 'Catat Biro Wisata',
  slogan TEXT DEFAULT 'Biro Perjalanan Wisata & Sewa Bus Pariwisata',
  logo_url TEXT DEFAULT '/pwa-icon.svg',
  alamat TEXT,
  telepon TEXT,
  email TEXT,
  website TEXT,
  pimpinan TEXT,
  nama_bank TEXT,
  nomor_rekening TEXT,
  atas_nama_rekening TEXT,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Daftar Personel Kru Lapangan (Tour Leader, Driver, Kernet, Staf)
CREATE TABLE IF NOT EXISTS public.crew_members (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kode_kru TEXT NOT NULL,
  nama TEXT NOT NULL,
  email TEXT,
  telepon TEXT,
  jabatan TEXT NOT NULL CHECK (jabatan IN ('Tour Leader', 'Driver Utama', 'Co-Driver / Kernet', 'Koordinator Lapangan', 'Staf Operasional')),
  role TEXT NOT NULL DEFAULT 'kru' CHECK (role IN ('pemilik', 'kru')),
  status TEXT NOT NULL DEFAULT 'bertugas' CHECK (status IN ('online', 'bertugas', 'offline', 'nonaktif')),
  assigned_trip TEXT DEFAULT 'Standby Operasional',
  device_name TEXT,
  device_type TEXT DEFAULT 'Smartphone' CHECK (device_type IN ('Smartphone', 'Tablet', 'Laptop / Desktop')),
  device_os TEXT,
  device_browser TEXT,
  location_hint TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Sesi Perangkat Login Kru & Admin (Device Tracker)
CREATE TABLE IF NOT EXISTS public.crew_device_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  crew_id TEXT NOT NULL,
  crew_name TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'kru' CHECK (role IN ('pemilik', 'kru')),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'Smartphone' CHECK (device_type IN ('Smartphone', 'Tablet', 'Laptop / Desktop')),
  os TEXT NOT NULL,
  browser TEXT NOT NULL,
  resolution TEXT,
  location_hint TEXT,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Log Aktivitas Kru di Lapangan (Audit Trail)
CREATE TABLE IF NOT EXISTS public.crew_activity_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crew_id TEXT NOT NULL,
  crew_name TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'kru' CHECK (role IN ('pemilik', 'kru')),
  kategori TEXT NOT NULL CHECK (kategori IN ('login_device', 'keuangan_lapangan', 'checklist_armada', 'manifest_kursi', 'operasional_trip', 'catatan_htm', 'keamanan_rbac')),
  aksi TEXT NOT NULL,
  detail TEXT NOT NULL,
  device_used TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'Smartphone',
  trip_name TEXT,
  status TEXT NOT NULL DEFAULT 'sukses' CHECK (status IN ('sukses', 'peringatan', 'penting')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Kebijakan Matriks Hak Akses (RBAC Permission Rules)
CREATE TABLE IF NOT EXISTS public.rbac_permission_rules (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  modul TEXT NOT NULL,
  fitur TEXT NOT NULL,
  deskripsi TEXT,
  kategori TEXT NOT NULL CHECK (kategori IN ('Finansial & Rahasia Dapur', 'Manajemen & Kontrol', 'Operasional Lapangan')),
  akses_pemilik BOOLEAN NOT NULL DEFAULT TRUE,
  akses_kru BOOLEAN NOT NULL DEFAULT FALSE,
  keterangan_kru TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Indeks Pencarian Cepat untuk Log & Sesi
CREATE INDEX IF NOT EXISTS idx_crew_members_user_id ON public.crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_device_sessions_user_id ON public.crew_device_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crew_activity_logs_user_id_ts ON public.crew_activity_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crew_activity_logs_crew_id ON public.crew_activity_logs(crew_id);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.biro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permission_rules ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk biro_profiles
CREATE POLICY "Users can view their own biro_profiles"
  ON public.biro_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own biro_profiles"
  ON public.biro_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own biro_profiles"
  ON public.biro_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Kebijakan RLS untuk crew_members
CREATE POLICY "Users can view their own crew_members"
  ON public.crew_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own crew_members"
  ON public.crew_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own crew_members"
  ON public.crew_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own crew_members"
  ON public.crew_members FOR DELETE USING (auth.uid() = user_id);

-- Kebijakan RLS untuk crew_device_sessions
CREATE POLICY "Users can view their own crew_device_sessions"
  ON public.crew_device_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own crew_device_sessions"
  ON public.crew_device_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own crew_device_sessions"
  ON public.crew_device_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own crew_device_sessions"
  ON public.crew_device_sessions FOR DELETE USING (auth.uid() = user_id);

-- Kebijakan RLS untuk crew_activity_logs
CREATE POLICY "Users can view their own crew_activity_logs"
  ON public.crew_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own crew_activity_logs"
  ON public.crew_activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own crew_activity_logs"
  ON public.crew_activity_logs FOR DELETE USING (auth.uid() = user_id);

-- Kebijakan RLS untuk rbac_permission_rules
CREATE POLICY "Users can view their own rbac_permission_rules"
  ON public.rbac_permission_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rbac_permission_rules"
  ON public.rbac_permission_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rbac_permission_rules"
  ON public.rbac_permission_rules FOR UPDATE USING (auth.uid() = user_id);

-- Trigger auto-update updated_at
DROP TRIGGER IF EXISTS update_biro_profiles_updated_at ON public.biro_profiles;
CREATE TRIGGER update_biro_profiles_updated_at
  BEFORE UPDATE ON public.biro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crew_members_updated_at ON public.crew_members;
CREATE TRIGGER update_crew_members_updated_at
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Replica Identity & Realtime Publication
ALTER TABLE public.biro_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.crew_members REPLICA IDENTITY FULL;
ALTER TABLE public.crew_device_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.crew_activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.rbac_permission_rules REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crew_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crew_device_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_device_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crew_activity_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_activity_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rbac_permission_rules') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rbac_permission_rules;
  END IF;
END $$;

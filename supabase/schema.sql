
-- DevPet Supabase Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  pet_name TEXT DEFAULT 'DevPet',
  pet_stage INTEGER DEFAULT 0 CHECK (pet_stage BETWEEN 0 AND 4),
  pet_xp INTEGER DEFAULT 0,
  pet_mood TEXT DEFAULT 'neutral' CHECK (pet_mood IN ('happy','focused','tired','neglected','excited')),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  preferred_theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pet evolution thresholds
CREATE TABLE public.evolution_stages (
  stage INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  min_xp INTEGER NOT NULL,
  icon TEXT NOT NULL,
  description TEXT
);
INSERT INTO public.evolution_stages (stage, name, min_xp, icon, description) VALUES
(0, 'Egg', 0, '🥚', 'A mysterious egg. Code to hatch it.'),
(1, 'Hatchling', 500, '🐣', 'Just born. Learning to crawl through code.'),
(2, 'Junior', 2000, '🐛', 'Growing fast. Exploring different languages.'),
(3, 'Senior', 8000, '🦋', 'Mature and confident. Shipping production code.'),
(4, 'Architect', 25000, '🐉', 'Legendary. Building systems that last.');

-- Coding events (raw data from VS Code extension)
CREATE TABLE public.coding_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('keystroke','save','commit','language_switch','session_start','session_end','pr_open','pr_merge')),
  language TEXT,
  repo_name TEXT,
  file_path TEXT,
  xp_value INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GitHub sync tokens (encrypted at application layer)
CREATE TABLE public.user_tokens (
  user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  github_token TEXT,
  github_username TEXT,
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend system
CREATE TABLE public.pet_friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  friend_code TEXT UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Daily snapshots for streaks/leaderboards
CREATE TABLE public.daily_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  date DATE NOT NULL,
  total_commits INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  languages JSONB DEFAULT '[]',
  active_hours INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Leaderboard cache
CREATE TABLE public.leaderboard (
  user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  rank INTEGER,
  weekly_xp INTEGER DEFAULT 0,
  pet_stage INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own events" ON public.coding_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.coding_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tokens" ON public.user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read friends" ON public.pet_friends
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can create friend requests" ON public.pet_friends
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can read own snapshots" ON public.daily_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Leaderboard public read" ON public.leaderboard
  FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

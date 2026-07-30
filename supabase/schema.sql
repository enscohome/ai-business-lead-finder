 AI Business Lead Finder - Supabase Database Schema

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO 'your-jwt-secret';

-- Businesses table (cached search results)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  business_type TEXT NOT NULL,
  website TEXT,
  website_status TEXT CHECK (website_status IN ('modern', 'outdated', 'none')),
  opportunity_score TEXT CHECK (opportunity_score IN ('low', 'medium', 'high')),
  google_maps_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'google_places',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON businesses FOR SELECT USING (true);

-- Saved leads table
CREATE TABLE saved_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'closed', 'archived')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE saved_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own leads" 
  ON saved_leads FOR ALL USING (auth.uid() = user_id);

-- Search history table
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  business_type TEXT,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own search history" 
  ON search_history FOR ALL USING (auth.uid() = user_id);

-- User profiles / subscription tracking
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  searches_today INTEGER DEFAULT 0,
  searches_limit INTEGER DEFAULT 5,
  leads_limit INTEGER DEFAULT 50,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own profile" 
  ON user_profiles FOR ALL USING (auth.uid() = id);

-- Teams table (for Agency plan)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  plan TEXT DEFAULT 'agency',
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Activity log table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('search', 'save', 'contact', 'close', 'export')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own activities" 
  ON activities FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_businesses_type ON businesses(business_type);
CREATE INDEX idx_businesses_opportunity ON businesses(opportunity_score);
CREATE INDEX idx_saved_leads_user ON saved_leads(user_id);
CREATE INDEX idx_saved_leads_status ON saved_leads(status);
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_activities_user ON activities(user_id);

-- Function to reset daily searches (run via cron)
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles SET searches_today = 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_leads_updated_at BEFORE UPDATE ON saved_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- RPC function to increment search count
CREATE OR REPLACE FUNCTION increment_search_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  UPDATE user_profiles 
  SET searches_today = searches_today + 1
  WHERE id = user_id
  RETURNING searches_today INTO current_count;

  RETURN current_count;
END;
$$ LANGUAGE plpgsql;
-- Daily search usage
CREATE TABLE IF NOT EXISTS public.daily_search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Lagos')::date),
  search_count INTEGER NOT NULL DEFAULT 0 CHECK (search_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.daily_search_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search usage"
ON public.daily_search_usage
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own search usage"
ON public.daily_search_usage
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own search usage"
ON public.daily_search_usage
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
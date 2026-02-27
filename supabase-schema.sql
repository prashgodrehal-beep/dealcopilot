-- ============================================================
-- DealPilot V1 — Complete Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 1. CLIENT PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  company_name TEXT DEFAULT '',
  company_industry TEXT DEFAULT '',
  product_description TEXT DEFAULT '',
  target_icp TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. DEALS
-- ============================================================
CREATE TYPE deal_stage AS ENUM (
  'discovery', 'qualification', 'proposal',
  'negotiation', 'closing', 'stalled', 'won', 'lost'
);

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deal_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  deal_value TEXT DEFAULT '',
  buyer_persona TEXT DEFAULT '',
  buyer_name TEXT DEFAULT '',
  stage deal_stage DEFAULT 'discovery',
  challenge TEXT DEFAULT '',
  additional_context TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. COACHING SESSIONS
-- ============================================================
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Coaching Session',
  session_summary TEXT DEFAULT '',
  deal_stage_at_session deal_stage,
  credits_used INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MESSAGES
-- ============================================================
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE message_type AS ENUM ('text', 'document_review', 'escalation');

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. CREDITS
-- ============================================================
CREATE TYPE credit_transaction_type AS ENUM (
  'purchase', 'usage', 'refund', 'bonus', 'initial'
);

CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type credit_transaction_type NOT NULL,
  description TEXT DEFAULT '',
  reference_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE VIEW public.credit_balances AS
SELECT user_id, COALESCE(SUM(amount), 0) AS balance
FROM public.credits
GROUP BY user_id;

-- ============================================================
-- 6. KNOWLEDGE BASE (RAG)
-- ============================================================
CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '',
  content TEXT NOT NULL,
  source TEXT DEFAULT '',
  category TEXT DEFAULT '',
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON public.knowledge_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================
-- 7. DOCUMENT UPLOADS
-- ============================================================
CREATE TYPE document_type AS ENUM (
  'proposal', 'email', 'presentation', 'transcript', 'other'
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  document_type document_type DEFAULT 'other',
  extracted_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Deals
CREATE POLICY "Users can view own deals" ON public.deals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own deals" ON public.deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON public.deals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON public.deals
  FOR DELETE USING (auth.uid() = user_id);

-- Sessions
CREATE POLICY "Users can view own sessions" ON public.coaching_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.coaching_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.coaching_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credits
CREATE POLICY "Users can view own credits" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert credits" ON public.credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_deal_updated BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_session_updated BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile + welcome credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO public.credits (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 2, 'initial', 'Welcome bonus — 2 free coaching sessions');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_deals_user_id ON public.deals(user_id);
CREATE INDEX idx_deals_active ON public.deals(user_id, is_active);
CREATE INDEX idx_sessions_deal_id ON public.coaching_sessions(deal_id);
CREATE INDEX idx_sessions_user_id ON public.coaching_sessions(user_id);
CREATE INDEX idx_messages_session_id ON public.messages(session_id);
CREATE INDEX idx_credits_user_id ON public.credits(user_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_deal_id ON public.documents(deal_id);

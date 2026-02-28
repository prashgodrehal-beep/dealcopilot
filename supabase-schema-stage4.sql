-- ============================================================
-- DealPilot — Stage 4 Schema Additions
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add session_summary column for deal memory continuity
ALTER TABLE public.coaching_sessions
ADD COLUMN IF NOT EXISTS session_summary TEXT DEFAULT '';

-- Add deal_stage_at_session to track which stage the deal was in during coaching
ALTER TABLE public.coaching_sessions
ADD COLUMN IF NOT EXISTS deal_stage_at_session TEXT DEFAULT 'discovery';

-- Add is_active flag to sessions (for continuing vs starting new)
ALTER TABLE public.coaching_sessions
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add message_type to messages table if not exists
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Add additional_context and buyer_name to deals if not exists
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS additional_context TEXT DEFAULT '';

ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS buyer_name TEXT DEFAULT '';

-- Add reference_id to credits table for tracking what session used the credit
ALTER TABLE public.credits
ADD COLUMN IF NOT EXISTS reference_id UUID DEFAULT NULL;

-- Add description to credits table
ALTER TABLE public.credits
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

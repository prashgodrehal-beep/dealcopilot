-- ============================================================
-- DealPilot — Knowledge Base Schema Addition
-- Run this in your Supabase SQL Editor AFTER the main schema
-- ============================================================

-- Track uploaded knowledge base files and their processing status
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_type TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  chunks_count INTEGER DEFAULT 0,
  error_message TEXT DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER on_knowledge_source_updated
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- No RLS on knowledge_sources — this is admin-managed content
-- visible to all authenticated users (they need it for coaching)
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view knowledge sources"
  ON public.knowledge_sources FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage knowledge sources"
  ON public.knowledge_sources FOR ALL
  USING (auth.role() = 'authenticated');

-- Also ensure knowledge_chunks is readable by authenticated users
-- (may already exist from main schema, safe to run again)
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view knowledge" ON public.knowledge_chunks;
CREATE POLICY "Authenticated users can view knowledge"
  ON public.knowledge_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage knowledge" ON public.knowledge_chunks;
CREATE POLICY "Authenticated users can manage knowledge"
  ON public.knowledge_chunks FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET
-- You also need to create a storage bucket manually:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: knowledge-base
-- 4. Toggle OFF "Public bucket" (keep it private)
-- 5. Click "Create bucket"
-- ============================================================

-- ============================================================
-- VECTOR SEARCH FUNCTION
-- Used by the coaching engine to find relevant knowledge chunks
-- ============================================================
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding TEXT,
  match_count INT DEFAULT 5,
  filter_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.source,
    kc.category,
    1 - (kc.embedding <=> query_embedding::vector) AS similarity
  FROM public.knowledge_chunks kc
  WHERE
    kc.embedding IS NOT NULL
    AND (filter_categories IS NULL OR kc.category = ANY(filter_categories))
  ORDER BY kc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

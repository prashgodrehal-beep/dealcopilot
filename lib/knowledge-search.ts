// ============================================================
// DealPilot — Knowledge Base Search (RAG Retrieval)
// Used by the coaching engine to find relevant methodology
// chunks for a given query.
// ============================================================

import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SearchResult {
  content: string;
  source: string;
  category: string;
  similarity: number;
}

/**
 * Search the knowledge base for content relevant to a query.
 * Uses vector similarity search with OpenAI embeddings.
 * 
 * @param query - The coaching question or deal context
 * @param limit - Max results to return (default 5)
 * @param categories - Optional category filter
 * @returns Array of relevant knowledge chunks with similarity scores
 */
export async function searchKnowledge(
  query: string,
  limit: number = 5,
  categories?: string[]
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search using Supabase RPC (vector similarity)
    const supabase = createClient();

    // Build the query - using raw SQL via rpc for vector search
    const { data, error } = await supabase.rpc('search_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: limit,
      filter_categories: categories || null,
    });

    if (error) {
      console.error('Knowledge search error:', error);
      // Fallback: try simple text search if vector search fails
      return fallbackTextSearch(query, limit, supabase);
    }

    return (data || []).map((row: { content: string; source: string; category: string; similarity: number }) => ({
      content: row.content,
      source: row.source,
      category: row.category,
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error('Knowledge search failed:', err);
    return [];
  }
}

/**
 * Fallback text search using ILIKE when vector search isn't available
 */
async function fallbackTextSearch(
  query: string,
  limit: number,
  supabase: ReturnType<typeof createClient>
): Promise<SearchResult[]> {
  const keywords = query.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
  
  if (keywords.length === 0) return [];

  // Search for any keyword match
  const { data } = await supabase
    .from('knowledge_chunks')
    .select('content, source, category')
    .or(keywords.map((k) => `content.ilike.%${k}%`).join(','))
    .limit(limit);

  return (data || []).map((row) => ({
    content: row.content,
    source: row.source,
    category: row.category,
    similarity: 0.5, // Unknown similarity for text search
  }));
}

/**
 * Format search results into a context string for the coaching prompt.
 */
export function formatKnowledgeContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const contextParts = results.map((r, i) => (
    `[Source: ${r.source} | Category: ${r.category}]\n${r.content}`
  ));

  return `\n---\nRELEVANT METHODOLOGY & FRAMEWORKS:\n\n${contextParts.join('\n\n---\n\n')}\n---\n`;
}

// ============================================================
// DealPilot — Text Chunker for RAG Pipeline
// Splits documents into overlapping chunks optimized for
// semantic search and coaching context retrieval.
// ============================================================

export interface TextChunk {
  content: string;
  index: number;
  source: string;
  category: string;
  metadata: {
    chunk_index: number;
    total_chunks: number;
    char_start: number;
    char_end: number;
  };
}

interface ChunkOptions {
  maxChunkSize?: number;    // Target chars per chunk (~500 tokens ≈ 2000 chars)
  overlapSize?: number;     // Overlap between chunks for context continuity
  source?: string;          // File name / source attribution
  category?: string;        // Category for filtering
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1500,       // ~375 tokens — good for embedding + retrieval
  overlapSize: 200,         // ~50 tokens overlap
  source: '',
  category: 'general',
};

/**
 * Smart text chunker that respects paragraph and sentence boundaries.
 * 
 * Strategy:
 * 1. Split by double newlines (paragraphs) first
 * 2. If a paragraph is too long, split by sentences
 * 3. Combine small paragraphs to avoid tiny chunks
 * 4. Add overlap between chunks for context continuity
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!cleanedText) return [];

  // Split into paragraphs
  const paragraphs = cleanedText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20); // Skip very short fragments

  // Build chunks by combining paragraphs up to maxChunkSize
  const rawChunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If a single paragraph exceeds max size, split by sentences
    if (paragraph.length > opts.maxChunkSize) {
      // Flush current chunk first
      if (currentChunk) {
        rawChunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // Split long paragraph by sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length > opts.maxChunkSize && sentenceChunk) {
          rawChunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
        }
      }
      if (sentenceChunk) {
        rawChunks.push(sentenceChunk.trim());
      }
      continue;
    }

    // Check if adding this paragraph exceeds the max size
    const combined = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    if (combined.length > opts.maxChunkSize && currentChunk) {
      rawChunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = combined;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    rawChunks.push(currentChunk.trim());
  }

  // Add overlap between chunks
  const chunks: TextChunk[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    let content = rawChunks[i];

    // Add overlap from previous chunk (end of previous)
    if (i > 0 && opts.overlapSize > 0) {
      const prevChunk = rawChunks[i - 1];
      const overlap = prevChunk.slice(-opts.overlapSize);
      const overlapBoundary = overlap.indexOf('. ');
      const cleanOverlap = overlapBoundary > -1 ? overlap.slice(overlapBoundary + 2) : overlap;
      if (cleanOverlap.length > 30) {
        content = '...' + cleanOverlap + '\n\n' + content;
      }
    }

    // Calculate character positions in original text
    const charStart = cleanedText.indexOf(rawChunks[i].slice(0, 50));

    chunks.push({
      content,
      index: i,
      source: opts.source,
      category: opts.category,
      metadata: {
        chunk_index: i,
        total_chunks: rawChunks.length,
        char_start: charStart > -1 ? charStart : 0,
        char_end: charStart > -1 ? charStart + rawChunks[i].length : rawChunks[i].length,
      },
    });
  }

  return chunks;
}

/**
 * Split text into sentences, handling common abbreviations.
 */
function splitIntoSentences(text: string): string[] {
  // Simple sentence splitter that handles common cases
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/**
 * Extract category from filename following the naming convention:
 * "[Category] - [Name].pdf" → category
 */
export function extractCategory(fileName: string): string {
  const match = fileName.match(/^(\w+)\s*-\s*/);
  if (match) {
    return match[1].toLowerCase();
  }
  return 'general';
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

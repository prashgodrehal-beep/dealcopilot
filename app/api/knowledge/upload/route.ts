import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { chunkText, extractCategory, estimateTokens } from '@/lib/chunker';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for processing (Vercel Pro)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF, DOCX, TXT, or MD files.' },
        { status: 400 }
      );
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `knowledge/${fileName}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('knowledge-base')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage: ' + uploadError.message },
        { status: 500 }
      );
    }

    // 2. Create knowledge_sources record
    const autoCategory = category || extractCategory(file.name);
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({
        file_name: fileName,
        original_name: file.name,
        file_size: file.size,
        file_type: file.type,
        category: autoCategory,
        status: 'processing',
        storage_path: storagePath,
      })
      .select()
      .single();

    if (sourceError || !source) {
      console.error('Source insert error:', sourceError);
      return NextResponse.json(
        { error: 'Failed to save file record' },
        { status: 500 }
      );
    }

    // 3. Extract text from file
    let extractedText = '';
    try {
      extractedText = await extractText(fileBuffer, file.type);
    } catch (err) {
      console.error('Text extraction error:', err);
      await supabase
        .from('knowledge_sources')
        .update({ status: 'failed', error_message: 'Failed to extract text from file' })
        .eq('id', source.id);
      return NextResponse.json(
        { error: 'Failed to extract text from file' },
        { status: 500 }
      );
    }

    if (!extractedText || extractedText.trim().length < 50) {
      await supabase
        .from('knowledge_sources')
        .update({ status: 'failed', error_message: 'File contains too little readable text' })
        .eq('id', source.id);
      return NextResponse.json(
        { error: 'File contains too little readable text' },
        { status: 400 }
      );
    }

    // 4. Chunk the text
    const chunks = chunkText(extractedText, {
      source: file.name,
      category: autoCategory,
      maxChunkSize: 1500,
      overlapSize: 200,
    });

    if (chunks.length === 0) {
      await supabase
        .from('knowledge_sources')
        .update({ status: 'failed', error_message: 'No chunks generated from file' })
        .eq('id', source.id);
      return NextResponse.json({ error: 'No content could be extracted' }, { status: 400 });
    }

    // 5. Generate embeddings in batches
    const batchSize = 20;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);

      try {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
        });
        embeddingResponse.data.forEach((d) => allEmbeddings.push(d.embedding));
      } catch (err) {
        console.error('Embedding error:', err);
        await supabase
          .from('knowledge_sources')
          .update({ status: 'failed', error_message: 'Failed to generate embeddings' })
          .eq('id', source.id);
        return NextResponse.json(
          { error: 'Failed to generate embeddings. Check your OpenAI API key.' },
          { status: 500 }
        );
      }
    }

    // 6. Store chunks with embeddings in knowledge_chunks
    const chunkRecords = chunks.map((chunk, i) => ({
      title: `${file.name} — Chunk ${chunk.index + 1}/${chunks.length}`,
      content: chunk.content,
      source: chunk.source,
      category: chunk.category,
      embedding: JSON.stringify(allEmbeddings[i]),
      metadata: {
        ...chunk.metadata,
        source_id: source.id,
        estimated_tokens: estimateTokens(chunk.content),
      },
    }));

    // Insert in batches to avoid payload limits
    const insertBatchSize = 50;
    for (let i = 0; i < chunkRecords.length; i += insertBatchSize) {
      const batch = chunkRecords.slice(i, i + insertBatchSize);
      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert(batch);

      if (insertError) {
        console.error('Chunk insert error:', insertError);
        await supabase
          .from('knowledge_sources')
          .update({ status: 'failed', error_message: 'Failed to store chunks: ' + insertError.message })
          .eq('id', source.id);
        return NextResponse.json(
          { error: 'Failed to store knowledge chunks' },
          { status: 500 }
        );
      }
    }

    // 7. Update source status to completed
    await supabase
      .from('knowledge_sources')
      .update({
        status: 'completed',
        chunks_count: chunks.length,
        error_message: '',
      })
      .eq('id', source.id);

    return NextResponse.json({
      success: true,
      source_id: source.id,
      file_name: file.name,
      chunks_count: chunks.length,
      estimated_tokens: chunks.reduce((sum, c) => sum + estimateTokens(c.content), 0),
    });

  } catch (err) {
    console.error('Upload pipeline error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during processing' },
      { status: 500 }
    );
  }
}

// ============================================================
// Text Extraction
// ============================================================

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPdfText(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocxText(buffer);
    case 'text/plain':
    case 'text/markdown':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

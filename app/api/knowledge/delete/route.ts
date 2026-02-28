import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { source_id } = await request.json();
    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
    }

    // Get the source record
    const { data: source } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', source_id)
      .single();

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Delete chunks that reference this source
    await supabase
      .from('knowledge_chunks')
      .delete()
      .filter('metadata->>source_id', 'eq', source_id);

    // Delete file from storage
    if (source.storage_path) {
      await supabase.storage
        .from('knowledge-base')
        .remove([source.storage_path]);
    }

    // Delete the source record
    await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', source_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json(
      { error: 'Failed to delete knowledge source' },
      { status: 500 }
    );
  }
}

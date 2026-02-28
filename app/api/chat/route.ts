import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { searchKnowledge, formatKnowledgeContext } from '@/lib/knowledge-search';
import { buildCoachingSystemPrompt, buildSummaryPrompt } from '@/lib/coaching-prompt';
import Anthropic from '@anthropic-ai/sdk';
import { Deal, Profile, DealStage } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, session_id, message, is_document_review } = await request.json();

    if (!deal_id || !message) {
      return NextResponse.json({ error: 'deal_id and message are required' }, { status: 400 });
    }

    // 1. Load deal + profile
    const [dealRes, profileRes] = await Promise.all([
      supabase.from('deals').select('*').eq('id', deal_id).eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);

    if (!dealRes.data || !profileRes.data) {
      return NextResponse.json({ error: 'Deal or profile not found' }, { status: 404 });
    }

    const deal = dealRes.data as Deal;
    const profile = profileRes.data as Profile;

    // 2. Check credits
    const { data: creditData } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const balance = creditData?.balance || 0;

    // 3. Get or create session
    let currentSessionId = session_id;

    if (!currentSessionId) {
      // Check credit before creating new session
      if (balance < 1) {
        return NextResponse.json({
          error: 'Insufficient credits. Please purchase more credits to continue coaching.',
          code: 'NO_CREDITS',
        }, { status: 402 });
      }

      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('coaching_sessions')
        .insert({
          deal_id: deal.id,
          user_id: user.id,
          title: `Coaching — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          deal_stage_at_session: deal.stage,
          credits_used: 1,
          is_active: true,
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }

      currentSessionId = newSession.id;

      // Deduct 1 credit
      await supabase.from('credits').insert({
        user_id: user.id,
        amount: -1,
        transaction_type: 'usage',
        description: `Coaching session — ${deal.deal_name}`,
        reference_id: currentSessionId,
      });
    }

    // 4. Save user message
    await supabase.from('messages').insert({
      session_id: currentSessionId,
      user_id: user.id,
      role: 'user',
      content: message,
      message_type: is_document_review ? 'document_review' : 'text',
    });

    // 5. Load conversation history for this session
    const { data: historyMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true });

    // 6. Load previous session summaries for deal memory
    const { data: previousSessions } = await supabase
      .from('coaching_sessions')
      .select('title, session_summary, deal_stage_at_session, created_at')
      .eq('deal_id', deal.id)
      .neq('id', currentSessionId)
      .order('created_at', { ascending: true });

    const sessionSummaries = (previousSessions || []).map((s) => ({
      title: s.title,
      summary: s.session_summary,
      stage: s.deal_stage_at_session as DealStage,
      created_at: s.created_at,
    }));

    // 7. Search knowledge base for relevant context
    const searchQuery = `${deal.stage} ${deal.challenge} ${message}`;
    const knowledgeResults = await searchKnowledge(searchQuery, 5);
    const knowledgeContext = formatKnowledgeContext(knowledgeResults);

    // 8. Build system prompt
    const systemPrompt = buildCoachingSystemPrompt({
      profile,
      deal,
      knowledgeContext,
      previousSessions: sessionSummaries,
      calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/support-lyq/ai-strategy-audit',
    });

    // 9. Build messages array for Claude
    const claudeMessages = (historyMessages || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 10. Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: claudeMessages,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && 'delta' in event) {
              const delta = event.delta;
              if ('text' in delta) {
                fullResponse += delta.text;
                // Send SSE data
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                );
              }
            }
          }

          // Save the complete assistant message
          await supabase.from('messages').insert({
            session_id: currentSessionId,
            user_id: user.id,
            role: 'assistant',
            content: fullResponse,
            message_type: 'text',
          });

          // Generate and save session summary (async, don't block response)
          generateSessionSummary(supabase, currentSessionId, user.id, historyMessages || [], fullResponse).catch(console.error);

          // Send completion event with session_id
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, session_id: currentSessionId })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error('Streaming error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Generate a session summary for deal memory continuity.
 * Runs after the response is streamed (non-blocking).
 */
async function generateSessionSummary(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  userId: string,
  historyMessages: { role: string; content: string }[],
  latestResponse: string
) {
  try {
    const allMessages = [
      ...historyMessages,
      { role: 'assistant', content: latestResponse },
    ];

    // Only generate summary if there are at least 2 exchanges
    if (allMessages.length < 3) return;

    const summaryPrompt = buildSummaryPrompt(allMessages);

    const summaryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: summaryPrompt }],
    });

    const summary = summaryResponse.content[0].type === 'text'
      ? summaryResponse.content[0].text
      : '';

    if (summary) {
      await supabase
        .from('coaching_sessions')
        .update({ session_summary: summary })
        .eq('id', sessionId);
    }
  } catch (err) {
    console.error('Summary generation error:', err);
  }
}

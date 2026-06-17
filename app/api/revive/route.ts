import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { buildRevivePrompt } from '@/lib/revive-prompt';
import { searchKnowledge, formatKnowledgeContext } from '@/lib/knowledge-search';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FREE_LIMIT = 3;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // 1. Check usage — free tier or credits
    const { count: usageCount } = await supabase
      .from('followup_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const totalUsed = usageCount || 0;
    let creditsUsed = 0;

    if (totalUsed >= FREE_LIMIT) {
      // Check credit balance
      const { data: creditData } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const balance = creditData?.balance || 0;
      if (balance < 1) {
        return NextResponse.json({
          error: 'You\'ve used your 3 free follow-ups. Purchase credits to continue.',
          code: 'NO_CREDITS',
          free_used: totalUsed,
          free_limit: FREE_LIMIT,
        }, { status: 402 });
      }
      creditsUsed = 1;
    }

    // 2. Search knowledge base for relevant follow-up frameworks
    const searchQuery = `follow up ${body.tone || 'strategic'} ${body.whatWasSent || ''} silent prospect revival`;
    const knowledgeResults = await searchKnowledge(searchQuery, 4);
    const knowledgeContext = formatKnowledgeContext(knowledgeResults);

    // 3. Build prompt
    const prompt = buildRevivePrompt({
      prospectName: body.prospectName,
      prospectRole: body.prospectRole,
      companyName: body.companyName,
      industry: body.industry,
      whatWasDiscussed: body.whatWasDiscussed,
      whatWasSent: body.whatWasSent,
      lastProspectMessage: body.lastProspectMessage,
      lastUserMessage: body.lastUserMessage,
      daysSinceResponse: body.daysSinceResponse,
      dealValue: body.dealValue,
      relationshipSource: body.relationshipSource,
      pastedThread: body.pastedThread,
      tone: body.tone || 'strategic',
      channel: body.channel || 'email',
      goal: body.goal || 'revive',
      knowledgeContext,
    });

    // 4. Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // 5. Parse JSON response
    let output;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      output = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse revive output:', rawText);
      return NextResponse.json(
        { error: 'Failed to generate follow-up. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Deduct credit if past free tier
    if (creditsUsed > 0) {
      await supabase.from('credits').insert({
        user_id: user.id,
        amount: -1,
        transaction_type: 'usage',
        description: `Follow-up generation — ${body.companyName || 'prospect'}`,
      });
    }

    // 7. Save generation for history and usage tracking
    await supabase.from('followup_generations').insert({
      user_id: user.id,
      deal_id: body.dealId || null,
      input_context: {
        prospectName: body.prospectName,
        companyName: body.companyName,
        tone: body.tone,
        channel: body.channel,
        goal: body.goal,
      },
      diagnosis: output.diagnosis?.silence_reason || '',
      output,
      tone: body.tone || 'strategic',
      channel: body.channel || 'email',
      credits_used: creditsUsed,
    });

    return NextResponse.json({
      success: true,
      output,
      usage: {
        free_used: totalUsed + 1,
        free_limit: FREE_LIMIT,
        is_free: totalUsed < FREE_LIMIT,
        credits_deducted: creditsUsed,
      },
    });

  } catch (err) {
    console.error('Revive API error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

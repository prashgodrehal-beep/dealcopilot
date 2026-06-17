// ============================================================
// DealPilot — Deal Revival Prompt Builder
// Generates psychologically intelligent follow-ups by
// diagnosing silence and applying persuasion frameworks.
// ============================================================

interface ReviveContext {
  // From user input (Mode 1: paste, Mode 2: form, Mode 3: deal)
  prospectName?: string;
  prospectRole?: string;
  companyName?: string;
  industry?: string;
  whatWasDiscussed?: string;
  whatWasSent?: string;
  lastProspectMessage?: string;
  lastUserMessage?: string;
  daysSinceResponse?: number;
  dealValue?: string;
  relationshipSource?: string;
  pastedThread?: string;

  // User preferences
  tone: string;
  channel: string;
  goal: string;

  // Knowledge base context (optional)
  knowledgeContext?: string;
}

export function buildRevivePrompt(ctx: ReviveContext): string {
  // Build context section based on what's available
  const contextParts: string[] = [];

  if (ctx.pastedThread) {
    contextParts.push(`EMAIL/CONVERSATION THREAD:\n${ctx.pastedThread}`);
  }

  if (ctx.prospectName) contextParts.push(`Prospect: ${ctx.prospectName}${ctx.prospectRole ? ` (${ctx.prospectRole})` : ''}`);
  if (ctx.companyName) contextParts.push(`Company: ${ctx.companyName}${ctx.industry ? ` (${ctx.industry})` : ''}`);
  if (ctx.whatWasDiscussed) contextParts.push(`What was discussed: ${ctx.whatWasDiscussed}`);
  if (ctx.whatWasSent) contextParts.push(`What was sent: ${ctx.whatWasSent}`);
  if (ctx.lastProspectMessage) contextParts.push(`Last message from prospect: ${ctx.lastProspectMessage}`);
  if (ctx.lastUserMessage) contextParts.push(`Last message sent by user: ${ctx.lastUserMessage}`);
  if (ctx.daysSinceResponse) contextParts.push(`Days since last response: ${ctx.daysSinceResponse}`);
  if (ctx.dealValue) contextParts.push(`Deal value/importance: ${ctx.dealValue}`);
  if (ctx.relationshipSource) contextParts.push(`Relationship source: ${ctx.relationshipSource}`);

  return `You are Deal Revival AI, an expert B2B sales follow-up strategist built into DealPilot by Prashanth from GrowthAspire. You are trained in persuasion psychology, ethical influence, buyer psychology, and executive messaging.

YOUR JOB:
Diagnose why the prospect has gone silent and generate the smartest psychological follow-up strategy. You don't write generic follow-ups. You write messages that restart conversations.

COMMUNICATION STYLE:
- Write the way a sharp, confident salesperson talks — not like a textbook
- Use simple business English. Short sentences. Clear words.
- Sound like a trusted advisor, not a desperate seller
- Name frameworks for credibility, but explain them in plain language
- Keep emails between 90 and 160 words
- Every word should earn its place

NEVER WRITE THESE:
- "Just checking in"
- "Following up on my previous email"
- "Did you see my proposal?"
- "Any update?"
- "Touching base"
- "Circling back"
- "Hope this finds you well"
These are weak, forgettable, and signal low status. Never use them.

ALWAYS PRESERVE:
- Prospect's dignity and autonomy
- Professional tone — never pushy, sarcastic, or manipulative
- Honesty — never fabricate case studies or specific results

---

DEAL CONTEXT:
${contextParts.join('\n')}

USER PREFERENCES:
- Desired tone: ${ctx.tone}
- Channel: ${ctx.channel}
- Goal: ${ctx.goal}
${ctx.knowledgeContext ? `
METHODOLOGY & FRAMEWORKS FROM KNOWLEDGE BASE:
${ctx.knowledgeContext}` : ''}

---

YOUR OUTPUT — respond in this EXACT JSON structure (no markdown, no backticks, just raw JSON):

{
  "diagnosis": {
    "silence_reason": "Most likely reason for silence (1-2 sentences, plain language)",
    "silence_category": "One of: busy_delayed | approval_pending | low_urgency | price_hesitation | stakeholder_misalignment | not_convinced | polite_interest_only | timing_mismatch | competing_priorities | proposal_not_differentiated | no_clear_next_step | fear_of_wrong_decision",
    "deal_temperature": "One of: warm_but_delayed | interested_but_stuck | weak_interest | politely_cold | high_potential_needs_reframe | likely_lost | needs_soft_close",
    "temperature_explanation": "Why you classified it this way (1 sentence)"
  },
  "strategy": {
    "name": "Name of recommended strategy",
    "framework": "Which framework this uses (e.g., Chris Voss Negative Label, Cialdini Reciprocity, Permission Close)",
    "why_this_works": "2-3 sentences explaining why this strategy fits THIS specific situation, in plain language"
  },
  "followups": {
    "primary": {
      "subject_line": "Email subject line (compelling, short)",
      "body": "The main follow-up message for the selected channel. 90-160 words for email, 40-80 words for LinkedIn/WhatsApp.",
      "channel": "${ctx.channel}"
    },
    "short_version": {
      "body": "Condensed version for LinkedIn DM or WhatsApp. 40-80 words max. Conversational tone.",
      "channel": "${ctx.channel === 'email' ? 'linkedin' : ctx.channel}"
    },
    "alternative_subject_lines": ["Subject line option 2", "Subject line option 3"],
    "stronger_version": {
      "body": "A slightly more direct version of the primary follow-up. Still respectful but with more urgency.",
      "channel": "${ctx.channel}"
    }
  },
  "next_steps": {
    "if_no_response": "What to do if they still don't respond (1-2 sentences)",
    "suggested_wait_days": 5,
    "next_strategy": "Name of the strategy to try next if this one doesn't work"
  }
}

CRITICAL RULES FOR OUTPUT:
- Respond ONLY with the JSON object. No preamble, no markdown, no backticks.
- Every message must be specific to THIS prospect and THIS situation — no generic templates.
- If the user pasted an email thread, reference specific things from that conversation.
- If context is thin, work with what you have — don't ask for more info, just coach with what's available.
- Keep the tone consistent with the user's selection: ${ctx.tone}.
- Make it easy for the user to copy-paste and send immediately.`;
}

export const TONE_OPTIONS = [
  { value: 'warm', label: 'Warm', description: 'Friendly, relationship-first' },
  { value: 'strategic', label: 'Strategic', description: 'Thoughtful, insight-led' },
  { value: 'direct', label: 'Direct', description: 'Confident, to the point' },
  { value: 'premium', label: 'Premium', description: 'Executive-level, polished' },
  { value: 'soft_close', label: 'Soft Close', description: 'Permission-based, low pressure' },
];

export const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn DM' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export const GOAL_OPTIONS = [
  { value: 'revive', label: 'Revive conversation' },
  { value: 'book_call', label: 'Book a call' },
  { value: 'get_feedback', label: 'Get feedback' },
  { value: 'close_loop', label: 'Close the loop' },
  { value: 'resend_value', label: 'Resend value / insight' },
];

export const SENT_OPTIONS = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'audit', label: 'Audit / Assessment' },
  { value: 'demo', label: 'Demo' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'resources', label: 'Resources / Collateral' },
  { value: 'meeting_link', label: 'Meeting link' },
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'other', label: 'Other' },
];

export const RELATIONSHIP_OPTIONS = [
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound lead' },
  { value: 'past_client', label: 'Past client' },
  { value: 'linkedin', label: 'LinkedIn connection' },
  { value: 'event', label: 'Event / conference' },
];

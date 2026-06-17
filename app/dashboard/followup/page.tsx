'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import {
  TONE_OPTIONS, CHANNEL_OPTIONS, GOAL_OPTIONS,
  SENT_OPTIONS, RELATIONSHIP_OPTIONS,
} from '@/lib/revive-prompt';
import {
  Zap, Loader2, Copy, Check, ChevronDown,
  RefreshCw, MessageSquare, Mail, Send,
  ThermometerSun, Brain, ArrowRight, Sparkles,
  AlertCircle, FileText, PenLine,
} from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TEMPERATURE_COLORS: Record<string, string> = {
  warm_but_delayed: 'text-amber-400 bg-amber-500/10',
  interested_but_stuck: 'text-orange-400 bg-orange-500/10',
  weak_interest: 'text-gray-400 bg-gray-500/10',
  politely_cold: 'text-blue-400 bg-blue-500/10',
  high_potential_needs_reframe: 'text-emerald-400 bg-emerald-500/10',
  likely_lost: 'text-red-400 bg-red-500/10',
  needs_soft_close: 'text-purple-400 bg-purple-500/10',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-surface-lighter transition-all text-gray-500 hover:text-gray-300">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function OutputBlock({ label, icon: Icon, content, className = '' }: { label: string; icon: any; content: string; className?: string }) {
  if (!content) return null;
  return (
    <div className={`card !p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <CopyButton text={content} />
      </div>
      <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  );
}

export default function FollowUpPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<'paste' | 'form'>('paste');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [freeUsed, setFreeUsed] = useState(0);
  const [deals, setDeals] = useState<{ id: string; deal_name: string; company_name: string }[]>([]);
  const [selectedDeal, setSelectedDeal] = useState('');

  // Form fields
  const [pastedThread, setPastedThread] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectRole, setProspectRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [whatWasDiscussed, setWhatWasDiscussed] = useState('');
  const [whatWasSent, setWhatWasSent] = useState('proposal');
  const [lastProspectMessage, setLastProspectMessage] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [daysSinceResponse, setDaysSinceResponse] = useState('7');
  const [dealValue, setDealValue] = useState('');
  const [relationshipSource, setRelationshipSource] = useState('cold_outreach');
  const [tone, setTone] = useState('strategic');
  const [channel, setChannel] = useState('email');
  const [goal, setGoal] = useState('revive');

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load free usage count
    const { count } = await supabase
      .from('followup_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setFreeUsed(count || 0);

    // Load deals for optional auto-fill
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id, deal_name, company_name, buyer_persona, buyer_name, deal_value, challenge, stage, additional_context')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });
    if (dealsData) setDeals(dealsData as any);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDealSelect = async (dealId: string) => {
    setSelectedDeal(dealId);
    if (!dealId) return;
    const deal = deals.find((d) => d.id === dealId) as any;
    if (deal) {
      setCompanyName(deal.company_name || '');
      setProspectName(deal.buyer_name || '');
      setProspectRole(deal.buyer_persona || '');
      setWhatWasDiscussed(deal.challenge || '');
      setDealValue(deal.deal_value || '');
      setMode('form');
    }
  };

  const handleGenerate = async () => {
    // Validate minimum input
    if (mode === 'paste' && !pastedThread.trim()) {
      toast.error('Paste your email thread or describe the situation');
      return;
    }
    if (mode === 'form' && !companyName.trim() && !whatWasDiscussed.trim()) {
      toast.error('Provide at least the company name or what was discussed');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/revive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pastedThread: mode === 'paste' ? pastedThread : undefined,
          prospectName,
          prospectRole,
          companyName,
          industry,
          whatWasDiscussed,
          whatWasSent,
          lastProspectMessage,
          lastUserMessage,
          daysSinceResponse: parseInt(daysSinceResponse) || 7,
          dealValue,
          relationshipSource,
          tone,
          channel,
          goal,
          dealId: selectedDeal || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NO_CREDITS') {
          toast.error('Free follow-ups used up. Purchase credits to continue.');
        } else {
          toast.error(data.error || 'Generation failed');
        }
        setGenerating(false);
        return;
      }

      setResult(data);
      setFreeUsed(data.usage?.free_used || freeUsed + 1);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = (newTone?: string) => {
    if (newTone) setTone(newTone);
    setResult(null);
    setTimeout(() => handleGenerate(), 100);
  };

  const output = result?.output;
  const FREE_LIMIT = 3;

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Follow-Up Generator</h1>
            <p className="text-sm text-gray-500">
              Stop &quot;just checking in.&quot; Diagnose the silence and send the right message.
            </p>
          </div>
        </div>
        {freeUsed < FREE_LIMIT && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mt-2">
            <Sparkles className="w-3 h-3" />
            {FREE_LIMIT - freeUsed} free generation{FREE_LIMIT - freeUsed !== 1 ? 's' : ''} remaining
          </div>
        )}
      </div>

      {!output ? (
        /* ========== INPUT SECTION ========== */
        <div>
          {/* Auto-fill from deal */}
          {deals.length > 0 && (
            <div className="card !p-4 mb-4">
              <label className="input-label flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" />
                Auto-fill from an existing deal (optional)
              </label>
              <div className="relative">
                <select
                  value={selectedDeal}
                  onChange={(e) => handleDealSelect(e.target.value)}
                  className="input-field appearance-none cursor-pointer !pr-10"
                >
                  <option value="">Select a deal...</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>{d.deal_name} — {d.company_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('paste')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'paste'
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-light border border-surface-border text-gray-500 hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste & Go
            </button>
            <button
              onClick={() => setMode('form')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'form'
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-light border border-surface-border text-gray-500 hover:text-gray-300'
              }`}
            >
              <PenLine className="w-4 h-4" />
              Quick Form
            </button>
          </div>

          {/* Paste mode */}
          {mode === 'paste' && (
            <div className="card mb-4">
              <label className="input-label">Paste your email thread, last conversation, or describe the situation</label>
              <textarea
                value={pastedThread}
                onChange={(e) => setPastedThread(e.target.value)}
                placeholder={"Paste the email thread here, or describe what happened:\n\n\"I sent a proposal to the CTO of Acme Corp 2 weeks ago after a great demo. He said he'd review it with his team. Haven't heard back since...\""}
                className="input-field min-h-[180px] resize-y"
                rows={8}
              />
            </div>
          )}

          {/* Form mode */}
          {mode === 'form' && (
            <div className="space-y-4 mb-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-400" />
                  Prospect Details
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Prospect name</label>
                    <input value={prospectName} onChange={(e) => setProspectName(e.target.value)} className="input-field" placeholder="e.g. Rajesh Kumar" />
                  </div>
                  <div>
                    <label className="input-label">Role / Title</label>
                    <input value={prospectRole} onChange={(e) => setProspectRole(e.target.value)} className="input-field" placeholder="e.g. CTO" />
                  </div>
                  <div>
                    <label className="input-label">Company</label>
                    <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input-field" placeholder="e.g. Acme Corp" />
                  </div>
                  <div>
                    <label className="input-label">Industry</label>
                    <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="input-field" placeholder="e.g. SaaS, Manufacturing" />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-brand-400" />
                  Deal Context
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="input-label">What was discussed?</label>
                    <textarea value={whatWasDiscussed} onChange={(e) => setWhatWasDiscussed(e.target.value)} className="input-field min-h-[80px] resize-y" placeholder="They're looking to automate their QC process. We showed them our AI inspection module..." rows={3} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">What was sent?</label>
                      <div className="relative">
                        <select value={whatWasSent} onChange={(e) => setWhatWasSent(e.target.value)} className="input-field appearance-none cursor-pointer !pr-10">
                          {SENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Relationship source</label>
                      <div className="relative">
                        <select value={relationshipSource} onChange={(e) => setRelationshipSource(e.target.value)} className="input-field appearance-none cursor-pointer !pr-10">
                          {RELATIONSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Their last message</label>
                    <input value={lastProspectMessage} onChange={(e) => setLastProspectMessage(e.target.value)} className="input-field" placeholder="e.g. 'Let me discuss with my team and get back to you'" />
                  </div>
                  <div>
                    <label className="input-label">Your last message</label>
                    <input value={lastUserMessage} onChange={(e) => setLastUserMessage(e.target.value)} className="input-field" placeholder="e.g. 'Sent the proposal with 3 pricing options'" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">Days since last response</label>
                      <input type="number" value={daysSinceResponse} onChange={(e) => setDaysSinceResponse(e.target.value)} className="input-field" min="1" />
                    </div>
                    <div>
                      <label className="input-label">Deal value (optional)</label>
                      <input value={dealValue} onChange={(e) => setDealValue(e.target.value)} className="input-field" placeholder="e.g. ₹5L" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tone, Channel, Goal — always visible */}
          <div className="card mb-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Tone</label>
                <div className="space-y-1.5">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                        tone === t.value
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                          : 'bg-surface-light border border-surface-border text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-[10px] opacity-70">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Channel</label>
                <div className="space-y-1.5">
                  {CHANNEL_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setChannel(c.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        channel === c.value
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                          : 'bg-surface-light border border-surface-border text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Goal</label>
                <div className="space-y-1.5">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        goal === g.value
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                          : 'bg-surface-light border border-surface-border text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full btn-primary !py-3.5 text-base font-semibold flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Diagnosing silence & crafting follow-up...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Revive My Deal
              </>
            )}
          </button>

          {freeUsed >= FREE_LIMIT && (
            <p className="text-xs text-center text-gray-500 mt-2 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              This will use 1 credit
            </p>
          )}
        </div>
      ) : (
        /* ========== OUTPUT SECTION ========== */
        <div className="space-y-4">
          {/* Diagnosis card */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-brand-400" />
              Silence Diagnosis
            </h3>
            <p className="text-sm text-gray-300 mb-3">{output.diagnosis?.silence_reason}</p>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                TEMPERATURE_COLORS[output.diagnosis?.deal_temperature] || 'text-gray-400 bg-gray-500/10'
              }`}>
                <ThermometerSun className="w-3 h-3 inline mr-1" />
                {(output.diagnosis?.deal_temperature || '').replace(/_/g, ' ')}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-lighter text-gray-400">
                {(output.diagnosis?.silence_category || '').replace(/_/g, ' ')}
              </span>
            </div>
            {output.diagnosis?.temperature_explanation && (
              <p className="text-xs text-gray-500 mt-2">{output.diagnosis.temperature_explanation}</p>
            )}
          </div>

          {/* Strategy card */}
          <div className="card !bg-brand-500/5 !border-brand-500/15">
            <h3 className="text-sm font-semibold text-brand-400 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Recommended Strategy: {output.strategy?.name}
            </h3>
            <p className="text-xs text-gray-400 mb-2">Framework: {output.strategy?.framework}</p>
            <p className="text-sm text-gray-300">{output.strategy?.why_this_works}</p>
          </div>

          {/* Subject lines */}
          {(output.followups?.primary?.subject_line || output.followups?.alternative_subject_lines?.length > 0) && (
            <div className="card !p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <Mail className="w-3.5 h-3.5" />
                Subject Lines
              </div>
              <div className="space-y-1.5">
                {output.followups?.primary?.subject_line && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-lighter">
                    <span className="text-sm text-gray-300">{output.followups.primary.subject_line}</span>
                    <CopyButton text={output.followups.primary.subject_line} />
                  </div>
                )}
                {output.followups?.alternative_subject_lines?.map((sl: string, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-lighter">
                    <span className="text-sm text-gray-300">{sl}</span>
                    <CopyButton text={sl} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary follow-up */}
          <OutputBlock
            label={`Primary Follow-Up (${output.followups?.primary?.channel || channel})`}
            icon={Send}
            content={output.followups?.primary?.body}
          />

          {/* Short version */}
          <OutputBlock
            label={`Short Version (${output.followups?.short_version?.channel || 'LinkedIn/WhatsApp'})`}
            icon={MessageSquare}
            content={output.followups?.short_version?.body}
          />

          {/* Stronger version */}
          <OutputBlock
            label="Stronger Version (More Direct)"
            icon={Zap}
            content={output.followups?.stronger_version?.body}
            className="!border-orange-500/15"
          />

          {/* Next steps */}
          {output.next_steps && (
            <div className="card !p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <ArrowRight className="w-3.5 h-3.5" />
                If No Response
              </div>
              <p className="text-sm text-gray-300 mb-1">{output.next_steps.if_no_response}</p>
              <p className="text-xs text-gray-500">
                Wait {output.next_steps.suggested_wait_days} days, then try: {output.next_steps.next_strategy}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleRegenerate()} className="btn-ghost text-xs flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
            <button onClick={() => handleRegenerate('warm')} className="btn-ghost text-xs">Make Softer</button>
            <button onClick={() => handleRegenerate('direct')} className="btn-ghost text-xs">Make More Direct</button>
            <button onClick={() => handleRegenerate('premium')} className="btn-ghost text-xs">Make More Strategic</button>
          </div>

          {/* Upsell to deal coaching */}
          <div className="card !p-5 !bg-brand-500/5 !border-brand-500/15 text-center">
            <Sparkles className="w-6 h-6 text-brand-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-white mb-1">Want ongoing coaching for this deal?</h4>
            <p className="text-xs text-gray-400 mb-3">
              Create a deal in DealPilot and get AI coaching with full deal memory, stage-aware strategy, and your methodology baked in.
            </p>
            <a href="/dashboard/deals/new" className="btn-primary !py-2 !px-5 text-xs inline-flex items-center gap-1.5">
              Create a Deal <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Start over */}
          <button
            onClick={() => { setResult(null); }}
            className="w-full btn-ghost !py-3 text-sm"
          >
            ← Generate Another Follow-Up
          </button>
        </div>
      )}
    </div>
  );
}

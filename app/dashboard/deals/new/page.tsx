'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { DealStage, DEAL_STAGES, BUYER_PERSONAS } from '@/lib/types';
import {
  ArrowLeft, ArrowRight, Loader2, Target, Building2,
  User, TrendingUp, AlertCircle, Sparkles, IndianRupee,
} from 'lucide-react';

type Step = 1 | 2 | 3;

export default function NewDealPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [dealName, setDealName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [buyerPersona, setBuyerPersona] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [stage, setStage] = useState<DealStage>('discovery');
  const [challenge, setChallenge] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          deal_name: dealName.trim(),
          company_name: companyName.trim(),
          deal_value: dealValue.trim(),
          buyer_persona: buyerPersona,
          buyer_name: buyerName.trim(),
          stage,
          challenge: challenge.trim(),
          additional_context: additionalContext.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Deal created! Your co-pilot is ready to coach.');
      router.push(`/dashboard/deals/${data.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stageOptions = Object.entries(DEAL_STAGES).filter(
    ([key]) => !['won', 'lost'].includes(key)
  );

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">New Deal</h1>
        <p className="text-sm text-gray-500">
          Tell DealPilot about this opportunity. The more context you provide,
          the more targeted your coaching will be.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              s < step ? 'bg-brand-500' : s === step ? 'bg-brand-500/60' : 'bg-surface-border'
            }`}
          />
        ))}
      </div>

      {/* Step labels */}
      <div className="flex items-center gap-6 mb-8 text-sm">
        {[
          { n: 1, label: 'The Deal', icon: Target },
          { n: 2, label: 'The Buyer', icon: User },
          { n: 3, label: 'The Challenge', icon: AlertCircle },
        ].map(({ n, label, icon: Icon }) => (
          <button
            key={n}
            onClick={() => n < step && setStep(n as Step)}
            className={`flex items-center gap-2 font-medium transition-all ${
              n === step
                ? 'text-brand-400'
                : n < step
                ? 'text-gray-400 cursor-pointer hover:text-gray-300'
                : 'text-gray-600 cursor-default'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card" key={step}>
        {/* Step 1: Deal basics */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="dealName" className="input-label">Deal Name</label>
              <input
                id="dealName"
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                placeholder="e.g. TCS — ERP Migration, Mahindra Fleet Analytics"
                className="input-field"
                required
              />
              <p className="mt-1 text-xs text-gray-600">
                A short, recognizable name for this opportunity.
              </p>
            </div>

            <div>
              <label htmlFor="companyName" className="input-label">
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                Target Company
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Tata Consultancy Services"
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="dealValue" className="input-label">
                <IndianRupee className="w-3.5 h-3.5 inline mr-1" />
                Deal Value (approximate)
              </label>
              <input
                id="dealValue"
                type="text"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. ₹2.4 Cr, $500K, ₹85 Lakhs"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="stage" className="input-label">
                <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                Current Deal Stage
              </label>
              <div className="grid grid-cols-3 gap-2">
                {stageOptions.map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setStage(key as DealStage)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      stage === key
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                        : 'border-surface-border bg-surface-light text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Buyer details */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="buyerPersona" className="input-label">
                Decision Maker Role
              </label>
              <select
                id="buyerPersona"
                value={buyerPersona}
                onChange={(e) => setBuyerPersona(e.target.value)}
                className="input-field appearance-none cursor-pointer"
                required
              >
                <option value="" disabled>Who is the key decision maker?</option>
                {BUYER_PERSONAS.map((persona) => (
                  <option key={persona} value={persona}>{persona}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-600">
                This shapes how DealPilot coaches you on stakeholder psychology.
              </p>
            </div>

            <div>
              <label htmlFor="buyerName" className="input-label">
                Decision Maker Name (optional)
              </label>
              <input
                id="buyerName"
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Rajiv Menon"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="additionalContext" className="input-label">
                Additional Context (optional)
              </label>
              <textarea
                id="additionalContext"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any other details that could help your coach — competitors involved, internal champions, budget constraints, political dynamics, timeline pressures..."
                className="input-field !min-h-[120px] resize-y"
              />
            </div>
          </div>
        )}

        {/* Step 3: Challenge */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="challenge" className="input-label">
                What&apos;s your current challenge with this deal?
              </label>
              <textarea
                id="challenge"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="e.g. The CIO seems interested but keeps postponing the decision. I've sent two follow-ups but no response. There's also a competing vendor who's offering a lower price. I'm not sure if I should push harder or take a different approach."
                className="input-field !min-h-[160px] resize-y"
                required
              />
              <p className="mt-1 text-xs text-gray-600">
                Be specific. What&apos;s blocking progress? What decision are you facing?
                The better you describe this, the more actionable your coaching will be.
              </p>
            </div>

            {/* Deal summary preview */}
            <div className="rounded-xl bg-navy-900/50 border border-surface-border p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Deal Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Deal</span>
                  <span className="text-white font-medium">{dealName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Company</span>
                  <span className="text-gray-300">{companyName || '—'}</span>
                </div>
                {dealValue && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Value</span>
                    <span className="text-gray-300">{dealValue}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Stage</span>
                  <span className={`stage-badge ${DEAL_STAGES[stage].className}`}>
                    {DEAL_STAGES[stage].label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Buyer</span>
                  <span className="text-gray-300">
                    {buyerName ? `${buyerName} (${buyerPersona})` : buyerPersona || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-surface-border">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="btn-ghost flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <Link href="/dashboard" className="btn-ghost flex items-center gap-1.5 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Link>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={
                (step === 1 && (!dealName || !companyName)) ||
                (step === 2 && !buyerPersona)
              }
              className="btn-primary flex items-center gap-2 text-sm"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !challenge}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Deal & Start Coaching
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Deal, DealStage, DEAL_STAGES, BUYER_PERSONAS } from '@/lib/types';
import {
  ArrowLeft, Loader2, Save, Building2, User,
  IndianRupee, TrendingUp, AlertCircle,
} from 'lucide-react';

export default function EditDealPage() {
  const router = useRouter();
  const params = useParams();
  const dealId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dealName, setDealName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [buyerPersona, setBuyerPersona] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [stage, setStage] = useState<DealStage>('discovery');
  const [challenge, setChallenge] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  const loadDeal = useCallback(async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (error || !data) {
      toast.error('Deal not found');
      router.push('/dashboard');
      return;
    }

    const deal = data as Deal;
    setDealName(deal.deal_name);
    setCompanyName(deal.company_name);
    setDealValue(deal.deal_value);
    setBuyerPersona(deal.buyer_persona);
    setBuyerName(deal.buyer_name);
    setStage(deal.stage);
    setChallenge(deal.challenge);
    setAdditionalContext(deal.additional_context);
    setLoading(false);
  }, [supabase, dealId, router]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('deals')
        .update({
          deal_name: dealName.trim(),
          company_name: companyName.trim(),
          deal_value: dealValue.trim(),
          buyer_persona: buyerPersona,
          buyer_name: buyerName.trim(),
          stage,
          challenge: challenge.trim(),
          additional_context: additionalContext.trim(),
        })
        .eq('id', dealId);

      if (error) throw error;

      toast.success('Deal updated');
      router.push(`/dashboard/deals/${dealId}`);
      router.refresh();
    } catch {
      toast.error('Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const stageOptions = Object.entries(DEAL_STAGES);

  return (
    <div className="animate-fade-in max-w-2xl">
      <Link
        href={`/dashboard/deals/${dealId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deal
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Edit Deal</h1>
        <p className="text-sm text-gray-500">
          Update the details for this deal. Changes to the challenge or context 
          will improve future coaching sessions.
        </p>
      </div>

      <div className="card">
        <div className="space-y-5">
          <div>
            <label htmlFor="dealName" className="input-label">Deal Name</label>
            <input
              id="dealName"
              type="text"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyName" className="input-label">
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                Company
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="dealValue" className="input-label">
                <IndianRupee className="w-3.5 h-3.5 inline mr-1" />
                Deal Value
              </label>
              <input
                id="dealValue"
                type="text"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="input-label">
              <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
              Deal Stage
            </label>
            <div className="grid grid-cols-4 gap-2">
              {stageOptions.map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setStage(key as DealStage)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
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

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="buyerPersona" className="input-label">
                <User className="w-3.5 h-3.5 inline mr-1" />
                Decision Maker Role
              </label>
              <select
                id="buyerPersona"
                value={buyerPersona}
                onChange={(e) => setBuyerPersona(e.target.value)}
                className="input-field appearance-none cursor-pointer"
              >
                <option value="" disabled>Select role</option>
                {BUYER_PERSONAS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="buyerName" className="input-label">
                Decision Maker Name
              </label>
              <input
                id="buyerName"
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="input-field"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="challenge" className="input-label">
              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
              Current Challenge
            </label>
            <textarea
              id="challenge"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              className="input-field !min-h-[120px] resize-y"
              placeholder="What's blocking this deal?"
            />
          </div>

          <div>
            <label htmlFor="additionalContext" className="input-label">
              Additional Context
            </label>
            <textarea
              id="additionalContext"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="input-field !min-h-[100px] resize-y"
              placeholder="Competitors, internal champions, timeline..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 pt-5 border-t border-surface-border">
          <Link
            href={`/dashboard/deals/${dealId}`}
            className="btn-ghost text-sm"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !dealName || !companyName}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

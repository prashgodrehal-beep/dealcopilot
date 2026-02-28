'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/types';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft, Loader2, MessageSquare, Edit3, Trash2,
  Building2, User, IndianRupee, TrendingUp, AlertCircle,
  Clock, Archive, CheckCircle2, XCircle, ChevronRight,
  Sparkles, Calendar,
} from 'lucide-react';

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dealId = params.id as string;
  const supabase = createClient();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setDeal(data as Deal);
    setLoading(false);
  }, [supabase, dealId, router]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const updateStage = async (newStage: DealStage) => {
    if (!deal) return;
    const { error } = await supabase
      .from('deals')
      .update({ stage: newStage })
      .eq('id', deal.id);

    if (error) {
      toast.error('Failed to update stage');
      return;
    }
    setDeal({ ...deal, stage: newStage });
    setShowStageMenu(false);
    toast.success(`Deal moved to ${DEAL_STAGES[newStage].label}`);
  };

  const archiveDeal = async () => {
    if (!deal) return;
    const { error } = await supabase
      .from('deals')
      .update({ is_active: false })
      .eq('id', deal.id);

    if (error) {
      toast.error('Failed to archive deal');
      return;
    }
    toast.success('Deal archived');
    router.push('/dashboard');
  };

  const deleteDeal = async () => {
    if (!deal) return;
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', deal.id);

    if (error) {
      toast.error('Failed to delete deal');
      return;
    }
    toast.success('Deal deleted');
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!deal) return null;

  const stageInfo = DEAL_STAGES[deal.stage];
  const stageKeys = Object.keys(DEAL_STAGES) as DealStage[];
  const activeStages = stageKeys.filter((s) => !['won', 'lost'].includes(s));
  const currentStageIndex = activeStages.indexOf(deal.stage);

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Deal header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{deal.deal_name}</h1>
            <span className={`stage-badge ${stageInfo.className}`}>
              {stageInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {deal.company_name}
            </span>
            {deal.deal_value && (
              <span className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" />
                {deal.deal_value}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(deal.updated_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/deals/${deal.id}/edit`}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost text-sm flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage pipeline */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400">Deal Pipeline</h3>
          <div className="relative">
            <button
              onClick={() => setShowStageMenu(!showStageMenu)}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              Move Stage
              <ChevronRight className={`w-3 h-3 transition-transform ${showStageMenu ? 'rotate-90' : ''}`} />
            </button>
            {showStageMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface-light border border-surface-border rounded-xl overflow-hidden shadow-xl z-20">
                {Object.entries(DEAL_STAGES).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => updateStage(key as DealStage)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${
                      key === deal.stage
                        ? 'bg-brand-500/10 text-brand-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-hover'
                    }`}
                  >
                    {info.label}
                    {key === deal.stage && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Visual pipeline */}
        <div className="flex items-center gap-1">
          {activeStages.map((s, i) => {
            const isComplete = i < currentStageIndex;
            const isCurrent = s === deal.stage;
            const isStalled = deal.stage === 'stalled';
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full h-2 rounded-full transition-all ${
                    isStalled && isCurrent
                      ? 'bg-red-500/50'
                      : isComplete
                      ? 'bg-brand-500'
                      : isCurrent
                      ? 'bg-brand-500/60'
                      : 'bg-surface-border'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    isCurrent ? 'text-brand-400' : isComplete ? 'text-gray-500' : 'text-gray-700'
                  }`}
                >
                  {DEAL_STAGES[s].label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Won/Lost badges */}
        {(deal.stage === 'won' || deal.stage === 'lost') && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl ${
            deal.stage === 'won' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {deal.stage === 'won' ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={`font-semibold ${deal.stage === 'won' ? 'text-green-400' : 'text-red-400'}`}>
              Deal {deal.stage === 'won' ? 'Won' : 'Lost'}
            </span>
          </div>
        )}
      </div>

      {/* Deal details grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Buyer info */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Buyer
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-600">Decision Maker</span>
              <p className="text-sm text-white">{deal.buyer_persona || '—'}</p>
            </div>
            {deal.buyer_name && (
              <div>
                <span className="text-xs text-gray-600">Name</span>
                <p className="text-sm text-white">{deal.buyer_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Timeline
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-600">Created</span>
              <p className="text-sm text-white">{formatDate(deal.created_at)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-600">Last Updated</span>
              <p className="text-sm text-white">{formatDate(deal.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Current Challenge
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {deal.challenge || 'No challenge described yet.'}
        </p>
      </div>

      {/* Additional context */}
      {deal.additional_context && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Additional Context
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {deal.additional_context}
          </p>
        </div>
      )}

      {/* Coaching sessions */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Coaching Sessions
          </h3>
          <Link
            href={`/dashboard/deals/${deal.id}/chat`}
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start Coaching
          </Link>
        </div>
        <div className="text-center py-8">
          <Link
            href={`/dashboard/deals/${deal.id}/chat`}
            className="inline-flex flex-col items-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-all">
              <Sparkles className="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                Open AI Coach
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Get stage-aware coaching with full deal context and your methodology.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => archiveDeal()}
          className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-1.5"
        >
          <Archive className="w-3.5 h-3.5" />
          Archive Deal
        </button>
        {deal.stage !== 'won' && (
          <button
            onClick={() => updateStage('won')}
            className="btn-ghost text-sm flex items-center gap-1.5 text-emerald-400 hover:bg-emerald-500/10"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark as Won
          </button>
        )}
        {deal.stage !== 'lost' && (
          <button
            onClick={() => updateStage('lost')}
            className="btn-ghost text-sm flex items-center gap-1.5 text-red-400 hover:bg-red-500/10"
          >
            <XCircle className="w-3.5 h-3.5" />
            Mark as Lost
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="card max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-2">Delete this deal?</h3>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete &quot;{deal.deal_name}&quot; and all its 
              coaching sessions. This cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteDeal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                Delete Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

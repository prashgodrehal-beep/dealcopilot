'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Deal, DEAL_STAGES, Profile } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  Plus, MessageSquare, Clock, TrendingUp, Compass,
  ArrowRight, Sparkles, Target, FileText, Loader2, ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, dealsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (dealsRes.data) setDeals(dealsRes.data as Deal[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const activeDeals = deals.filter((d) => !['won', 'lost'].includes(d.stage));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500 text-sm">
          {activeDeals.length > 0
            ? `You have ${activeDeals.length} active deal${activeDeals.length > 1 ? 's' : ''} in progress.`
            : 'Ready to add your first deal? Your AI co-pilot is standing by.'}
        </p>
      </div>

      {/* Quick stats */}
      {deals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card !p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Target className="w-3.5 h-3.5" />
              Active Deals
            </div>
            <div className="text-2xl font-bold text-white">{activeDeals.length}</div>
          </div>
          <div className="card !p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Sessions
            </div>
            <div className="text-2xl font-bold text-white">—</div>
          </div>
          <div className="card !p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Won Deals
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {deals.filter((d) => d.stage === 'won').length}
            </div>
          </div>
          <div className="card !p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Stalled
            </div>
            <div className="text-2xl font-bold text-red-400">
              {deals.filter((d) => d.stage === 'stalled').length}
            </div>
          </div>
        </div>
      )}

      {/* Deals list */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Deals</h2>
          <Link
            href="/dashboard/deals/new"
            className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </Link>
        </div>

        {deals.length === 0 ? (
          /* Empty state */
          <div className="card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-5">
              <Compass className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Your co-pilot is ready for takeoff
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Add your first deal and DealPilot will coach you through every stage — 
              from discovery to close — using proven persuasion psychology and decision science.
            </p>
            <Link
              href="/dashboard/deals/new"
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Deal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Deal cards */
          <div className="space-y-3">
            {deals.map((deal) => {
              const stageInfo = DEAL_STAGES[deal.stage];
              return (
                <Link
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="card-hover flex items-center justify-between gap-4 block"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white truncate">
                        {deal.deal_name}
                      </h3>
                      <span className={`stage-badge ${stageInfo.className} flex-shrink-0`}>
                        {stageInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="truncate">
                        {deal.company_name}
                        {deal.deal_value && ` · ${deal.deal_value}`}
                        {deal.buyer_persona && ` · ${deal.buyer_persona}`}
                      </span>
                      <span className="flex-shrink-0 text-xs text-gray-600">
                        {formatRelativeTime(deal.updated_at)}
                      </span>
                    </div>
                    {deal.challenge && (
                      <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">
                        Challenge: {deal.challenge}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/deals/${deal.id}/chat`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-2.5 rounded-xl bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all"
                    title="Start coaching session"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Coach Capabilities</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="card !p-5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Deal Strategy</h4>
            <p className="text-xs text-gray-500">
              &quot;What should I do next?&quot; — stage-aware coaching with full deal memory.
            </p>
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
              Active
            </span>
          </div>
          <div className="card !p-5 opacity-60">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Document Review</h4>
            <p className="text-xs text-gray-500">
              Upload proposals, paste emails — get persuasion-optimized feedback.
            </p>
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-surface-lighter text-gray-500">
              Stage 5
            </span>
          </div>
          <div className="card !p-5 opacity-60">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Credit System</h4>
            <p className="text-xs text-gray-500">
              Purchase credit packs to unlock coaching sessions with Razorpay.
            </p>
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-surface-lighter text-gray-500">
              Stage 6
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

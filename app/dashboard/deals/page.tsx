'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  Plus, Loader2, ChevronRight, Filter, Target,
} from 'lucide-react';

export default function DealsPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<DealStage | 'all'>('all');

  const loadDeals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (data) setDeals(data as Deal[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const filteredDeals = stageFilter === 'all'
    ? deals
    : deals.filter((d) => d.stage === stageFilter);

  const stageCounts = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Deals</h1>
          <p className="text-sm text-gray-500">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/dashboard/deals/new"
          className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Deal
        </Link>
      </div>

      {/* Stage filter pills */}
      {deals.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
              stageFilter === 'all'
                ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                : 'bg-surface-light text-gray-500 border border-surface-border hover:text-gray-300'
            }`}
          >
            All ({deals.length})
          </button>
          {Object.entries(DEAL_STAGES)
            .filter(([key]) => stageCounts[key])
            .map(([key, info]) => (
              <button
                key={key}
                onClick={() => setStageFilter(key as DealStage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                  stageFilter === key
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                    : 'bg-surface-light text-gray-500 border border-surface-border hover:text-gray-300'
                }`}
              >
                {info.label} ({stageCounts[key]})
              </button>
            ))}
        </div>
      )}

      {/* Deals */}
      {filteredDeals.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-brand-500" />
          </div>
          {deals.length === 0 ? (
            <>
              <h3 className="text-base font-semibold text-white mb-2">No deals yet</h3>
              <p className="text-sm text-gray-500 mb-5">
                Create your first deal to start getting AI coaching.
              </p>
              <Link
                href="/dashboard/deals/new"
                className="btn-primary text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Deal
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-white mb-2">
                No {DEAL_STAGES[stageFilter as DealStage]?.label || ''} deals
              </h3>
              <button
                onClick={() => setStageFilter('all')}
                className="text-sm text-brand-400 hover:text-brand-300"
              >
                Show all deals
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map((deal) => {
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
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { INDUSTRIES, COMPANY_SIZES } from '@/lib/types';
import {
  Compass, Building2, Package, Target, ArrowRight,
  ArrowLeft, Loader2, Check, Sparkles,
} from 'lucide-react';

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1 as Step, label: 'Your Company', icon: Building2 },
  { num: 2 as Step, label: 'Your Product', icon: Package },
  { num: 3 as Step, label: 'Your Buyers', icon: Target },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form state
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetIcp, setTargetIcp] = useState('');

  // Load existing profile data
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setCompanyName(profile.company_name || '');
        setCompanyIndustry(profile.company_industry || '');
        setCompanySize(profile.company_size || '');
        setProductDescription(profile.product_description || '');
        setTargetIcp(profile.target_icp || '');

        if (profile.onboarding_complete) {
          router.push('/dashboard');
          return;
        }
      }
      setInitialLoading(false);
    }
    loadProfile();
  }, [supabase, router]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          company_industry: companyIndustry,
          company_size: companySize,
          product_description: productDescription.trim(),
          target_icp: targetIcp.trim(),
          onboarding_complete: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile complete! Welcome to DealPilot.');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">DealPilot</span>
        </div>
        <div className="text-sm text-gray-500">Step {step} of 3</div>
      </div>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-20">
        {/* Progress bar */}
        <div className="flex gap-2 mb-10">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s.num < step
                  ? 'bg-brand-500'
                  : s.num === step
                  ? 'bg-brand-500/60'
                  : 'bg-surface-border'
              }`}
            />
          ))}
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-8 mb-10">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.num === step;
            const isDone = s.num < step;
            return (
              <button
                key={s.num}
                onClick={() => s.num < step && setStep(s.num)}
                className={`flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-brand-400'
                    : isDone
                    ? 'text-gray-400 cursor-pointer hover:text-gray-300'
                    : 'text-gray-600 cursor-default'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-brand-500/15 border border-brand-500/30'
                      : isDone
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-surface border border-surface-border'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form card */}
        <div className="card animate-fade-in" key={step}>
          {/* Step 1: Company */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Tell us about your company</h2>
                <p className="text-sm text-gray-500">
                  This helps DealPilot tailor coaching to your market context.
                </p>
              </div>

              <div>
                <label htmlFor="fullName" className="input-label">Your Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="companyName" className="input-label">Company Name</label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Infosys, TechVantage Solutions"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="industry" className="input-label">Industry</label>
                <select
                  id="industry"
                  value={companyIndustry}
                  onChange={(e) => setCompanyIndustry(e.target.value)}
                  className="input-field appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select your industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="companySize" className="input-label">Company Size</label>
                <select
                  id="companySize"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="input-field appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select company size</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Product */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">What do you sell?</h2>
                <p className="text-sm text-gray-500">
                  Describe your product or service. The more detail you give, 
                  the more relevant your coaching will be.
                </p>
              </div>

              <div>
                <label htmlFor="product" className="input-label">
                  Product / Service Description
                </label>
                <textarea
                  id="product"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="e.g. We provide enterprise ERP implementation services for manufacturing companies. Our solution includes supply chain optimization, production planning, and real-time analytics dashboards. Average deal size is ₹1-5 Cr with 6-12 month implementation cycles."
                  className="input-field !min-h-[160px] resize-y"
                  required
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  Include: what you sell, who benefits, deal sizes, and sales cycle length.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: ICP */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Who do you sell to?</h2>
                <p className="text-sm text-gray-500">
                  Define your ideal customer profile. This shapes how DealPilot 
                  coaches you on buyer psychology and decision dynamics.
                </p>
              </div>

              <div>
                <label htmlFor="icp" className="input-label">
                  Ideal Customer Profile (ICP)
                </label>
                <textarea
                  id="icp"
                  value={targetIcp}
                  onChange={(e) => setTargetIcp(e.target.value)}
                  placeholder="e.g. Mid-to-large manufacturing companies (500+ employees) in India. Decision makers are typically CIOs or VP Operations. They're looking to modernize legacy systems and improve operational efficiency. Key pain points: manual processes, data silos, and slow decision-making."
                  className="input-field !min-h-[160px] resize-y"
                  required
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  Include: company type, decision makers, their pain points, and buying motivations.
                </p>
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
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                disabled={
                  (step === 1 && (!fullName || !companyName || !companyIndustry || !companySize)) ||
                  (step === 2 && !productDescription)
                }
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !targetIcp}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Launch DealPilot
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Compass, ArrowRight, Brain, MessageSquare, Shield } from 'lucide-react';
export const dynamic = 'force-dynamic';


export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if profile is complete
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single();

    if (profile?.onboarding_complete) {
      redirect('/dashboard');
    } else {
      redirect('/profile/setup');
    }
  }

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">DealPilot</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm">
            Sign In
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm !py-2.5 !px-5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-soft"></span>
            Powered by Decision Science & Persuasion Psychology
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Your AI co-pilot
            <br />
            <span className="text-brand-500">through every deal</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            DealPilot coaches you through your entire B2B sales journey —
            from discovery to close — using proven frameworks in persuasion,
            neuroscience, and strategic selling.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup" className="btn-primary text-base flex items-center gap-2">
              Start Coaching
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login" className="btn-secondary text-base">
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-3 gap-5 mt-24 max-w-4xl mx-auto">
          <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Deal Strategy</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Get stage-specific coaching using Cialdini&apos;s principles,
              JTBD, and neuroscience of buying decisions.
            </p>
          </div>
          <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-brand-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Full Journey Memory</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your coach remembers every conversation.
              It builds on previous sessions as your deal evolves.
            </p>
          </div>
          <div className="card animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Document Review</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Paste emails or upload proposals.
              Get persuasion-optimized feedback instantly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-600">
        DealPilot by GrowthAspire · Built on Decision Science
      </footer>
    </div>
  );
}

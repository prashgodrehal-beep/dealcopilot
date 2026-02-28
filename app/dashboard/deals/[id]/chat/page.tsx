'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Deal, DEAL_STAGES } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Send, Loader2, Sparkles, Building2,
  User, IndianRupee, AlertCircle, ChevronRight,
  Clock, MessageSquare, FileText, Calendar,
  StopCircle, RotateCcw,
} from 'lucide-react';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Session {
  id: string;
  title: string;
  session_summary: string;
  deal_stage_at_session: string;
  created_at: string;
  is_active: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const dealId = params.id as string;
  const supabase = createClient();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadDeal = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [dealRes, sessionsRes, creditRes] = await Promise.all([
      supabase.from('deals').select('*').eq('id', dealId).single(),
      supabase
        .from('coaching_sessions')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false }),
      supabase.from('credit_balances').select('balance').eq('user_id', user.id).single(),
    ]);

    if (!dealRes.data) {
      toast.error('Deal not found');
      router.push('/dashboard');
      return;
    }

    setDeal(dealRes.data as Deal);
    setSessions((sessionsRes.data || []) as Session[]);
    setCreditBalance(creditRes.data?.balance || 0);

    // Load the most recent active session's messages if one exists
    const activeSession = (sessionsRes.data || []).find((s: Session) => s.is_active);
    if (activeSession) {
      setCurrentSessionId(activeSession.id);
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: true });

      if (msgs) setMessages(msgs as Message[]);
    }

    setLoading(false);
  }, [supabase, dealId, router]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    setMessages((msgs || []) as Message[]);
  };

  const startNewSession = () => {
    if (creditBalance < 1) {
      toast.error('You need at least 1 credit to start a new coaching session.');
      return;
    }
    setCurrentSessionId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI — add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Add placeholder for assistant
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: dealId,
          session_id: currentSessionId,
          message: userMessage,
          is_document_review: userMessage.length > 500,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'NO_CREDITS') {
          toast.error('No credits remaining. Purchase more to continue coaching.');
        } else {
          toast.error(error.error || 'Failed to send message');
        }
        // Remove the placeholder
        setMessages((prev) => prev.slice(0, -1));
        setSending(false);
        setStreaming(false);
        return;
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.text) {
                  fullText += data.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: fullText,
                    };
                    return updated;
                  });
                }

                if (data.done && data.session_id) {
                  setCurrentSessionId(data.session_id);
                  // Reload sessions list
                  const { data: sessionsData } = await supabase
                    .from('coaching_sessions')
                    .select('*')
                    .eq('deal_id', dealId)
                    .order('created_at', { ascending: false });
                  if (sessionsData) setSessions(sessionsData as Session[]);

                  // Reload credit balance
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const { data: creditData } = await supabase
                      .from('credit_balances')
                      .select('balance')
                      .eq('user_id', user.id)
                      .single();
                    if (creditData) setCreditBalance(creditData.balance);
                  }
                }

                if (data.error) {
                  toast.error(data.error);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to get response. Please try again.');
        // Remove the empty placeholder
        setMessages((prev) => {
          if (prev[prev.length - 1]?.content === '') {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      setSending(false);
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!deal) return null;

  const stageInfo = DEAL_STAGES[deal.stage];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] max-w-4xl">
      {/* Chat header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/dashboard/deals/${deal.id}`}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white truncate">{deal.deal_name}</h1>
              <span className={`stage-badge ${stageInfo.className} flex-shrink-0 text-[10px]`}>
                {stageInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {deal.company_name}
              {deal.deal_value && ` · ${deal.deal_value}`}
              {creditBalance !== null && ` · ${creditBalance} credits`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowContext(!showContext)}
            className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Context</span>
          </button>
          <button
            onClick={startNewSession}
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 pt-4 gap-4">
        {/* Context sidebar (togglable) */}
        {showContext && (
          <div className="w-64 flex-shrink-0 overflow-y-auto space-y-3 hidden lg:block">
            {/* Deal info */}
            <div className="card !p-3">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Deal</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Building2 className="w-3 h-3" />
                  {deal.company_name}
                </div>
                {deal.deal_value && (
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <IndianRupee className="w-3 h-3" />
                    {deal.deal_value}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-400">
                  <User className="w-3 h-3" />
                  {deal.buyer_persona}
                  {deal.buyer_name && ` — ${deal.buyer_name}`}
                </div>
              </div>
              {deal.challenge && (
                <div className="mt-2 pt-2 border-t border-surface-border">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    <AlertCircle className="w-3 h-3" />
                    Challenge
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-4">{deal.challenge}</p>
                </div>
              )}
            </div>

            {/* Previous sessions */}
            {sessions.length > 0 && (
              <div className="card !p-3">
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Sessions ({sessions.length})
                </h4>
                <div className="space-y-1.5">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                        currentSessionId === session.id
                          ? 'bg-brand-500/10 text-brand-400'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium">{session.title}</span>
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {formatDate(session.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Escalation CTA */}
            <div className="card !p-3 !bg-brand-500/5 !border-brand-500/15">
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <h4 className="text-xs font-semibold text-brand-400">Need deeper help?</h4>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">
                Book a live strategy session with Prashanth.
              </p>
              <a
                href={process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/support-lyq/ai-strategy-audit'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold"
              >
                Book a Call →
              </a>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {messages.length === 0 ? (
              /* Welcome state */
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-brand-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Ready to coach on {deal.deal_name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tell me what&apos;s happening with this deal. Describe your current situation,
                    share a challenge, or paste a document for review.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'What should my next move be?',
                      'The buyer went silent — help',
                      'Review my proposal approach',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs bg-surface-light border border-surface-border text-gray-400 hover:text-brand-400 hover:border-brand-500/30 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-brand-500/15 text-gray-200 rounded-br-md'
                          : 'bg-surface-light border border-surface-border text-gray-300 rounded-bl-md'
                      }`}
                    >
                      {msg.content ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : streaming && i === messages.length - 1 ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs">Thinking...</span>
                        </div>
                      ) : null}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 pt-4">
            <div className="relative bg-surface-light border border-surface-border rounded-2xl focus-within:border-brand-500/30 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  creditBalance < 1 && !currentSessionId
                    ? 'No credits remaining...'
                    : 'Describe your situation, ask for advice, or paste a document...'
                }
                disabled={sending || (creditBalance < 1 && !currentSessionId)}
                className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-600 px-4 py-3 pr-24 resize-none focus:outline-none min-h-[44px] max-h-[200px]"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                {streaming ? (
                  <button
                    onClick={stopStreaming}
                    className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all"
                    title="Stop generating"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending || (creditBalance < 1 && !currentSessionId)}
                    className={`p-2 rounded-xl transition-all ${
                      input.trim() && !sending
                        ? 'bg-brand-500 text-white hover:bg-brand-600'
                        : 'bg-surface-lighter text-gray-600'
                    }`}
                    title="Send message (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-2">
              {currentSessionId
                ? 'Continue this session — no extra credit charge'
                : creditBalance >= 1
                ? 'Starting a new session uses 1 credit'
                : 'Purchase credits to start a new coaching session'}
              {' · Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

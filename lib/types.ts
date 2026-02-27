// ============================================================
// DealPilot — Type Definitions
// ============================================================

export type DealStage =
  | 'discovery'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closing'
  | 'stalled'
  | 'won'
  | 'lost';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'document_review' | 'escalation';
export type DocumentType = 'proposal' | 'email' | 'presentation' | 'transcript' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  company_industry: string;
  product_description: string;
  target_icp: string;
  company_size: string;
  avatar_url: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  deal_name: string;
  company_name: string;
  deal_value: string;
  buyer_persona: string;
  buyer_name: string;
  stage: DealStage;
  challenge: string;
  additional_context: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachingSession {
  id: string;
  deal_id: string;
  user_id: string;
  title: string;
  session_summary: string;
  deal_stage_at_session: DealStage;
  credits_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'initial';
  description: string;
  reference_id: string;
  created_at: string;
}

// Deal stage metadata for UI rendering
export const DEAL_STAGES: Record<DealStage, { label: string; color: string; className: string }> = {
  discovery: { label: 'Discovery', color: '#3b82f6', className: 'stage-discovery' },
  qualification: { label: 'Qualification', color: '#a855f7', className: 'stage-qualification' },
  proposal: { label: 'Proposal', color: '#f59e0b', className: 'stage-proposal' },
  negotiation: { label: 'Negotiation', color: '#10b981', className: 'stage-negotiation' },
  closing: { label: 'Closing', color: '#22c55e', className: 'stage-closing' },
  stalled: { label: 'Stalled', color: '#ef4444', className: 'stage-stalled' },
  won: { label: 'Won', color: '#22c55e', className: 'stage-won' },
  lost: { label: 'Lost', color: '#ef4444', className: 'stage-lost' },
};

export const INDUSTRIES = [
  'Manufacturing',
  'Information Technology',
  'Healthcare & Pharma',
  'Banking & Financial Services',
  'Automobile',
  'Retail & E-commerce',
  'Telecom',
  'Energy & Utilities',
  'Real Estate & Construction',
  'Education',
  'Logistics & Supply Chain',
  'Media & Entertainment',
  'Government & Public Sector',
  'Other',
] as const;

export const BUYER_PERSONAS = [
  'CEO / Managing Director',
  'CIO / CTO',
  'CFO',
  'COO / VP Operations',
  'VP / Director Sales',
  'VP / Director Marketing',
  'VP / Director HR',
  'VP / Director Engineering',
  'General Manager',
  'Procurement Head',
  'Project Manager',
  'Other Decision Maker',
] as const;

export const COMPANY_SIZES = [
  'Startup (1-50)',
  'SMB (51-200)',
  'Mid-Market (201-1000)',
  'Enterprise (1000-5000)',
  'Large Enterprise (5000+)',
] as const;

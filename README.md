# 🧭 DealPilot — AI Sales Coach

> Your AI co-pilot through every deal. Powered by Decision Science & Persuasion Psychology.

**By GrowthAspire** | Built with Next.js 14, Supabase, and Claude API

---

## 🚀 Quick Start (Stage 1)

### Prerequisites
- **Node.js 18+** installed ([download](https://nodejs.org/))
- A **Supabase** account (free tier: [supabase.com](https://supabase.com))

### Step 1: Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `dealpilot`, choose a strong database password, select a region close to India
3. Wait for the project to be created (~2 minutes)
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Copy the entire contents of `supabase-schema.sql` and paste it in
6. Click **Run** — this creates all tables, security policies, and triggers
7. Go to **Settings** → **API** and copy:
   - `Project URL` (looks like `https://abc123.supabase.co`)
   - `anon/public` key (a long string starting with `eyJ...`)

### Step 2: Configure Environment

```bash
# Clone or download this project
cd dealpilot

# Create your environment file
cp .env.example .env.local
```

Edit `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — DealPilot is running!

### Step 4: Disable Email Confirmation (for testing)

In Supabase Dashboard:
1. Go to **Authentication** → **Providers** → **Email**
2. Toggle OFF "Confirm email" (you can re-enable later for production)
3. This lets you sign up and immediately use the app without checking email

---

## 📁 Project Structure

```
dealpilot/
├── app/
│   ├── layout.tsx              # Root layout (fonts, theme, toasts)
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles + Tailwind
│   ├── auth/
│   │   ├── login/page.tsx      # Login page
│   │   ├── signup/page.tsx     # Signup page
│   │   └── callback/route.ts   # Auth callback handler
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard sidebar layout
│   │   └── page.tsx            # Dashboard home
│   └── profile/
│       └── setup/page.tsx      # Onboarding form (3 steps)
├── lib/
│   ├── supabase-browser.ts     # Client-side Supabase
│   ├── supabase-server.ts      # Server-side Supabase
│   └── types.ts                # TypeScript types
├── middleware.ts                # Auth + route protection
├── supabase-schema.sql         # Full database schema
├── .env.example                # Environment template
└── tailwind.config.ts          # Custom theme
```

---

## 🗺️ Build Roadmap

| Stage | Status | What It Includes |
|-------|--------|------------------|
| **1. Auth + Profiles** | ✅ Complete | Login, signup, profile onboarding |
| **2. Deal Management** | 🔜 Next | Create, edit, manage deals |
| **3. Knowledge Base** | 📋 Planned | RAG pipeline for methodology |
| **4. Coaching Chat** | 📋 Planned | AI chat engine with deal memory |
| **5. Document Review** | 📋 Planned | Paste/upload for review |
| **6. Credits + Payments** | 📋 Planned | Razorpay integration |
| **7. Polish + Launch** | 📋 Planned | Escalation, UI refinement |

---

## 🔒 Security Notes

- **Row Level Security (RLS)** is enabled on all tables — users can only see their own data
- **No API keys** are hardcoded — all secrets live in `.env.local`
- **Middleware** protects dashboard routes from unauthenticated access
- **CSRF protection** is handled by Supabase auth tokens

---

## 🚢 Deployment (When Ready)

```bash
# Deploy to Vercel (recommended)
npm i -g vercel
vercel

# Set environment variables in Vercel dashboard
# Update NEXT_PUBLIC_APP_URL to your production domain
```

---

## 📝 License

Proprietary — GrowthAspire. All rights reserved.

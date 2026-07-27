# AI Business Lead Finder

A modern SaaS web application that helps freelancers, agencies, and sales teams discover local businesses that are good candidates for websites, AI automation, and WhatsApp AI chatbot services.

## Features

- **Business Search** — Search by business type, city, state, and country
- **AI Opportunity Score** — Automatically calculates opportunity based on website presence
- **Lead Management** — Save, track, and manage business leads with notes and status
- **AI Sales Tools** — Generate website pitches, WhatsApp messages, cold call scripts, and follow-ups
- **Dashboard** — Track searches, saved leads, contacted leads, and closed deals
- **Dark/Light Mode** — Full theme support
- **Responsive Design** — Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Components:** Radix UI primitives with custom styling
- **Backend:** Next.js API Routes + Supabase (ready for integration)
- **Maps:** Google Maps API (ready for integration)
- **AI:** OpenAI API (ready for integration)
- **Deployment:** Vercel

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key
- `OPENAI_API_KEY` — Your OpenAI API key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Your Google Maps API key
- `GOOGLE_PLACES_API_KEY` — Your Google Places API key

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
```

## Project Structure

```
app/
  ├── page.tsx              # Dashboard
  ├── search/page.tsx       # Business search
  ├── leads/page.tsx        # Saved leads management
  ├── lead/[id]/page.tsx    # Lead detail with AI tools
  ├── auth/login/page.tsx   # Login page
  ├── auth/signup/page.tsx  # Sign up page
  ├── settings/page.tsx     # User settings
  ├── api/search/route.ts   # Search API endpoint
  ├── api/ai-generate/      # AI generation API endpoint
  ├── layout.tsx            # Root layout with sidebar
  └── globals.css           # Global styles

components/
  ├── ui/                   # Reusable UI primitives
  ├── layout/               # Sidebar, header, theme
  ├── search/               # Search bar, results, cards
  ├── leads/                # Lead cards, filters
  ├── dashboard/            # Stats, activity
  ├── copy-button.tsx       # Copy to clipboard
  ├── ai-sales-tool-card.tsx
  └── subscription-plans.tsx

lib/
  ├── utils.ts              # Utility functions
  ├── mock-data.ts          # Mock business data generator
  ├── ai-tools.ts           # AI sales tool generators
  └── supabase/             # Supabase clients

types/
  └── index.ts              # TypeScript type definitions
```

## Subscription Plans

| Plan | Searches | Saved Leads | AI Tools | Price |
|------|----------|-------------|----------|-------|
| Free | 20/day | 50 | No | $0 |
| Pro | Unlimited | Unlimited | Yes | $29/mo |
| Agency | Unlimited | Unlimited | Yes + Team | $99/mo |

## License

MIT

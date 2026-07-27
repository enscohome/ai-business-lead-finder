# Deployment Guide

## Deploy to Vercel (Recommended)

### 1. Prepare Your Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Create Vercel Project

```bash
npm i -g vercel
vercel
```

Or connect your GitHub/GitLab repository on [vercel.com](https://vercel.com).

### 3. Environment Variables

In your Vercel project dashboard, add these environment variables:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | For AI features |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | For maps |
| `GOOGLE_PLACES_API_KEY` | Google Places API key | For real data |
| `NEXT_PUBLIC_APP_URL` | Your production URL | Yes |

### 4. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in the SQL Editor
3. Enable Email auth in Authentication > Providers
4. Add your Vercel URL to Authentication > URL Configuration > Site URL
5. Copy project URL and anon key to Vercel env vars

### 5. Google Cloud Setup (Optional)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Google Places API and Maps JavaScript API
3. Create API credentials and restrict them to your domain
4. Add the API key to Vercel env vars

### 6. OpenAI Setup (Optional)

1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. Add to Vercel env vars
3. Set `NEXT_PUBLIC_OPENAI_ENABLED=true`

### 7. Deploy

```bash
vercel --prod
```

---

## Deploy to Netlify

```bash
npm run build
netlify deploy --prod --dir=.next
```

Or use the Netlify Git integration with the same environment variables.

---

## Deploy to Railway

```bash
railway login
railway init
railway up
```

---

## Post-Deployment Checklist

- [ ] Dashboard loads without errors
- [ ] Search returns business results
- [ ] Can save leads to localStorage (or Supabase)
- [ ] AI tools generate on lead detail page
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive on all pages
- [ ] Auth login/signup flows work
- [ ] CSV export works on leads page
- [ ] Google Maps embed loads (if API key configured)
- [ ] Onboarding modal shows for new users

---

## Custom Domain Setup

1. Buy a domain (Cloudflare, Namecheap, etc.)
2. Add it to Vercel: Project Settings > Domains
3. Update DNS records as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` env var
5. Update Google API key restrictions to include new domain

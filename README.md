# Kitna? — Instant Item Appraisal &amp; Resale Value

Point your camera at any object (or upload a photo) and get an instant appraisal: what it is, its condition, a resale price range, and a ready-to-post marketplace listing — in under 10 seconds.

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (custom money-green theme)
- **Backend:** Supabase Edge Function (Deno) — vision AI via AIMLAPI
- **Fonts:** Varela Round (headings) + Nunito Sans (body)

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open http://localhost:5173 — the app works in **demo mode** immediately with pre-cached results for 5 test objects (mug, headphones, phone, sneaker, book).

## Live Appraisals

Live mode uses the [AIMLAPI](https://aimlapi.com) vision API to analyze real photos. To enable:

1. Get an AIMLAPI API key from [aimlapi.com](https://aimlapi.com)
2. **Do NOT put it in `.env`** — secrets belong in Supabase:
   - Go to your Supabase dashboard → Edge Functions → `appraise` → Secrets
   - Add `AIMLAPI_KEY`

Optional: `BRIGHTDATA_TOKEN` for live comparable-price lookups.

## Project Structure

```
src/
├── App.tsx                    # Screen router (capture → analyzing → results → listing)
├── main.tsx                   # Entry point
├── index.css                  # Tailwind v4 theme tokens
├── lib/
│   ├── types.ts               # Core data types (AppraisalResult, etc.)
│   ├── demo-data.ts           # Pre-cached demo responses + listing generators
│   ├── appraise.ts            # Client pipeline: compress → call edge function → validate
│   ├── compressImage.ts       # Canvas downscale to 1200px JPEG
│   ├── currency.ts            # INR formatting
│   ├── supabase.ts            # Supabase client singleton
│   └── utils.ts               # cn() helper
├── hooks/
│   └── useWebcam.ts           # Webcam hook
└── components/
    ├── CaptureScreen.tsx      # Webcam + upload + demo toggle
    ├── AnalyzingScreen.tsx    # Progressive reveal with vertical checklist
    ├── ResultsScreen.tsx      # Full appraisal + best-move card + listing CTA
    ├── ListingScreen.tsx      # Editable listing + Mol-bhaav negotiation cards
    └── ui/                    # shadcn/ui primitives
```

## Deployment

```bash
npm run build
```

The `dist/` folder is a static SPA — deploy to any static host. The Edge Function runs on Supabase's managed Deno runtime.

## License

MIT
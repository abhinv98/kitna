# Kitna? — Instant Item Appraisal &amp; Resale Value

**Submission — Kitna? is a camera-first resale appraiser for India, built for people decluttering or upgrading who have no idea what their stuff is worth.** Point your phone at anything and get a condition grade traceable to the specific wear visible in your own photo, a rupee resale range traceable to live marketplace listings pulled through Bright Data, a recommendation of where to sell for the best net, a ready-to-paste listing, and a Hindi-English Mol-bhaav script with your asking price and walk-away floor. Every number is labelled by confidence, and a price is never shown as live unless real listings back it. Built solo in native.builder.

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (custom money-green theme)
- **Backend:** Supabase Edge Function (Deno) — vision AI via AIMLAPI, live comparable listings via Bright Data, voice practice via Speechmatics
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

Optional: `BRIGHTDATA_TOKEN` + `BRIGHTDATA_ZONE` to fetch live comparable
prices (a price is only shown as "live" when a real listing is parsed —
otherwise the appraisal falls back to the model's estimate). Optional:
`SPEECHMATICS_API_KEY` for voice Mol-bhaav practice on the results screen.

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
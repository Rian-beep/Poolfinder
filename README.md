# PoolFinder UK

UK replica of the OpenClaw pool builder demo. Identifies UK residential properties suitable for swimming pool installation, runs a full 9-stage pipeline, and streams live activity events to a dark-mode operator dashboard.

## Stack

- **Next.js 14** (App Router) + **Tailwind CSS** — full visual control for the Gotham dark-mode aesthetic
- **SQLite** (better-sqlite3) — local file database
- **Anthropic API** — Claude Sonnet for satellite image analysis, Claude Haiku for postcard copy
- **Google Maps Static API** — satellite imagery for each property
- **PropertyData API** — UK average house prices and regional data
- **postcodes.io** — free UK postcode geocoding (no auth required)
- **pdf-lib** — postcard PDF generation (6×9 glossy format)

## Pipeline (9 stages)

1. **Lot scanned** — Google Maps satellite tile fetched, Claude Sonnet analyses for pool presence and lot size
2. **Pool-ready zone identified** — lot size + setback filter applied
3. **Pool rendered** — zoomed satellite view presented as rendering target (production: Imagen/Stable Diffusion)
4. **Listing agent identified** — estate agent looked up (production: PropertyData/Rightmove integration)
5. **Pool economics calculated** — build cost from regional UK data, value lift from PropertyData comps
6. **Postcard generated** — 6×9 PDF with address, economics, QR code, postcard copy from Claude Haiku
7. **Postcard mailed** — mocked (would mail via Lob, flagged in PDF footer)
8. **Microsite live** — URL generated as `{town}-{street}-{postcode}.poolfinder.uk` (mocked)
9. **Owner notified** — pipeline complete

## Setup

```bash
cp .env.local.example .env.local
# Fill in your API keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **+ Run next property**.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Yes | Enable Maps Static API in Google Cloud Console |
| `PROPERTY_DATA_API_KEY` | Yes | [propertydata.co.uk](https://propertydata.co.uk) |
| `ANTHROPIC_API_KEY` | Yes | Claude Sonnet (vision) + Haiku (copy) |

## Seed postcodes

10 affluent UK postcodes pre-loaded covering Surrey, Berkshire, Oxfordshire, Hertfordshire, Cambridgeshire, and Greater London. Run all 10 properties end-to-end with repeated clicks.

## Deferred for production

- **Live Lob postcard mailing** — currently PDF-only (noted in postcard footer)
- **Real pool rendering** — production would call Imagen 3 or Stable Diffusion XL with inpainting
- **Real microsite per property** — URL generated but not deployed
- **Address-matched retargeting** — Facebook/Google Custom Audience integration
- **Multi-region UK pricing** — currently uses PropertyData postcode averages; production would use Land Registry data
- **Real owner lookup** — Land Registry Title Register (requires paid HMLR access)

## Deployment

Tested on Vercel and Railway. The background pipeline runs in the same Node.js process; on Vercel Hobby tier with 10s function limits, deploy to Railway or a VPS instead.

```bash
npm run build
npm start
```

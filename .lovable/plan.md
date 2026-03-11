

## Rewrite Landing Page Content for Truth

### Overview
Remove all false claims (fake models, fake media types, fake social proof), replace with honest content about what PromptOS actually does: text prompt optimization + smart routing between Gemini Flash and Gemini Pro.

### Landing.tsx Changes

**Remove entirely:**
- `toolTabs` array (lines 27-60) — fake models (GPT-4o, Claude, DALL-E, etc.)
- `routingModels` array (lines 62-67) — fake model comparison
- `activeToolTab` state
- Section 4 "All Your AIs" (lines 322-374) — entire section with tabs
- Section 5 "Routing Demo" (lines 376-451) — animated mockup with fake data

**Replace Section 5 with a simpler "How It Works" section:**
- 3-step static layout: 1) Write your prompt → 2) PromptOS optimizes → 3) Best model executes
- Uses existing `fadeInView` animation, no fake data

**Replace Section 6 "For Who" with "Why PromptOS" — concrete benefits:**
- 3 cards with real claims: "Up to 64% fewer tokens", "Automatic model routing", "Real-time cost tracking"

**Pricing section:**
- Pro CTA button: change from `Link to="/register"` to a disabled-style button with "Coming Soon" text
- Remove "Image + Video + Audio" from pro features

### i18n Changes (all 4 files)

**Hero:** Rewrite to "Spend less on AI. Get better results." / subtitle about prompt optimization + smart routing (text only)

**Remove keys:** `landing.tools.*` (entire section), `landing.routing.*` (entire section)

**Add keys:** `landing.howItWorks.*` (badge, title, step1/2/3 title+desc)

**Rewrite:** `landing.why.*` → concrete benefit cards (token savings, routing, cost tracking)

**Update:** `landing.features.f2_desc` — remove "image, video, audio" references. `landing.pricing.pro_features` — remove media types, keep text-focused features. `landing.pricing.pro_cta` → "COMING SOON" / "EM BREVE" etc.

### Files Changed
- `src/pages/Landing.tsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`
- `src/i18n/locales/fr.json`
- `src/i18n/locales/es.json`


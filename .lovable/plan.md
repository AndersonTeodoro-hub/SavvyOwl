

## Plan: Create SavvyOwl Logo & Brand Assets

### Overview
Create an SVG owl logo matching the design spec, generate all required asset files, update `index.html` meta tags, and replace the current logo in Landing navbar and Dashboard sidebar.

### Logo SVG Design
Minimalist geometric owl face:
- Two circle eyes (left solid #3A86FF, right with lightning bolt cutout inside)
- Triangular ears on top
- Clean owl silhouette in #F0F6FF
- Works at 32px and up

### Files to Create

| File | Description |
|------|-------------|
| `/public/logo.svg` | Vector owl, transparent bg |
| `/public/logo-dark.svg` | Same owl on #080B14 bg |
| `/public/favicon.svg` | SVG favicon (browsers support it, replaces .ico) |
| `/public/apple-touch-icon.png` | 180x180 — will use inline SVG rendered as static asset reference |
| `/public/logo-192.png` | 192x192 PWA icon |
| `/public/logo-512.png` | 512x512 PWA icon |
| `/public/og-image.svg` | 1200x630 OG image with logo + text + blue glow |

**Note on PNG generation:** Since we're in a browser-only environment without image conversion tools, I'll create all assets as SVGs (which work everywhere) and for the PNG requirements (apple-touch-icon, PWA icons, og-image), I'll create SVG files that can be referenced directly. Modern browsers and social platforms handle SVGs. For `favicon`, SVG is now widely supported and preferred over `.ico`.

### Files to Modify

**`index.html`** — Add favicon, apple-touch-icon, and OG image references:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/logo.svg" />
<meta property="og:image" content="/og-image.svg" />
<meta name="twitter:image" content="/og-image.svg" />
```

**`src/pages/Landing.tsx`** (lines 76-88) — Replace the "S" circle logo with the owl SVG:
```tsx
<img src="/logo.svg" alt="SavvyOwl" className="h-9 w-9" />
```

**`src/components/DashboardSidebar.tsx`** (lines 38-41) — Replace the Zap icon with owl logo:
```tsx
<img src="/logo.svg" alt="SavvyOwl" className="h-8 w-8" />
```

**`src/pages/Login.tsx`** + **`src/pages/Register.tsx`** — Replace Zap icon in auth cards with owl logo.

### Technical Details
- All SVGs hand-crafted inline with the geometric owl design
- The owl shape: rounded head, two triangular ears, two circular eyes, small beak triangle
- Right eye contains a small lightning bolt path in negative space
- OG image SVG uses `<text>` elements for "SavvyOwl" and tagline, with a radial gradient blue glow behind the logo


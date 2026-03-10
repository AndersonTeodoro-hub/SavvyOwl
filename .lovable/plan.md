

## Premium Visual Redesign — PromptOS

### Overview
Complete visual overhaul from generic SaaS to premium AI aesthetic (Vercel/Linear/Stripe inspired). Dark mode as default, new color system, refined typography, glow effects, and redesigned landing page with hero section.

### 1. CSS Variables & Theme (`src/index.css`)
- **Dark (default/`:root`)**: Background `#080B14`, Surface1 `#0D1117`, Surface2 `#161B27`, Border `#1E2D40`, Primary `#3A86FF`, Accent `#00F5A0`, Text `#F0F6FF`, Text secondary `#8B9DB7`
- **Light (`.light` class)**: Keep existing light colors but adjusted to match the premium feel (white cards, slate text)
- Add CSS utilities: `.glow-primary` (blue box-shadow), `.gradient-text` (blue-to-mint gradient clip), `.glass` (backdrop-blur surface)
- Letter-spacing utilities for headlines (`-0.02em`) and accent labels (`0.1em`)
- Smooth `transition-all duration-200` on interactive elements
- `--radius: 0.75rem` (12px cards, 8px buttons)

### 2. Default Theme to Dark (`src/App.tsx`)
- Change `defaultTheme="light"` to `defaultTheme="dark"`

### 3. Landing Page Redesign (`src/pages/Landing.tsx`)
Complete rewrite:
- **Navbar**: Transparent + backdrop-blur, thin `rgba(255,255,255,0.06)` border, logo + "Features"/"Pricing" anchor links + language selector + ThemeToggle + ghost login + glowing primary CTA
- **Hero**: Full viewport height, subtle animated gradient background (CSS keyframe), pill badge "PLATAFORMA DE IA INTELIGENTE", huge headline with gradient text on key phrase, secondary text in `#8B9DB7`, two CTAs (primary glow + ghost outline), social proof line, floating dashboard mockup card with blue glow underneath
- **Features**: 3 cards with `#161B27` bg, `#1E2D40` border, icon in blue circle with glow, hover → blue border + glow
- **Pricing**: 3 dark cards, middle highlighted with blue border + glow + "MAIS POPULAR" pill badge
- **Footer**: Dark minimal with logo + copyright

### 4. Dashboard Sidebar (`src/components/DashboardSidebar.tsx`)
- Background: `#0D1117` (via CSS var), border-right `#1E2D40`
- Active nav item: blue left border + blue text + subtle blue bg pill
- Bottom: user name + plan badge
- Logo with subtle glow

### 5. Dashboard Layout (`src/layouts/DashboardLayout.tsx`)
- Header bar uses dark surface colors, subtle border

### 6. Dashboard Home (`src/pages/DashboardHome.tsx`)
- Stat cards: large white value (text-2xl→text-3xl), label in secondary text, icon top-right in blue
- Cards use Surface2 bg with Surface border, 12px radius

### 7. Chat Page (`src/pages/Chat.tsx`)
- User messages: `#1E2D40` bg, right-aligned
- AI messages: `#161B27` bg with blue left border, left-aligned
- Input bar: `#161B27` bg, `#1E2D40` border, focus → `#3A86FF` border + glow
- Mode selector: pill-style buttons, active = blue filled
- Conversation sidebar: dark surface bg

### 8. Analytics (`src/pages/Analytics.tsx`)
- Chart tooltip styles updated to new dark surface colors
- Stat cards match new design system

### 9. Prompts (`src/pages/Prompts.tsx`)
- Cards with hover → blue border glow effect

### 10. Login & Register (`src/pages/Login.tsx`, `src/pages/Register.tsx`)
- Dark gradient background, card with Surface2 + border, inputs with Surface1 bg
- Primary button with glow effect

### 11. Settings (`src/pages/SettingsPage.tsx`)
- Cards match new surface/border tokens

### 12. NotFound (`src/pages/NotFound.tsx`)
- Use `bg-background` instead of `bg-muted`

### 13. Onboarding Modal (`src/components/OnboardingModal.tsx`)
- Dialog uses new card/border colors

### Files Changed
- `src/index.css` — New color system + utility classes
- `src/App.tsx` — Default dark
- `src/pages/Landing.tsx` — Full redesign
- `src/components/DashboardSidebar.tsx` — Premium sidebar
- `src/layouts/DashboardLayout.tsx` — Refined header
- `src/pages/DashboardHome.tsx` — Premium stat cards
- `src/pages/Chat.tsx` — Redesigned chat bubbles + input
- `src/pages/Analytics.tsx` — Updated chart styles
- `src/pages/Prompts.tsx` — Card hover effects
- `src/pages/Login.tsx` — Dark gradient auth
- `src/pages/Register.tsx` — Dark gradient auth
- `src/pages/SettingsPage.tsx` — Surface colors
- `src/pages/NotFound.tsx` — Background fix
- `src/components/OnboardingModal.tsx` — Border/surface update


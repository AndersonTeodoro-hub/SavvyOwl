

## Add Multi-Language Support (i18n)

### Overview
Add full internationalization with 5 language options (PT, EN, FR, ES, Auto-detect) using i18next. Language selector in the navbar, preference persisted to localStorage and database.

### Database Change
- Add `language` column (text, default 'auto') to `profiles` table via migration

### New Dependencies
- `i18next` + `react-i18next` + `i18next-browser-languagedetector`

### New Files

**`src/i18n/index.ts`** — i18next config with browser language detection, localStorage persistence, fallback to English

**`src/i18n/locales/en.json`** — English translations (base)
**`src/i18n/locales/pt.json`** — Portuguese
**`src/i18n/locales/fr.json`** — French
**`src/i18n/locales/es.json`** — Spanish

All UI strings organized by namespace: `landing`, `auth`, `dashboard`, `chat`, `prompts`, `analytics`, `settings`, `onboarding`, `nav`, `common`

**`src/components/LanguageSelector.tsx`** — Globe icon dropdown with 5 options:
- 🌐 Auto-detect (default)
- 🇬🇧 English
- 🇵🇹 Portugues
- 🇫🇷 Francais
- 🇪🇸 Espanol

On change: updates i18next language, saves to localStorage, and if logged in, updates `profiles.language`

### Modified Files

- **`src/App.tsx`** — Import i18n config
- **`src/main.tsx`** — Ensure i18n initializes before render
- **`src/pages/Landing.tsx`** — Replace all hardcoded strings with `t()` calls; add LanguageSelector to navbar
- **`src/layouts/DashboardLayout.tsx`** — Add LanguageSelector to header bar
- **`src/pages/Login.tsx`** — `t()` for all labels/buttons
- **`src/pages/Register.tsx`** — `t()` for all labels/buttons
- **`src/pages/DashboardHome.tsx`** — `t()` for greeting, stat titles, activity labels
- **`src/pages/Chat.tsx`** — `t()` for mode labels, empty state, placeholder
- **`src/pages/Prompts.tsx`** — `t()` for page title, buttons, categories, modals
- **`src/pages/Analytics.tsx`** — `t()` for stat titles, chart labels, table headers
- **`src/pages/SettingsPage.tsx`** — `t()` for all section titles, labels, buttons
- **`src/components/OnboardingModal.tsx`** — `t()` for step titles and descriptions
- **`src/components/DashboardSidebar.tsx`** — `t()` for nav items
- **`src/pages/NotFound.tsx`** — `t()` for 404 text
- **`src/contexts/AuthContext.tsx`** — On login, load language preference from profile and apply to i18next

### Behavior
- First visit: auto-detect from browser locale, map to closest supported language (pt/en/fr/es), fallback en
- Logged-in user: load saved preference from profiles table on auth
- Language change is instant (no page reload)
- Starter prompts remain in English (they are content, not UI)


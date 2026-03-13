

## Plan: Full PWA Support + Mobile Responsiveness

This is a large implementation touching ~10 files. Here's the breakdown:

### 1. PWA Setup

**Create `/public/manifest.json`** — Web app manifest with icons, theme color, standalone display mode.

**Create `/public/sw.js`** — Simple service worker: cache app shell on install, serve cached assets when offline, show fallback for uncached navigation requests.

**Update `index.html`** — Add manifest link, theme-color meta, apple-mobile-web-app tags, apple-touch-icon. Add viewport `viewport-fit=cover` for iPhone notch support.

**Update `src/main.tsx`** — Register service worker on load.

### 2. Install Prompt Component

**Create `src/components/InstallPrompt.tsx`**:
- Listens for `beforeinstallprompt` event (Android/Chrome)
- Shows after 30 seconds OR when `install-prompt-trigger` custom event fires (triggered from Chat after first message)
- Detects iOS and shows manual instructions ("Tap Share → Add to Home Screen")
- Saves dismissal to `localStorage`, never shows again
- Subtle bottom banner with "Install" and "Not now" buttons

**Update `src/App.tsx`** — Add `<InstallPrompt />` globally.

**Update `src/pages/Chat.tsx`** — After first successful message send, dispatch `install-prompt-trigger` custom event.

### 3. Mobile Bottom Navigation for Dashboard

**Create `src/components/MobileBottomNav.tsx`**:
- Fixed bottom bar with 5 icons: Home, Chat, Prompts, Analytics, Settings
- Only visible on `md:hidden`
- 44px minimum touch targets
- Safe area bottom padding

**Update `src/layouts/DashboardLayout.tsx`**:
- Add `<MobileBottomNav />` 
- Add `pb-16 md:pb-0` to main content area on mobile to account for bottom nav
- Hide `<DashboardSidebar />` on mobile (it already collapses via SidebarProvider, but ensure bottom nav replaces it)

### 4. Chat Page Mobile Responsiveness

**Update `src/pages/Chat.tsx`**:
- Conversation sidebar: already `hidden md:flex` — good
- Add a mobile menu button (top-left) that opens conversations as a Drawer (bottom sheet)
- Input bar: make mode selector horizontally scrollable with `overflow-x-auto` on mobile, stack input full-width
- Messages: remove `max-w-[80%]` on mobile → use `max-w-full md:max-w-[80%]`
- Remove `max-w-3xl` constraint on mobile for message area

### 5. Landing Page Mobile Responsiveness

**Update `src/pages/Landing.tsx`**:
- Navbar: Add hamburger menu on mobile for nav links (Product, Pricing, Login, CTA)
- Hero: Already `text-center` with responsive text sizes — add stacked CTA on mobile (already single button, OK)
- Pricing grid: `grid-cols-1 md:grid-cols-2` (currently `md:grid-cols-2` with no mobile override — grid defaults to 1 col, already fine)
- How it works: `grid-cols-1 md:grid-cols-3` (already fine)
- Feature cards: already single column layout
- Models grid: `grid-cols-1 md:grid-cols-2`

### 6. Dashboard Home Mobile

**Update `src/pages/DashboardHome.tsx`**:
- Stats grid: already `grid-cols-2 lg:grid-cols-4` — good
- Welcome card button: stack on mobile
- Add safe-area padding

### 7. Global CSS

**Update `src/index.css`**:
- Add safe-area inset padding to body/root
- Ensure minimum 14px font on mobile
- Prevent horizontal overflow with `overflow-x: hidden` on html/body

### Files Summary

| Action | File |
|--------|------|
| Create | `/public/manifest.json` |
| Create | `/public/sw.js` |
| Create | `src/components/InstallPrompt.tsx` |
| Create | `src/components/MobileBottomNav.tsx` |
| Modify | `index.html` |
| Modify | `src/main.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/pages/Chat.tsx` |
| Modify | `src/pages/Landing.tsx` |
| Modify | `src/layouts/DashboardLayout.tsx` |
| Modify | `src/index.css` |


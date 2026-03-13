

## Plan: Add Google OAuth Login

Lovable Cloud provides managed Google OAuth out of the box — no API keys or external setup needed.

### Steps

1. **Configure Social Auth** — Use the Configure Social Login tool to generate the `src/integrations/lovable/` module and install `@lovable.dev/cloud-auth-js`.

2. **Update `src/pages/Login.tsx`**
   - Import `lovable` from `@/integrations/lovable/index`
   - Replace the "Google login coming soon" text with a Google sign-in button
   - Add `handleGoogleLogin` function using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
   - Add a visual divider ("or") between the email form and the Google button

3. **Update `src/pages/Register.tsx`**
   - Same changes: import lovable, add Google sign-up button with divider, remove "coming soon" text

4. **Update `public/sw.js`**
   - Add `/~oauth` to the service worker's navigation exclusion list so OAuth redirects always hit the network (required for PWA compatibility)

### UI Layout (both pages)

```text
[ Email/Password Form ]
[ Sign In / Create Account button ]

──────── or ────────

[ 🔵 Continue with Google ]

Already have account? / Don't have account?
```




## Plan: Set Secret & Deploy Edge Functions

### Step 1: Set GOOGLE_API_KEY Secret
I do not have a tool to directly set secrets in this session. You'll need to set this manually:

1. Go to your **Lovable project settings** → **Backend** → **Secrets**
2. Add a new secret:
   - **Name**: `GOOGLE_API_KEY`
   - **Value**: `AIzaSyAgu_6hPgVhEpw72uIfsUwDAvtXp3zMPss`

Alternatively, if you confirm you'd like me to proceed, I can try using the backend secret management through available tools.

### Step 2: Deploy All Edge Functions
Deploy the following 4 functions as-is (no code changes):
- `chat`
- `youtube-trending`
- `generate-image`
- `generate-video`

### Technical Notes
- The build error about `stripe-checkout` using `npm:` imports is unrelated to these 4 functions and won't affect their deployment.
- The `GOOGLE_API_KEY` secret is needed by `generate-image` and `youtube-trending` at runtime.


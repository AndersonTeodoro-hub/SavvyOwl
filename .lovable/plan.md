

## Create "optimize" Edge Function

### Overview
New edge function at `supabase/functions/optimize/index.ts` that classifies user prompts and optimizes them in two sequential AI calls, returning routing recommendations and cost estimates.

### Files to Create/Modify

1. **`supabase/functions/optimize/index.ts`** — New file with the complete optimize function logic:
   - CORS headers matching the chat function
   - Step 1: Classification call to `gemini-3-flash-preview` with the classifier system prompt, JSON parse of response
   - Step 2: Optimization call to `gemini-3-flash-preview` with the optimizer system prompt
   - Cost calculation using hardcoded rates from model_registry values (flash: 0.0001/0.0004, pro: 0.007/0.021 per 1k tokens)
   - Force `gemini-flash` for free plan users
   - Return JSON with original_prompt, optimized_prompt, classification, estimated_savings
   - Error handling for 429/402/500 from gateway

2. **`supabase/config.toml`** — Add optimize function entry:
   ```toml
   [functions.optimize]
   verify_jwt = false
   ```

### No Other Changes
- Chat edge function untouched
- No frontend changes
- No database changes




## Stripe Checkout & Webhook Edge Functions

### Stripe Products Created
- **Starter**: `prod_U84WaXlc3ht9OH` / `price_1T9oNWKg016ceaDVTLnC3PD7` (€9/month)
- **Pro**: `prod_U84WRSHp3uymuI` / `price_1T9oNrKg016ceaDVfoGdfk6W` (€19/month)

### Database Migration
Add `stripe_customer_id` column to `profiles`:
```sql
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text;
```

### Edge Function: `stripe-checkout`
Single function handling two actions via POST body:

- **`action: "create-checkout"`** — authenticates user via Supabase token, looks up or creates Stripe customer, creates a Checkout Session in subscription mode with the correct price_id based on `plan` param. Returns `{ url }`.

- **`action: "create-portal"`** — authenticates user, finds their Stripe customer (via `stripe_customer_id` from profiles), creates a Billing Portal session. Returns `{ url }`.

Config: `verify_jwt = false` (manual auth validation in code).

### Edge Function: `stripe-webhook`
Receives Stripe webhook events, verifies signature with `STRIPE_WEBHOOK_SECRET`.

Handles:
- `checkout.session.completed` — reads plan from metadata, updates `profiles.plan` and `profiles.stripe_customer_id`
- `customer.subscription.updated` — maps price_id back to plan name, updates `profiles.plan`
- `customer.subscription.deleted` — sets `profiles.plan = 'free'`

Config: `verify_jwt = false`.

**Requires**: User to add `STRIPE_WEBHOOK_SECRET` secret after creating the webhook endpoint in Stripe dashboard pointing to `https://hxgwzqtmpqjqhesuolfd.supabase.co/functions/v1/stripe-webhook`.

### Files Changed
- `supabase/config.toml` — add function entries
- `supabase/functions/stripe-checkout/index.ts` — new
- `supabase/functions/stripe-webhook/index.ts` — new
- Database migration for `stripe_customer_id`

### No Changes To
- Frontend components
- Chat or optimize edge functions
- Existing database structure (beyond adding the one column)




## Create `model_registry` Table + Seed Data

### Database Migration
Create table `model_registry` with all specified columns. RLS will be **disabled** (public catalog). Then insert 2 records (Gemini Flash + Gemini Pro).

### No Other Changes
No existing tables, edge functions, or frontend files will be modified.

### Technical Details

**Migration SQL:**
```sql
CREATE TABLE public.model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text UNIQUE NOT NULL,
  display_name text,
  provider text,
  gateway_model_string text,
  cost_per_1k_input numeric,
  cost_per_1k_output numeric,
  max_tokens integer,
  strengths text[],
  speed_tier text,
  quality_tier text,
  is_active boolean DEFAULT true,
  min_plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);
```

**Seed data** (via insert tool):
- Gemini Flash (fast/standard/free)
- Gemini Pro (medium/premium/free)


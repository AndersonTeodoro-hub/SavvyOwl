

## Plan: Fix build error + Add Opus mode to Chat

### 1. Fix build error — `delete-account/index.ts` (line 2)
Change `import { createClient } from "npm:@supabase/supabase-js@2.57.2"` to `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"` — matching the pattern used in `chat/index.ts`.

### 2. Chat.tsx changes

**Line 9** — Add `Lock` to lucide imports:
```
import { Send, Plus, MessageSquare, Zap, Brain, Pen, Sparkles, ChevronDown, Lock } from "lucide-react";
```

**Line 16** — Extend Mode type:
```
type Mode = "quick" | "deep" | "creator" | "opus";
```

**Line 33** — Add opus to modeLabels:
```
creator: { ... },
opus: { label: "Opus", icon: Sparkles, desc: "Claude Opus — maximum power (Pro only)" },
```

**Lines 283-298** — Replace mode selector pills with logic that locks Opus for non-Pro users:
- If `key === "opus" && profile?.plan !== "pro"`: show Lock icon, greyed out (`text-muted-foreground/40 cursor-not-allowed`), toast on click
- Otherwise: normal pill behavior

### Files changed
| File | Change |
|------|--------|
| `supabase/functions/delete-account/index.ts` | Fix import (line 2) |
| `src/pages/Chat.tsx` | Add Opus mode + Lock icon |


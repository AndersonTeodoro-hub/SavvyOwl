

## Fix: Chat Edge Function — Invalid Model

**Causa raiz:** O modelo `google/gemini-2.0-flash` usado no modo "quick" foi descontinuado do gateway Lovable AI. Os logs confirmam:

```
invalid model: google/gemini-2.0-flash, allowed models: [... google/gemini-2.5-flash ...]
```

Os secrets (LOVABLE_API_KEY, ANTHROPIC_API_KEY) estão todos configurados — não é problema de chaves.

**Correção:** Uma única linha em `supabase/functions/chat/index.ts`:

- Linha 27: mudar `"google/gemini-2.0-flash"` → `"google/gemini-2.5-flash"`

Nada mais precisa de mudar. A edge function será redeployada automaticamente e o chat volta a funcionar.


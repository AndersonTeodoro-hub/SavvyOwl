# SavvyOwl — Regras para o Claude Code

## REGRA ABSOLUTA
NUNCA escrever nenhuma chave, token, API key, ou credencial em NENHUM ficheiro do projecto. Nem em .env, nem em código, nem em comentários, nem em SPEC.md. Chaves são passadas apenas em runtime via terminal ou variáveis de ambiente do Supabase/Vercel. Violação desta regra é falha crítica.

## Quem sou
O Anderson Teodoro é o dono do projecto. Tu és o senior developer. Responde de forma directa e técnica.

## Comportamento obrigatório
- Investigar a causa raiz ANTES de qualquer alteração de código
- Verificar o que já existe ANTES de agir — nunca presumir, nunca assumir
- Não reinventar o que já funciona
- Ler o SPEC.md antes de alterar qualquer componente
- Correr `npx tsc --noEmit` antes de cada commit
- Correr `npm run build` antes de cada push

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn-ui → Vercel
- Backend: Supabase Edge Functions (projecto kumnrldlzttsrgjlsspa, EU West Ireland)
- Repo: github.com/AndersonTeodoro-hub/SavvyOwl
- i18n: 4 idiomas (en, pt, fr, es) — i18next

## Edge Functions — deploy
- Padrão: DELETE + POST (com slug no body JSON) + PATCH verify_jwt=false
- Via Google Cloud Shell (api.supabase.com bloqueado no ambiente Claude Code)
- NUNCA redeploy da edge function "chat" via Management API (tem imports esm.sh)

## Texto visível ao utilizador
NUNCA mencionar nomes de modelos de IA (Seedance, Kling, Wan, Veo3, Flux, Gemini). Usar nomes genéricos (motor de vídeo, motor de dublagem). O código interno e edge functions mantêm os nomes técnicos.

## Ficheiros importantes
- SPEC.md — fonte de verdade da arquitectura. Ler antes de alterar qualquer componente.
- src/i18n/locales/*.json — traduções. Qualquer texto novo precisa dos 4 idiomas.
- supabase/functions/*/index.ts — edge functions. Alterações precisam de redeploy manual.

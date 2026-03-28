# RESUMO PARA PRÓXIMO CHAT — SavvyOwl (28/03/2026)

## REGRA OBRIGATÓRIA ANTES DE QUALQUER COISA
```bash
git clone https://GH_TOKEN_SEE_ANDERSON@github.com/AndersonTeodoro-hub/SavvyOwl.git
cd SavvyOwl
git log --oneline -5
```
Não escreves código sem ter o repo clonado. Não usas PATCH na Management API com imports externos — dá BOOT_ERROR.

---

## ESTADO REAL (confirmado ao vivo hoje)

### Edge Functions — todas a funcionar ✅
| Função | Status | Notas |
|--------|--------|-------|
| chat | ✅ 200 | não tocar — deployada via CLI original |
| character-engine | ✅ 200 | não tocar — deployada via CLI original |
| generate-image | ✅ 200 | Deno.serve() + fetch nativo, plan-based models |
| generate-video | ✅ 200 | fal.ai Veo3 Fast, precisa créditos fal.ai |
| generate-voice | ✅ 200 | |
| stripe-checkout | ✅ 200 | fetch nativo — sem SDK Stripe |
| stripe-webhook | ✅ (400 OPTIONS = correcto) | Stripe chama directamente, sem CORS |
| youtube-trending | ✅ 200 | |
| optimize | ✅ 200 | |

### Regra crítica de deploy
- Funções com `serve()` do std + `esm.sh` → funcionam (chat, character-engine)
- Funções com `Deno.serve()` + `fetch` nativo → funcionam (todas as outras)
- Funções com `npm:` ou `esm.sh` em PATCH via Management API → BOOT_ERROR
- **Nunca usar PATCH repetido** — corrompe a função. Se falhar, DELETE + POST fresh.

---

## O QUE FOI FEITO NESTA SESSÃO

### ✅ Vertex AI Imagen 3
- Service Account `savvyowl-vertex` criada no GCP
- Role "Vertex AI User" atribuído
- `VERTEX_SERVICE_ACCOUNT_JSON` nos secrets do Supabase
- `VERTEX_PROJECT_ID` = `gen-lang-client-0464073001`
- Testado e confirmado: imagem gerada com sucesso via Vertex

### ✅ fal.ai (substitui Vertex Veo3 directo — 87% mais barato)
- Conta criada em fal.ai para empresa SavvyOwl
- `FAL_API_KEY` nos secrets do Supabase
- Veo3 Fast: ~€0,80/vídeo (vs €6,00 via Vertex directo)
- **FALTA: carregar $20 em fal.ai/dashboard/billing** (conta com saldo $0)

### ✅ Sistema de Créditos
- DB: `credits_balance` e `credits_total_purchased` na tabela `profiles`
- Tabela `credit_transactions` (audit trail)
- Default: 10 créditos para novos utilizadores (trigger + coluna DEFAULT 10)
- Custos: 1 crédito = imagem, 10 créditos = vídeo
- Plan credits: Free=10, Starter=150, Pro=500

### ✅ Stripe — completo
- Webhook secret: `STRIPE_WEBHOOK_SECRET` nos secrets do Supabase
- Produtos criados:
  - Starter €14,99/mês → `price_1TG1KaKg016ceaDVbTqFq1CW`
  - Pro €34,99/mês → `price_1TG1NMKg016ceaDVQFtsygnH`
  - Pack S €4,99 (50 créditos) → `price_1TG1OiKg016ceaDVYWhCa8st`
  - Pack M €12,99 (150 créditos) → `price_1TG1QCKg016ceaDVLsAC6Za1`
  - Pack L €29,99 (400 créditos) → `price_1TG1RUKg016ceaDVKYrWhI6V`
- Webhook trata: checkout.session.completed, subscription.updated, subscription.deleted, invoice.paid
- stripe-checkout usa fetch nativo (sem SDK) — funciona

### ✅ Geração de Imagens — Plan-Based Model Routing
- Free → `gemini-2.5-flash-image`
- Starter → `gemini-3.1-flash-image-preview`
- Pro → `gemini-3-pro-image-preview` (máxima consistência visual)
- Fallback automático se modelo falhar

### ✅ Landing Page — Redesign Completo
- Novo design editorial de luxo (fundo preto, ouro, tipografia Cormorant)
- Hero com parallax, stats bar, pain section, features, how it works, pricing, FAQ
- Página `/pricing` dedicada com 3 planos + 3 packs de créditos + FAQ
- Preços reais: €0 / €14,99 / €34,99

### ✅ Character Engine Pipeline — Integrado em Todo o Lado
- `GenerateImageButton`: identity block + negative prompt automático
- `GenerateVideoButton`: identity block antes da direcção de cena
- `StructuredTemplates`: 6 templates com injeção automática
- `Chat.tsx → chat edge function`: envia characterBlock, backend tem 6 regras rígidas

### ✅ Bug Fixes
- CharactersPage: loop de 401 → 429 → logout resolvido
  - Causa: getSession() + onAuthStateChange duplicava chamadas com token expirado
  - Fix: usa `user` do AuthContext (já validado), chama engine.list() uma vez
- useCharacterEngine: retry agressivo (3x) removido — agora 1 tentativa + 1 refresh
- SettingsPage: botão Pro adicionado, preços €14,99/€34,99 correctos
- CharacterSelector: z-index [200] + overflow-y visible no toolbar

---

## O QUE FALTA (por ordem de prioridade)

### 🔴 URGENTE — fal.ai créditos
Carregar $20 em https://fal.ai/dashboard/billing
Sem isto, todos os vídeos falham com "Exhausted balance"

### 🟡 SettingsPage — packs de créditos
Existe `/pricing` com os packs mas dentro do dashboard não há botão directo para comprar Pack S/M/L.
Adicionar card com 3 packs + botão checkout na SettingsPage.

### 🟡 Testar fluxo completo em produção
Registo → 10 créditos → gerar imagem → crédito descontado → confirmado.
Nunca foi testado end-to-end em produção.

### 🟠 Onboarding flow
Utilizador regista-se → vai directamente para chat. Falta guia de primeiros passos.

### 🟠 img2vid com referência do Character
A imagem de referência criada no CharactersPage ainda não é usada como ref frame no Veo3.

---

## SUPABASE
- Project ID: `kumnrldlzttsrgjlsspa`
- URL: `https://kumnrldlzttsrgjlsspa.supabase.co`
- Região: EU West

## GIT
- Repo: `https://github.com/AndersonTeodoro-hub/SavvyOwl`
- Branch: main
- Último commit: `ba40fab` — fix: CharactersPage auth loop

## LIVE APP
- URL: `https://savvyowl.app`
- Deploy: Vercel auto-deploy no push para main

## NEGÓCIO
- Produto: plataforma UGC com IA, diferenciador = Character Engine (consistência visual)
- Público: social media managers, UGC creators, agências
- Fundador: Anderson Teodoro (Lisbon, PT)
- Língua principal: Português (PT/BR)

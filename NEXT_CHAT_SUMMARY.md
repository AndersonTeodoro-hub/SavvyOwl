# SavvyOwl — Estado do Projeto (30/03/2026 Final)

## PROBLEMAS RESOLVIDOS HOJE

### 1. Character Engine agora é injetado nos prompts de vídeo ✅
- identityBlock é construído a partir do expanded JSON do personagem
- É pré-pendido automaticamente ao prompt de cena antes de enviar ao fal.ai
- Smart prepend: verifica se o prompt já contém 'FIXED CHARACTER' marker antes de adicionar (evita duplicação)
- **Wan 2.6**: usa `wanT2VBlock` — prosa densa contínua (sem labels), optimizada para text-only consistency
- **Veo3**: usa `identityBlock` — formato padrão

### 2. identityBlock persiste com page reload ✅
- **ROOT CAUSE**: `CharacterContext.activeCharacter` reset para null no reload; `pipeline.characterId` era restaurado do localStorage mas `activeCharacter` não
- **Fix**: `useEffect` re-selecciona o personagem do localStorage quando `pipeline.characterId` existe mas `activeCharacter` é null
- **Safety guard**: se `characterId` existe mas `identityBlock` é null, mostra toast de erro e aborta a geração (em vez de gerar com identidade genérica)

### 3. Geração de cenas usa Claude Sonnet quando há personagem ✅
- **ROOT CAUSE**: Gemini Flash ignorava as instruções complexas de identidade no system prompt
- **Fix**: `handleGenerateScenes` usa `mode: deep` (Claude Sonnet) quando personagem está activo
- `callChat` aceita parâmetro `mode` opcional (default: `quick`)

### 4. Prompts de cena sem duplicação de identidade ✅
- Template diz ao Claude para NÃO incluir descrição física (é adicionada automaticamente pelo frontend)
- Parser de cenas requer ambos `DESC:` e `PROMPT:` para aceitar um bloco (descarta lixo antes da CENA 1)
- Resultado: prompts de cena contêm apenas acção/cena/câmara

### 5. Veo3 recebe `generate_audio: false` quando há narração ✅
- **ROOT CAUSE**: o parâmetro `generate_audio` nunca era enviado ao fal.ai → defaultava para `true`; o texto "No dialogue" no prompt era ignorado
- **Fix backend** (`generate-video`): lê flag `silentVideo` do request body; para modelos Veo3 envia `generate_audio: false` quando `silentVideo=true`; quando não há narração envia `generate_audio: true` (áudio nativo)
- **Fix frontend**: detecção de narração verifica `voiceUrl` OR `narrationStorageUrl` OR `audioDuration` OR texto 'Silent cinematic footage' no prompt (fallback para reload)
- `audioDuration` persiste em localStorage (sobrevive reload)

### 6. Dois caminhos de geração de vídeo optimizados ✅
| Caminho | Modelo | Duração | Identidade | Créditos |
|---------|--------|---------|------------|---------|
| Veo3 I2V | `fal-ai/veo3/fast/image-to-video` | 8s | reference_image_url (garante identidade visual) | 10 |
| Veo3 T2V | `fal-ai/veo3/fast` | 8s (sem ref. image) | identityBlock texto | 8 |
| Wan T2V | `wan/v2.6/text-to-video` | 15s | wanT2VBlock prosa densa | 5 |

- Frontend selecciona caminho automaticamente: se há `referenceImageUrl` → Veo3 I2V; se modelo é Veo3 sem imagem → Veo3 T2V; se 15s → Wan T2V
- `referenceImageUrl` só é enviado quando o modelo é `veo3-fast-i2v`

### 7. Idioma dos prompts ✅
- Os prompts de cena gerados pelo Claude estão correctos para o modelo (não há conflito de idioma reportado)

### 8. Créditos — custo correcto por modelo ✅
- T2V Wan 2.6 = 5 créditos, Veo3 Fast = 8 créditos, Veo3 I2V = 10 créditos
- Saldo de créditos visível no header da pipeline

### 9. generate-voice — stack overflow corrigido ✅
- Fix para call stack overflow em ficheiros de áudio grandes

## O QUE FUNCIONA (CONFIRMADO)

### Geração de vídeo — submit+poll architecture
- **CONFIRMADO**: O submit+poll funciona. Teste real gerou vídeo em 70 segundos
- URL de teste: https://v3b.fal.media/files/b/0a9427fa/9UBfl94DFECDy31Bd2c47_dxqK85bK.mp4
- Edge function `generate-video` retorna `statusUrl` e `responseUrl` no submit
- Frontend (DarkPipelinePage + GenerateVideoButton) faz polling com esses URLs

### Narração com ElevenLabs
- Character voice ID é detectado quando personagem é selecionado
- Narração gerada com a voz do personagem (ElevenLabs)
- Duração do áudio capturada → scene count auto-calculado
- `audioDuration` persiste em localStorage

### Estado persiste com F5
- Pipeline state guardado em localStorage
- identityBlock re-carregado via CharacterContext no reload
- Botão "Novo Projeto" para limpar

### Character Engine — buildWanT2VIdentity()
- Nova função em `src/lib/character-engine/generation.ts`
- Prosa contínua com todos os campos: hands, movement_style, ears, mannerisms, micro_expressions
- T2V consistency mandate + UGC photorealism suffix
- `CharacterContext` expõe `wanT2VBlock` alongside `identityBlock`

### Por cena — copy buttons
- Botão de cópia por cena inclui identityBlock pré-pendido (com smart prepend)

## STACK TÉCNICA

- **Frontend**: React/TypeScript + Vite, Vercel (savvyowl.app), auto-deploy on push
- **Backend**: Supabase project `kumnrldlzttsrgjlsspa` (EU West Ireland)
- **AI Video**: fal.ai — Wan 2.6 T2V (`wan/v2.6/text-to-video`), Veo3 Fast T2V (`fal-ai/veo3/fast`), Veo3 Fast I2V (`fal-ai/veo3/fast/image-to-video`)
- **AI Image**: Google Gemini
- **AI Voice**: ElevenLabs (user API key) + Google TTS (built-in)
- **AI Text**: Anthropic Claude (character expansion, script, scene prompts — Sonnet quando há personagem)
- **Payments**: Stripe live (Starter €14.99/mo, Pro €34.99/mo, Packs S/M/L)
- **Repo**: https://github.com/AndersonTeodoro-hub/SavvyOwl

## REFERÊNCIAS DO PROJETO

- **Supabase Project ID**: [fornecer no início da sessão — nunca commitar]
- **Supabase Management API Key**: [fornecer no início da sessão — nunca commitar]
- **fal.ai key**: guardada nos Supabase secrets como FAL_API_KEY
- **Anderson**: anderson.lteodoro1@gmail.com, plan: starter
- **Test User**: andersonteodoroddn@gmail.com, plan: free
- **Créditos Anderson**: verificar em runtime

## EDGE FUNCTIONS (11 total, all verify_jwt=false)

Deployed via Management API (DELETE+POST pattern):
- generate-video (submit+poll architecture, silentVideo flag, 3 modelos Veo3/Wan)
- generate-image
- generate-voice (stack overflow fix para ficheiros grandes)
- character-engine (deployed via CLI originally, re-deployed via API)
- chat (CLI deployed — DO NOT redeploy via API, has esm.sh imports)
- stripe-checkout
- stripe-webhook
- check-limits
- check-subscription
- get-credits
- init-credits

## CHAVE DE DECISÕES

- **Lip-sync desativado**: Áudio inteiro de 2-5min não pode ser enviado a cenas de 15s. Precisa de audio splitting (FFmpeg) por cena. Desactivado por agora — users juntam no CapCut
- **T2V vs I2V**: Se há `reference_image_url` → Veo3 I2V (identidade visual garantida). Sem imagem → Veo3 T2V (texto) ou Wan T2V (15s)
- **Wan 2.6 endpoints**: T2V e I2V NÃO têm variante /flash. Só R2V tem /flash
- **R2V**: Precisa de `video_urls` + `image_urls` (arrays) + "Character1" no prompt — não implementado ainda
- **Polling URLs**: Usar `status_url` e `response_url` do submit response do fal.ai (não construir manualmente)
- **Claude Sonnet para cenas**: Gemini Flash ignora instruções complexas de identidade → usar Sonnet (mode: deep) quando há personagem
- **generate_audio**: Parâmetro real da API fal.ai para Veo3. Texto "No dialogue" no prompt é ignorado — só o parâmetro funciona

## PROBLEMAS EM ABERTO

### 1. Aspect ratio — verificar
- Confirmar se `aspect_ratio` está a ser passado correctamente ao fal.ai

### 2. Qualidade dos prompts de cena
- Prompts ainda podem ser mais cinematográficos e detalhados
- Testar com personagens reais se identidade visual está consistente entre cenas

### 3. Lip-sync por cena
- Requer audio splitting (FFmpeg) por cena
- Desactivado — users juntam no CapCut

## PRÓXIMOS PASSOS PRIORITÁRIOS

1. **TESTAR**: Gerar vídeo real com personagem — confirmar que identidade visual está consistente
2. **TESTAR**: Veo3 I2V com `reference_image_url` — confirmar que imagem chega correctamente
3. **VERIFICAR**: aspect_ratio está a ser passado ao fal.ai
4. **FUTURO**: Audio splitting para lip-sync por cena
5. **FUTURO**: Remotion para montagem final automática

## PADRÕES TÉCNICOS

- Edge function deploy: DELETE + POST to Management API
- verify_jwt: PATCH separately with `{"verify_jwt": false}`
- Auth pattern: Use `user` from AuthContext, not `getSession()`
- Datacenter IP blocking: Vertex AI with Service Account resolves Google API 403s
- Diagnosis before solutions: Anderson requires confirmed working before deploying
- Never write credentials into repo files
- Smart identity prepend: check for 'FIXED CHARACTER' marker before prepending identityBlock

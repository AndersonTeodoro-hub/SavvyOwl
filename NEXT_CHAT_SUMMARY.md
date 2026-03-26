# RESUMO PARA PRÓXIMO CHAT - SavvyOwl (26/03/2026)

## INTEGRAÇÃO CHARACTER ENGINE — CONCLUÍDA

O Character Engine foi integrado como centro de todo o pipeline de geração.
A consistência visual é agora automática em todos os templates e botões.

### O QUE FOI FEITO:
1. ✅ **CharacterContext** (`src/contexts/CharacterContext.tsx`) — contexto React global
   - `useCharacter()` hook disponível em qualquer componente
   - Guarda: characters[], activeCharacter, identityBlock, negativePrompt
   - Adicionado ao App.tsx dentro do AuthProvider

2. ✅ **CharacterSelector** reescrito para usar contexto global (sem props)

3. ✅ **GenerateImageButton** — injeta automaticamente:
   - Identity block no início do prompt
   - Negative prompt no final do prompt
   - Mostra nome do personagem ativo ao lado do botão

4. ✅ **GenerateVideoButton** — injeta automaticamente:
   - Identity block com "SCENE DIRECTION" wrapper
   - Mostra nome do personagem ativo

5. ✅ **StructuredTemplates** — reformulado:
   - useCharacter() integrado
   - Templates de cena mostram banner verde "Personagem ativo" com info
   - Banner amarelo de aviso quando NÃO há personagem selecionado
   - Campo manual "character" removido do scene-generator
   - Identity block + negative prompt injetados automaticamente no prompt enviado ao chat
   - handleViralVideoSelect também injeta identity block
   - Negative prompt vai DENTRO do code block (não separado)
   - Instrução explícita à IA para não gerar negative prompt como bloco separado

6. ✅ **Edge function chat/index.ts** — instruções melhoradas:
   - 5 regras críticas para a IA usar o character block
   - Formato explícito: identity + scene + negative = UM bloco de código
   - Proíbe "insert character here" ou blocos separados

7. ✅ **Chat.tsx** — migrado de state local para useCharacter()

### TEMPLATES QUE INJETAM IDENTITY BLOCK:
- scene-generator, dark-channel, viral-pipeline, viral-modeling, veo3-video, ugc-influencer

## ESTADO ATUAL — O QUE FUNCIONA
- ✅ Chat (4 modos: Quick/Deep/Creator/Opus)
- ✅ Gemini Flash (via fallback Anthropic quando Google 403)
- ✅ Nano Banana (geração de imagem) — COM identity lock automático
- ✅ Gemini TTS (geração de voz)
- ✅ 10 templates estruturados — COM identity lock automático
- ✅ Viral video modeling (YouTube search) — COM identity lock automático
- ✅ Character Engine backend (expand, refine, lock, unlock)
- ✅ Character Engine UI (CharactersPage)
- ✅ CharacterContext global (useCharacter hook)
- ✅ Error boundaries + Sentry infrastructure
- ✅ Login email + Google OAuth
- ✅ Sidebar com Characters

## PRÓXIMOS PASSOS SUGERIDOS
1. Testar fluxo end-to-end: criar personagem → lock → usar template → gerar imagem
2. Verificar se a IA de facto inclui o identity block nos code blocks gerados
3. Adicionar suporte para imagem de referência do personagem no Veo3 (img2vid)
4. Onboarding flow para novos utilizadores
5. Stripe end-to-end testing

## O QUE NÃO FUNCIONA BEM
- ⚠️ Google API Key dá 403 do servidor (fallback Anthropic ativo)
- ⚠️ Stripe não testado end-to-end
- ⚠️ Onboarding flow não existe
- ⚠️ Imagem de referência do CharactersPage ainda não usada como ref frame no Veo3

## SUPABASE
- Project ID: kumnrldlzttsrgjlsspa
- URL: https://kumnrldlzttsrgjlsspa.supabase.co
- 11 edge functions deployed
- Tabelas: profiles, conversations, messages, prompts, usage_logs, projects,
  model_registry, characters

## GIT
- Repo: https://github.com/AndersonTeodoro-hub/SavvyOwl
- Branch: main

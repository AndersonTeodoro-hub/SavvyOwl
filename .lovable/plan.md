

## Corrigir Favicon — Usar a logo oficial da coruja

**Problema:** O `public/favicon.svg` ainda contém a coruja azul genérica (a tal do "ovo horrível"). As cópias anteriores do upload não persistiram.

**Solução:** Copiar o ficheiro `user-uploads://savvyowl-logo-transparent.svg` para `public/favicon.svg`, substituindo o conteúdo actual. O `index.html` já aponta para `/favicon.svg` (linha 11) — não precisa de alteração.

**Acção única:**
1. Copiar `user-uploads://savvyowl-logo-transparent.svg` → `public/favicon.svg`

Também adicionar versões `.ico`/PNG como fallback com `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` (já existe).



Vou corrigir isto pela raiz, porque o problema já está identificado no código:

1. Causa real do bug
- `public/favicon.svg` ainda contém a coruja azul antiga.
- Existe também `public/favicon.ico`, que alguns browsers usam por prioridade/cache mesmo quando o HTML aponta para SVG.
- O service worker (`public/sw.js`) faz cache-first para assets e está a guardar `/favicon.svg`, por isso a versão errada pode continuar a aparecer.
- O `index.html` tem dois `apple-touch-icon`, o que cria inconsistência.

2. Implementação
- Substituir `public/favicon.svg` pela logo oficial da coruja.
- Gerar e guardar:
  - `public/favicon-32x32.png`
  - `public/favicon-16x16.png`
  - `public/apple-touch-icon.png` (180x180)
  - `public/favicon.ico`
- Actualizar `index.html` para declarar explicitamente todos os ícones:
  - SVG favicon
  - PNG 32x32
  - PNG 16x16
  - shortcut icon `.ico`
  - um único `apple-touch-icon`
- Remover o `apple-touch-icon` duplicado que hoje aponta para `/logo-192.png`.

3. Consistência PWA / cache
- Actualizar `public/manifest.json` para usar ícones correctos da coruja em vez dos logos antigos.
- Actualizar `logo-192.png` e `logo-512.png` se necessário para manter consistência da app instalada.
- Incrementar a versão do cache em `public/sw.js` e incluir os novos ficheiros de favicon, para forçar refresh do asset antigo.

4. OG image
- Criar/substituir `public/og-image.png` com layout 1200x630:
  - fundo `#1a1814`
  - logo centrada
  - “SavvyOwl”
  - subtítulo “The smart way to use AI”
- Manter `index.html` com `og:image` a apontar para esse PNG.

5. Resultado esperado
- O browser deixa de mostrar o ícone antigo.
- iPhone/Home Screen usa a coruja correcta.
- PWA instalada usa a mesma identidade.
- Partilhas sociais passam a usar a imagem certa.
- A marca fica consistente entre landing, tab do browser, app instalada e redes sociais.

Detalhe técnico importante:
o que estava a bloquear isto não era “só trocar um ficheiro”; era a combinação de favicon antigo + `.ico` legado + cache do service worker. Vou corrigir os três ao mesmo tempo para não voltar a aparecer o ícone errado.

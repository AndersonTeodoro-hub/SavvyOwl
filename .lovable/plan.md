

## Plano: Corrigir Google OAuth para savvyowl.app

### Problema
O código usa `lovable.auth.signInWithOAuth("google")` — o SDK do Lovable Cloud que passa por um broker OAuth desenhado para domínios `*.lovable.app`. Como o site está no Vercel em `savvyowl.app`, o broker não reconhece a origem e o fluxo falha com "OAuth state parameter missing".

### Solução
Substituir `lovable.auth.signInWithOAuth` por `supabase.auth.signInWithOAuth` directo — já que configuraste o Client ID e Secret no Google Cloud Console e activaste o provider nas Authentication Settings.

### Alterações

**`src/pages/Login.tsx`**
- Remover import de `lovable`
- Substituir o `onClick` do botão Google por:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'https://savvyowl.app/dashboard' }
})
```

**`src/pages/Register.tsx`**
- Remover import de `lovable`
- Substituir o `onClick` do botão Google por:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: planParam === 'pro'
      ? 'https://savvyowl.app/register?plan=pro'
      : 'https://savvyowl.app/dashboard'
  }
})
```

Não precisas de trazer o Client ID e Secret para aqui — já estão configurados no provider Google das Authentication Settings, que é onde o Supabase os lê.

### Fluxo resultante
1. Utilizador em `savvyowl.app/login` clica "Entrar com Google"
2. Redirect para Google consent screen
3. Google callback para `https://hxgwzqtmpqjqhesuolfd.supabase.co/auth/v1/callback`
4. Supabase processa o token e redireciona para `https://savvyowl.app/dashboard`
5. Sessão activa, utilizador autenticado

### Ficheiros modificados
| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Login.tsx` | Trocar `lovable.auth` por `supabase.auth.signInWithOAuth` |
| `src/pages/Register.tsx` | Igual, com `redirectTo` condicional para `?plan=pro` |




## Problema
O `config.toml` não inclui `[functions.google-auth]` com `verify_jwt = false`. A função existe no código mas não está registada na configuração, causando o 404.

## Alterações

### 1. `supabase/config.toml`
Adicionar a secção em falta:
```toml
[functions.google-auth]
verify_jwt = false
```

### 2. Re-deploy da edge function
Após actualizar o config, re-deploiar a função `google-auth` para garantir que fica acessível.

### 3. Verificar redirect URI no Google Console
A URI registada no Google Cloud Console (URI 3) precisa ser **exactamente**:
```
https://hxgwzqtmpqjqhesuolfd.supabase.co/functions/v1/google-auth?action=callback
```
Se estiver truncada (sem `?action=callback`), o Google vai rejeitar o callback com `redirect_uri_mismatch` após o 404 ser resolvido. O utilizador precisa confirmar que a URI completa está guardada.


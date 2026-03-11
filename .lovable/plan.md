

## Configurar STRIPE_WEBHOOK_SECRET

O signing secret (`whsec_...`) que obteve do Stripe Dashboard precisa ser adicionado como secret no backend.

### Próximo passo
Ao aprovar este plano, vou:
1. Solicitar que cole o valor do `STRIPE_WEBHOOK_SECRET` através de um prompt seguro
2. Deployar as edge functions `stripe-checkout` e `stripe-webhook`
3. Testar o webhook com um request de teste

Nenhuma alteração de código é necessária — apenas a configuração do secret e deploy das funções.


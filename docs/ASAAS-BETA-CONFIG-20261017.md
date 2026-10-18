# Ativação responsável do Asaas no beta Cloudflare — 17/10/2026

O código da assinatura recorrente Asaas **já existe**, inclusive cliente, fatura hospedada, idempotência, conciliação, webhook, histórico e cancelamento. O plano comercial vigente é **um único Essencial de R$ 49/mês** (IDs históricos Pro/Rede preservados para faturas antigas). As pizzas têm recebimento da própria pizzaria, sem split.

## Situação realmente observada hoje

Consulta autenticada de **nomes** dos bindings Cloudflare do Worker `pizzaria-on-backend-staging-20261017` retornou `PEDIDO_BILLING_ENABLED` e os segredos Supabase, mas **nenhum** `PEDIDO_BILLING_PROVIDER`, `ASAAS_ENV`, `ASAAS_API_KEY` ou `ASAAS_WEBHOOK_TOKEN`. **Asaas não está operacional no beta**. A API de checkout recusa novas cobranças enquanto não estiver configurado.

A informação é somente inventário de nomes; não foi lido nem copiado qualquer valor de segredo.

## Instalar, sem criar cobrança involuntária

1. No **Asaas Sandbox separado**, gerar uma credencial específica da pizzaria.on. Nunca usar as chaves de outra empresa ou do JurisAuto.
2. Configurar como segredos/bindings do Worker Cloudflare beta, **não** em repositório, chat, arquivo .env público ou no Lovable cliente:
   - `PEDIDO_BILLING_PROVIDER=asaas`
   - `ASAAS_ENV=sandbox`
   - `ASAAS_API_KEY=<chave de Sandbox>`
   - `ASAAS_WEBHOOK_TOKEN=<segredo aleatório distinto da API, 32+ caracteres>`
   - manter `PEDIDO_BILLING_ENABLED=false` até concluir o preflight.
   - manter `PEDIDO_BILLING_ENFORCED=false` e `PEDIDO_TRIAL_ENFORCED=false` enquanto homologamos trial e conta.
3. Configurar o webhook Sandbox oficial para o domínio beta HTTPS **depois do deploy correto**: `https://pizzaria-on-backend-staging-20261017.bryansouzarodrigues06.workers.dev/api/billing/asaas/webhook`. Associar a autenticação `asaas-access-token` ao mesmo segredo. **Não** alterar webhook de produção antigo.
4. Conferir `GET /api/admin/status` com uma conta de admin autenticada. O campo `services.billingProvider` indica `asaas`, `billingMode` indica `sandbox` e `billing` só ficará `true` quando todas as variáveis estiverem válidas *e* `PEDIDO_BILLING_ENABLED=true`.
5. Testar tentativa sem token/invalid token no webhook, consultar no sandbox, criar **uma assinatura apenas na conta teste com autorização do titular**, pagamento fictício do Sandbox, sincronização, vencimento/estorno/cancelamento e conferir D1/idempotência. Não usar CPF de cliente real em dados de teste.
6. Só depois ativar o gate de checkout do Sandbox (`PEDIDO_BILLING_ENABLED=true`) com autorização explícita do titular; homologar o plano **Essencial R$49** e recusa de IDs antigos. Não implantar live production nem alterar credenciais do Sites durante os testes.
7. A migração para chave de produção, webhooks comerciais e cobrança de cliente real ocorre **após** QA financeiro confirmado e consentimento para primeira cobrança concreta.

## Prova técnica disponível

- `lib/asaas-billing.ts`: criação de intenção, cliente, assinatura e conciliação;
- `lib/asaas-policy.ts`: validadores de valor/modo e URLs confiáveis;
- `app/api/billing/checkout/route.ts`: checkout autenticado, somente `essencial`;
- `app/api/billing/asaas/webhook/route.ts`: autenticação do webhook antes de processar o evento;
- `app/api/billing/status/route.ts`: saldo/histórico;
- `lib/admin-status.ts`: agora reflete a configuração real sem expor token.

A aprovação no GitHub CI garante código e testes de simulação, **não** transações externas Asaas ou recebimento financeiro real.

**Não bloquear o primeiro beta de cardápio e pedidos por não ter Asaas real.** O fluxo de testes pode usar 7 dias grátis, com checkout SaaS desligado e entrega em dinheiro/Pix de teste separadamente.

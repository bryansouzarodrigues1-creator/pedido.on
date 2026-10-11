# Asaas no pedido.on — integração segura e estado atual

**Estado desta branch:** somente regras puras e testes. Não há endpoint de cobrança Asaas conectado nem webhook Asaas implantado. **Nenhuma cobrança deve ser habilitada em produção por causa desta branch.**

## Decisões preservadas

- As mensalidades pagas são da **plataforma pedido.on**; o Pix dos pedidos continua indo diretamente à pizzaria, sem split e sem intermediá-lo no Asaas.
- Preços atuais da plataforma: **Essencial R$ 49/mês, Profissional R$ 89/mês, Rede R$ 149/mês**. Uma mudança comercial exige decisão explícita, não código de infraestrutura.
- As contas permanecem no Supabase Auth; lojas, pedidos, assinaturas e auditoria ficam no D1; fotos e comprovantes no R2.
- A migração para Netlify vem **depois** da validação de pagamento. Não trocar domínio, chaves de sessão, bindings ou projeto Lovable como parte da cobrança.
- Preservar o Stripe desativado até a troca efetiva e controlada de provedor. Não compartilhar nem usar chaves de outros projetos.

## Fluxo futuro a implementar (ainda não pronto)

1. A área Minha conta consulta status com `Cache-Control: no-store`. Checkout exige login, proteção de origem e um `requestId` estável, com CPF/CNPJ do pagador validado. CPF/CNPJ é necessário ao cadastrar cliente no Asaas. Não registrar documentos em logs.
2. Criar cliente Asaas **somente no servidor**, com `externalReference` determinística por proprietário; consultar por referência antes de repetir uma criação ambígua. Separar clientes e assinaturas Asaas de eventuais IDs legados Stripe.
3. Registrar intenção durável, com estado `creating/awaiting_payment/paid/cancelled` e unicidade por proprietário para impedir dois checkouts simultâneos. Repetir o mesmo pedido deve reutilizar a operação aberta; timeout ambíguo exige conciliação pelo `externalReference`, não uma segunda assinatura.
4. Criar assinatura mensal com `billingType: "UNDEFINED"` para as formas suportadas pela conta, `cycle: "MONTHLY"`, preço validado no servidor e `nextDueDate` explícito. A criação nunca libera o plano.
5. Listar as cobranças da assinatura via `GET /v3/subscriptions/{id}/payments`; retornar somente links de fatura HTTPS do próprio ambiente Asaas. Quando a cobrança ainda não foi gerada, informar pendência sem iniciar segunda assinatura.
6. Webhook em endpoint final HTTPS sem redirect. Configurar `authToken` **diferente** da chave de API, conferir `asaas-access-token` antes de parse/processamento, deduplicar pelo ID do evento e usar pagamento atual consultado no Asaas (não confiar em evento fora de ordem).
7. Liberar acesso apenas para faturas `CONFIRMED` ou `RECEIVED`, da assinatura e cliente corretos e com valor mensal exato. Estorno ou chargeback retira aquela mensalidade do cálculo; uma mensalidade posterior quitada continua válida.
8. Cancelamento exige confirmação explícita, interrompe novas cobranças no Asaas e **mantém o período já pago**. Faturas e períodos continuam visíveis. Nunca apagar histórico necessário para auditoria.
9. Homologação: pagamento inicial, mesma operação repetida, webhook duplicado/invertido, duas abas, timeout, atraso, cancelamento, vencimento, refund antigo/atual, trocar de plano, isolamento entre contas. Testes em sandbox antes de qualquer compra controlada real.

## Segurança e configuração

A camada `lib/asaas-policy.ts` exige três condições simultâneas para *considerar* a configuração válida: `PEDIDO_BILLING_ENABLED=true`, `PEDIDO_BILLING_PROVIDER=asaas`, e um ambiente/credencial/token válidos. Isso ainda **não ativa o gateway**; as rotas efetivas precisam ser implementadas e revisadas.

- `ASAAS_ENV=sandbox` aceita só API key de homologação `$aact_hmlg_...` e usa `https://api-sandbox.asaas.com/v3`.
- `ASAAS_ENV=production` aceita só API key de produção `$aact_prod_...` e usa `https://api.asaas.com/v3`.
- `ASAAS_WEBHOOK_TOKEN` deve ter 32–255 caracteres sem espaço, ser diferente da API key e existir apenas no servidor.
- Link de pagamento não deve gerar navegação para domínios estranhos, nem receber credenciais no cliente.
- Nunca habilitar produção, chamar endpoint pago ou alterar D1 de produção durante auditoria.

## Fonte oficial para implementação

- https://docs.asaas.com/reference/criar-novo-cliente
- https://docs.asaas.com/reference/criar-nova-assinatura
- https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura
- https://docs.asaas.com/docs/sobre-os-webhooks
- https://docs.asaas.com/docs/faq-de-webhooks

## Arquivos desta etapa

- `lib/asaas-policy.ts`: validação de ambiente, link, token e cálculo independente de faturas pagas.
- `scripts/check-asaas-policy.test.mjs`: testes de contratos e casos de borda.
- `.github/workflows/asaas-policy.yml`: execução isolada dos testes sem secrets ou serviços externos.

**Limitação atual:** a implementação de cobrança feita numa sessão Work anterior não foi encontrada nos commits/branches disponíveis do GitHub. Este trabalho preserva a `main` intacta para permitir conciliar mudanças locais do Work quando estiverem disponíveis.

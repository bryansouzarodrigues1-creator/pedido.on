# Oferta comercial única — Pizzaria.on

Decisão do titular em 17/10/2026: **somente R$ 49,00/mês** para novos clientes, sem Pro nem Divulgação disponíveis para compra neste momento.

## Contrato público
- Marca exibida: **Pizzaria.on** (um único plano).
- Cobrança nominal: **R$ 49,00/mês**.
- Plano técnico: `essencial`, preço do servidor `4900` centavos; não confiar em valores enviados pelo cliente.
- Até homologação, Asaas e IA paga **permanecem desligados** no beta Cloudflare. O preço exibido não é confirmação de cobrança habilitada.
- As atuais franquias técnicas do plano `essencial` (4 imagens e 80 textos com IA por mês) ficam preservadas no código, mas funções pagas de IA não estão liberadas no beta.
- O fluxo de teste de 7 dias é preservado como funcionalidade do projeto; as travas de expiração comercial ainda não estão homologadas e não foram ativadas por esta mudança.
- Pix de compra de pizzas continua indo diretamente para a conta da pizzaria, independente da mensalidade SaaS.

## O que foi alterado
- A lista visível de planos é apenas `essencial`, tanto no cartão de preços quanto no status de cobrança.
- A página `/assinatura` apresenta os benefícios e valor único. URLs antigas `?plan=rede` e `?plan=profissional` são normalizadas para `essencial`.
- As APIs de checkout Asaas e Stripe rejeitam novos planos `profissional` e `rede` **antes** de qualquer chamada financeira externa.
- A interface não permite selecionar outro plano. Um *intent* de cobrança antigo de outro plano pede revisão pelo suporte.
- Os identificadores internos, tarifas e registros dos dois planos anteriores continuam no catálogo privado para conciliar faturas antigas, cancelamento, estorno e direitos históricos. Não executar migração destrutiva nem apagar faturas.

## Próximos passos antes de cobrar
1. Fazer cadastro autenticado, publicação de cardápio e pedido em dois dispositivos no Cloudflare Beta.
2. Homologar Asaas em Sandbox com chave e webhook de homologação exclusivos, sem solicitar dinheiro real.
3. Conferir renovação, cancelamento, estorno, travas financeiras e limites das franquias.
4. Apenas mediante autorização financeira específica habilitar Asaas de produção, atualizar webhook com host novo e testar primeira mensalidade de R$ 49,00.

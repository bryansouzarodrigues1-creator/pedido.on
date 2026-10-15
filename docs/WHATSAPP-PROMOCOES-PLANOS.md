# WhatsApp, divulgação e planos — 15/10/2026

Implementação solicitada pelo proprietário em 15/10. Esta etapa sucede a v31. Conferir a versão e a implantação retornadas pelo Sites antes de afirmar que está publicada.

## Pedido pelo WhatsApp

Na confirmação do carrinho há **Finalizar pelo WhatsApp** e **Finalizar pelo site**. O primeiro consulta `/api/menu/[slug]/whatsapp`, usando somente o cardápio publicado e as mesmas regras do pedido pelo site: disponibilidade, tamanhos, meio a meio, borda, quantidades do combo, cupom, pedido mínimo, taxa e aprovação de entrega. Total alterado exige nova confirmação.

O link abre o número da pizzaria com mensagem preenchida. O cliente precisa enviar a mensagem. Não há pedido, comprovante, aviso ao dono, código de pedido, confirmação de pagamento ou acompanhamento criado por esse caminho. O carrinho é preservado. O fluxo pelo site mantém painel, Pix com conferência manual e acompanhamento privado. A demonstração não abre conversa real.

## Promoção do dia

Em **Criar com IA → Promoção do dia**, o dono seleciona uma oferta já cadastrada. Produtos e combos continuam aceitando qualquer preço positivo, inclusive igual ou superior ao valor avulso. O editor de ofertas foi reutilizado.

A arte pode usar cores da marca, fotos cadastradas ou um fundo salvo. Gerar um fundo novo é uma ação explícita que usa uma imagem da franquia. O serviço existente recebe uma capacidade de foto `product` quadrada; internamente o job é `promotion`, vinculado à oferta e à versão dos dados. Não requer nova implantação Lovable.

Nome, itens, preço e validade são escritos pelo aplicativo em canvas. O modelo cria somente o fundo. Quadrada 1080×1080 e Status 1080×1920 partem da mesma criação; baixar, copiar legenda ou reabrir fundo não chama modelos. A legenda inclui o endereço real do cardápio. Arquivos enviados para fora não atualizam nem expiram automaticamente.

O servidor exige oferta publicada, ativa e correspondente ao rascunho antes de gerar fundo. A divulgação consulta novamente a versão pública, impedindo exportar dados desatualizados ou vencidos. O dono confere se a foto representa os alimentos.

## Catálogo único

| ID técnico preservado | Nome | Mensalidade | Imagens | Textos |
| --- | --- | --- | --- | --- |
| essencial | Essencial | R$49 | 4 | 80 |
| profissional | Pro | R$89 | 30 | 200 |
| rede | Divulgação | R$149 | 60 | 400 |

Novos contratos atendem uma pizzaria. Contratos Asaas e cortesias anteriores recebem `catalog_version=1` por padrão constante da migração; novas contratações/concessões registram versão 2. Versão 1 mantém a antiga capacidade de unidades, sem criar assinaturas ou alterar valores. Cortesia renovada no mesmo plano conserva sua versão. A antiga integração Stripe, desativada, mantém seus direitos anteriores.

Página pública, seleção de assinatura e API compartilham `lib/plan-catalog.ts`. Escolher um plano no cadastro não libera franquia paga. O Pix das pizzas continua separado da mensalidade Asaas. A configuração real já existe, mas esta etapa não realiza transação financeira real. A fiscalização comercial e o bloqueio de trial continuam desligados durante o beta; não anunciar bloqueio automático.

## Cotas e orçamento

`PEDIDO_AI_PLAN_QUOTAS=true` ativa o controle novo. Sem a flag, o comportamento anterior é mantido. Todas as lojas da conta compartilham franquia. Trial: **7 imagens e 100 textos em todos os sete dias**, iniciados uma única vez. Ao terminar, a franquia de IA termina, mesmo enquanto o acesso ao cardápio permanece liberado no beta. Contas anteriores ao trial conservam 3 imagens e 20 textos mensais. Estilos, ajuda local e OCR não gastam franquia.

Planos pagos exigem fatura canônica de produção, confirmada/recebida, com dono, cliente e valor corretos. A janela segue o mês da fatura paga; não a seleção de plano do restaurante. Cortesias usam mês UTC. Estornos, suspensão, pendências e faturas de outro dono não concedem mais IA.

Migração **0014** é aditiva e contém somente esquema. Sites aplica migrações antes de trocar o Worker. A tabela `ai_budget_reservations` registra reserva por job, conta, tipo e período. Job, cota e orçamento são reservados na mesma transação D1; duplicatas não reservam novamente. Falha antes do claim devolve; chamada autorizada com resultado incerto mantém a reserva. Não há repetição paga automática.

Referências fornecidas no planejamento: 0,135 crédito/imagem e 0,002/texto, com reserva de 25%. Usamos inteiros: **168.750 unidades/imagem** e **2.500/texto**, com 1.000.000 unidades por crédito. São estimativas, não consumo medido ou saldo Lovable.

Nesta fase há **20 créditos estimados por mês UTC na plataforma** e **20 no total para trials do beta**, desde a implantação do ledger. Limites individuais não garantem saldo global; a geração pode ser temporariamente indisponível antes de esgotar a franquia individual. Não aumentar automaticamente nem comprar saldo. O admin mostra a reserva estimada. Medir o consumo real e rever capacidade antes de ampliar a operação paga: dez planos Divulgação usados integralmente exigiriam 111,25 créditos estimados/mês, acima do teto inicial.

## Verificação e limites

- Testes do domínio, rotas, autorização, entrega, combos e pagamentos simulados.
- D1/workerd local: migração aditiva, preservação de registros e concorrência real das reservas; identidades e transportes externos simulados.
- Exportação de arte: verificação automatizada do texto e dos formatos. Não substitui inspeção visual e download no celular.
- Nesta execução não houve geração paga, compra de saldo, assinatura/cobrança financeira real ou envio de mensagens a grupos.
- Abertura do WhatsApp, downloads no Android e primeira fatura paga ainda precisam de validação nos respectivos aparelhos e serviços.

# Pacote de fechamento do pedido.on — requisitos reunidos

Solicitação do proprietário em 13/10/2026: guardar as melhorias juntas para revisão, simplificar a operação no celular e preparar a próxima atualização. A PR #13 permanece em rascunho; não há autorização nova para merge, publicação, migração remota ou uso de créditos pagos.

## Promoções e combos

- Promoção é uma oferta definida pelo dono, não necessariamente um desconto. Aceitar preço positivo menor, igual ou maior que a referência normal.
- Combos precisam representar os itens de verdade: por exemplo, duas pizzas e um refrigerante, com produtos, tamanhos e quantidades definidos. O preço é do conjunto.
- Preservar promoções antigas de um produto, pedidos já registrados e publicação separada do rascunho.
- Recalcular todos os valores no servidor. Alteração de preço exige nova conferência; mudança da composição, indisponibilidade ou término de combo impede concluir uma compra com referência antiga.
- Exibir comparativo de preço apenas quando existe redução real. Manter a regra existente de não acumular cupom na linha promocional.

## Painel mais simples e profissional

- Mostrar as ações essenciais de cardápio: importar, editar produtos, criar promoção e atualizar/publicar.
- Criar/editar promoção em janela própria, com escolhas Produto/Combo e campos curtos. Validade simples por padrão, data detalhada sob demanda.
- Reduzir títulos repetidos, frases explicativas e espaços excessivos. Manter avisos somente quando ajudam a decidir ou resolver um erro.
- Recolher categorias/cupons em Mais opções. Preservar configuração de bordas, meios de pagamento, entrega e revisão do leitor.

## Integrado ao trabalho preparado

O pacote conserva a importação durável, recortes locais, administração por conta, proteção do PWA e referência iFood já preparados na PR #13. A integração automática iFood continua dependente de homologação e autorização externa. Cadastro público, cotas, trial, Asaas, recuperação de senha, contas, sessões, Pix e infraestrutura seguem as decisões vigentes.

## Validação antes da liberação

Conferir preços livremente definidos, composição de combos, quantidades, cupom, vencimento, itens indisponíveis, carrinho antigo, cotação atualizada, idempotência e histórico do pedido. Testes de rotas usam identidades e adaptadores D1/R2 simulados. QA interativa em dois celulares e cardápios reais continua necessária antes da autorização de publicação.

## Resultado preparado na candidata

Produto/Combo e preço livre foram implementados no revisor e cálculo do servidor. A forma nova usa o JSON existente; as promoções antigas continuam legíveis. Validade possui opções curtas; criação/edição usam janela própria. Categorias/cupons são recolhidos, e textos explicativos repetidos foram removidos. O cardápio mostra a composição correta, evita comparativo de desconto inexistente e pede revisão quando um combo mudou/encerrou. Pedidos antigos conservam seu resumo e Pix.

O tratamento do novo JSON na reversão está documentado no fechamento do MVP. Nenhuma nova forma de promoção foi gravada em produção. O pacote foi preparado junto da importação/admin/PWA/iFood da PR, sem publicação ou consumo de créditos Lovable.

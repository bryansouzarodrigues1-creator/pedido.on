# Calculadora pública de preço e resultado

`/calculadora` é acessível sem cadastro. Usa custo da pizza pronta ou custo médio do pedido, custos adicionais por venda, despesas fixas do mês, preço, volume, dias de operação, taxas e margem desejada. Não pede o custo de cada ingrediente e não usa uma IA.

Para avaliar a operação inteira, usar ticket e custo médios de todos os pedidos. Para um único produto, incluir apenas sua parcela dos fixos. A interface explica essa escolha para não atribuir todas as despesas do negócio a uma única pizza.

## Cálculos

- Vendas mensais = vendas/dia × dias abertos.
- Faturamento = preço × vendas mensais.
- Resultado estimado = faturamento − taxas sobre faturamento − custos variáveis das vendas − despesas fixas.
- Sobra por venda antes dos fixos = preço × (1 − taxas) − custo pronto − extras.
- Ponto de equilíbrio = fixos ÷ sobra positiva por venda, arredondado para cima. Com sobra nula ou negativa, vender mais não resolve o prejuízo.
- Preço de referência = (custo pronto + extras + fixos/vendas) ÷ (1 − taxas − margem), arredondado para cima em R$ 0,50. Margem sobre o faturamento é distinta de acréscimo sobre o custo.

Valores monetários são entradas em centavos; os percentuais são expressos em porcentagem e o arredondamento de taxas ocorre sobre o total mensal. A ferramenta compara preço atual, preço de referência e 20% mais vendas, mantendo os custos informados. O preço de referência é uma simulação; a interface orienta comparar com a realidade da região.

Até seis cenários e o preenchimento atual ficam no armazenamento do navegador. É possível copiar ou baixar um resultado em texto e excluir/carregar cenários. Limpar os dados do navegador remove o histórico; não há promessa de sincronização entre dispositivos.

A sugestão de criar um cardápio aparece após um cálculo válido, pode ser fechada e não impede o uso posterior. Nenhuma conta, chamada paga, compra ou geração é exigida para calcular ou salvar.

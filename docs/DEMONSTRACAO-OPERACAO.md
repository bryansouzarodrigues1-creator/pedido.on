# Demonstração de pedidos, cobrança e comandas

Continuação da v35, publicada em 15/10/2026 às 17:18:48 de Brasília, fonte Sites `a83fdda612418f121d4ee95566d49dc7113552e3`, PR #18 integrada em `67b960557aac5d0bd2ac14434994e2702dfd64f3`, ambiente revisão 13. A nova publicação deve ser confirmada pelo Sites e registrada na PR correspondente.

## Uso

Em `/demo/pedidos`, escolher **Pix antecipado** ou **Pagamento na entrega**. Trocar a opção ou recomeçar reinicia o exemplo. A tela do cliente e o painel do dono usam as mesmas regras de transição dos pedidos reais, mas o estado fica somente na demonstração.

- **Pix:** simular comprovante, aceitar, conferir o recebimento fictício e liberar o preparo. A via do motoboy fica indisponível enquanto o Pix estiver pendente.
- **Na entrega:** aceitar com prazo, preparar, abrir o resumo com o valor a cobrar e marcar saída/conclusão. Concluir não afirma recebimento de dinheiro.
- Em **Comanda e entrega**, abrir as vias fictícias em 80 mm ou A4 e usar a impressão do navegador/Salvar como PDF. A comanda mostra pizza, borda, bebida e observações; o resumo inclui endereço e cobrança.

Cada via leva **DEMONSTRAÇÃO · SEM VALOR / NÃO PREPARAR, ENTREGAR OU COBRAR**, número `EXEMPLO` e rodapé de exemplo fixo. Não é pedido, comprovante bancário ou documento fiscal. A etapa da via é a do link aberto; mudanças posteriores na demonstração exigem reabrir o exemplo. As vias privadas continuam consultando a versão atual do pedido antes de imprimir.

## Isolamento

A rota pública `/demo/pedidos/comanda` aceita somente modo, estados enumerados, formato e papel. Os produtos, nome, telefone e endereço são fictícios e fixos; não aceita dados pessoais ou identificadores de pizzaria/pedido. Não consulta D1/R2, sessão, gerador ou provedor financeiro. Estados inválidos são recusados; cancelados e Pix pendente não liberam resumo de entrega. A resposta é `no-store`, sem indexação e sem enquadramento externo.

O controlador `/order-demo-print.js` abre apenas a impressão do exemplo. O controlador privado `/order-print.js` e as rotas reais mantêm conferência de versão, propriedade e dados gravados.

Corrigido um escape da demonstração anterior: o painel exibido como exemplo ainda tinha link para `wa.me`, e a tela do cliente podia montar o chat real e consultar armazenamento de link privado no navegador. Esses caminhos ficam ausentes quando a visualização é demonstrativa. Pedidos reais mantêm WhatsApp e chat.

## Validação

Cinco testes específicos exercitam fluxo Pix/dinheiro pela política real, links da interface, respostas da rota pública, cancelamento/histórico, rejeição de estado/dados pessoais, ausência de gravação, isolamento de chat/WhatsApp/storage e execução do script de impressão em VM sem rede. A renderização inicial da página continua sem cadastro ou chamada a modelo. Os dois workflows abrangem todos os arquivos novos.

O diagnóstico anônimo `scripts/check-live-readonly.py` passa a incluir os dois exemplos e o controlador público. Ele deve rodar após publicação da versão correspondente; antes disso a produção ainda não possui esses recursos.

O ambiente gerenciado permanece sem `control-browser`. Conforme o roteiro Sites, não foi instalado outro navegador nem iniciado preview. Conteúdo HTML/SSR, regras, rotas e JavaScript são verificados; aparência, toque no Android, PDF paginado e impressão física continuam exigindo ensaio em aparelho. Esta implementação facilita esse ensaio e não o declara concluído.

Não houve chamada a modelo, transferência Pix, contratação/estorno/cancelamento Asaas, migração, troca de segredo ou aumento de cotas. Trial/fiscalização comercial e recuperação por e-mail continuam no estado anterior.

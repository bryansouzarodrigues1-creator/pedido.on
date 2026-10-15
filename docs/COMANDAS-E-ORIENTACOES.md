# Comandas e orientações operacionais — 15/10/2026

Publicado na v33: PR #17 integrada em `3c80413943d52e2c75716bc338b47e3050f4dcb0`, fonte Sites `9293c3a068138e9a85a29be5fa300a932cde8fe7`, implantação `appgdep_6ad12f4c8b6c8191bb6d20b475585f26` em 15/10/2026 às 16:54:14 de Brasília, ambiente revisão 13. Esta etapa acrescentou as vias operacionais solicitadas pelo proprietário e orientação visual somente em pontos de dúvida. [Verificação ampliada após publicação](QA-COMANDAS-2026-10-15.md).

## Uso pelo dono

Em **Pedidos → Detalhes → Comanda e entrega**, abrir a via e escolher **Imprimir / Salvar PDF**. Há formatos para bobina de 80 mm e A4; o diálogo e a compatibilidade dependem do aparelho/driver/impressora. Não há impressão térmica direta por Bluetooth/USB, envio automático para impressora ou confirmação de que a impressão física terminou.

- **Comanda da cozinha:** número, primeiro nome, modalidade, itens, quantidades, tamanhos, meio a meio, bordas e observações do pedido. Sem campo de telefone/endereço e sem valores dos produtos. Observações livres do cliente são preservadas.
- **Resumo de entrega:** contato, endereço, itens/componentes de combos, observações, desconto, taxa e total, com instrução de cobrança.
- **Comprovante Pix:** continua sendo o arquivo enviado pelo cliente, separado dessas vias. A via operacional não é comprovante bancário. Não cria nota fiscal ou confirmação financeira automática.

Pedidos finalizados exclusivamente pelo WhatsApp continuam sendo uma conversa, como solicitado na v32. Sem registro no painel, não há comanda na plataforma. Esta etapa não captura conversas, cria pedidos a partir de cliques ou muda esse contrato.

## Valores e estados

Os documentos usam o resumo imutável do pedido, sem recalcular com o cardápio atual. Conferem soma de itens, quantidades/preço unitário, subtotal, desconto, taxa e total; inconsistência bloqueia emissão. Mudanças posteriores de promoção ou preço não alteram a via do pedido anterior.

O resumo de entrega exige modalidade entrega, pedido aprovado/em preparo/em entrega ou histórico concluído, e pagamento compatível. Pix aprovado pela pizzaria mostra **não cobrar novamente** e **nada a cobrar**. Dinheiro/cartão/Pix combinados para entrega mostram o total gravado a cobrar. Comprovante enviado, Pix pendente/recusado e pedido ainda não aceito não liberam resumo do motoboy.

A comanda pode ser consultada antes da aprovação, com aviso explícito de aguardar liberação. Cancelados têm aviso de não preparar/entregar. Uma via de pedido concluído é histórica, sem nova cobrança; concluir uma entrega em dinheiro não registra automaticamente que o dinheiro foi recebido.

Antes de abrir o diálogo pelo botão, o navegador consulta a versão atual no servidor. Se mudou, recarrega a via para nova conferência; erro, falta de sessão ou conexão interrompida impede essa abertura. Documentos em papel/PDF não se atualizam: conferir o painel antes de sair. O rodapé mostra emissão, horário de Brasília e versão. Imprimir pelo menu próprio do navegador não executa a rechecagem do botão; a via mantém o estado carregado, sem garantia de atualização automática.

## Privacidade e implementação

GET privado `/api/restaurants/[id]/orders/[orderId]/print`, com autorização por proprietário e vínculo pedido/pizzaria. HTML e consulta de versão têm `private, no-store`; indexação e enquadramento são bloqueados. Campos livres são escapados; documento não inclui chave Pix, comprovante, tokens de acompanhamento ou credenciais. Não há link público para compartilhar a comanda com o motoboy: o dono imprime/salva a via.

Renderização HTML determinística; impressão nativa do navegador, sem IA, sem serviço externo de PDF e sem geração de imagens. Não altera pedidos, pagamento, status de entrega, banco, preços dos planos, cotas ou flags. Nenhuma migração necessária.

## Orientações visuais

- Na configuração Pix: fluxo recolhido em três passos, do Pix do cliente à conferência no banco e confirmação no painel.
- Na área de entrega: endereço/taxa, aprovação/preparo e resumo para motoboy com saída para entrega.
- Cada guia usa ícones e texto HTML acessível, sem imagens de banco fictícias, saldos inventados, artes decorativas ou chamadas pagas. Link para a demonstração interativa existente.

Corrigido também o botão rápido da lista: ações **Aceitar pedido**, **Conferir e aprovar** e **Confirmar Pix recebido** abrem os detalhes para informar prazo/conferir recebimento. Antes, aceitar/verificar tentavam PATCH sem os campos obrigatórios. Preparar, despachar e concluir mantêm avanço direto conforme o estado atual.

## Verificação

Testes exercitam as rotas reais com D1/identidade adaptados localmente: Pix completo, cobrança na entrega, totais/combos, cardápio alterado, cancelamento, histórico, isolamento e dados privados. O controle de impressão é executado em VM com diálogo/rede simulados; confirma rechecagem e recusa de versão antiga/offline. Renderização SSR dos guias e ação rápida é verificada sem chamadas a modelo.

Conferência visual no celular e impressão em uma impressora física permanecem validações operacionais. Não houve novo pagamento ou geração paga para esta etapa.

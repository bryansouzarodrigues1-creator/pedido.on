# Papel da IA no pedido.on

**Proposta de produto — 12/10/2026.** O proprietário pediu planejar o sentido da IA antes de implementar a evolução do SaaS. Este documento organiza a proposta; as novas funções abaixo ainda não estão implementadas nem foram aprovadas como escopo definitivo. A publicação continua na v20.

## Objetivo

Ajudar o pizzaiolo a colocar um cardápio claro no ar, manter a identidade da pizzaria e preparar material de divulgação a partir dos seus produtos reais. O valor deve aparecer no trabalho concluído: menos tempo escrevendo e preparando imagens, mais conteúdo aproveitado pelo dono.

Receber e acompanhar pedidos continua sendo a função principal do pedido.on. A IA é opcional: cadastro, edição, publicação, calculadora e compra de pizza precisam funcionar sem geração. Uma imagem bonita é um recurso de criação; não comprova aumento de vendas nem, sozinha, justifica uma assinatura.

## Tarefas propostas

| Tarefa do dono | Ajuda da IA | Resultado que ele pode usar | Prioridade |
| --- | --- | --- | --- |
| Melhorar meu cardápio | Redigir descrições curtas com os ingredientes confirmados e uma apresentação da casa | Textos ligados aos produtos existentes, com comparação antes/depois | Primeira entrega |
| Criar capa ou logo | Gerar a imagem pedida usando o nome e as referências da marca; sugerir cores e estilos suportados quando solicitado | Capa, logo ou imagem ilustrativa para um destino explícito | Aproveitar o que já funciona |
| Preparar uma divulgação | Escrever uma legenda e, se o dono pedir separadamente, criar uma arte para produtos escolhidos | Material pronto para revisar, baixar/copiar e compartilhar manualmente | Etapa posterior |

Fotos de produtos ficam vinculadas a um produto da loja. Quando o dono tiver uma foto real, ele pode usar o upload normal, sem geração. Uma imagem criada é ilustrativa: não deve inventar ingredientes nem ser apresentada como comprovação da pizza servida.

O campo de ideia livre continua disponível para criações como a pizza voando sob uma luz. As ações orientadas por tarefa devem dar contexto e destino ao pedido, sem substituir o prompt original por um estilo fixo ou uma captura do cardápio.

## Contexto e fluxo

Manter as quatro áreas do painel: **Pedidos, Cardápio, Pizzaria e Criar com IA**. Não reconstruir o layout nem acrescentar um chat genérico obrigatório.

1. O dono escolhe a tarefa e o produto ou destino da criação. A pizzaria já selecionada fornece seu nome, textos, cores e produtos autorizados; não pedir novamente tudo que está cadastrado.
2. Perguntar apenas o que falta. Para melhorar uma descrição, confirmar ingredientes e características reais quando os textos existentes não forem suficientes. Não inventar forno a lenha, fermentação, alergênicos, tamanho ou prazo de entrega.
3. Mostrar o que será criado e a cota disponível antes do clique. Pedir uma imagem não deve fazer uma chamada de texto apenas para encaminhar o pedido.
4. Gerar somente após ação explícita. Mostrar a imagem real ou as mudanças de texto; falha não vira um estilo pronto rotulado como IA.
5. O dono escolhe o que aproveitar. A aplicação vai para o rascunho, com proteção contra alterações concorrentes. **Publicar/Atualizar** continua uma ação separada.
6. Guardar e permitir recuperar o resultado sem gerar novamente.

Exemplo da primeira entrega: o dono escolhe dois sabores cadastrados, confirma os ingredientes e pede descrições mais claras. Recebe duas sugestões ao lado dos textos atuais, pode aceitar uma, editar a outra ou descartar ambas. Preços, Pix e demais produtos permanecem sob seu controle. Uma foto desses sabores é outra ação, com seu próprio consumo indicado.

## Reaproveitamento antes de mais gerações

Criar **Minhas criações** dentro da área existente, como histórico de resultados da própria pizzaria. Mostrar tipo, data, prévia e situação, permitindo abrir, baixar/copiar e usar novamente sem chamar o modelo.

Os jobs e os arquivos de imagem já ficam no D1/R2, mas o componente atual mantém a tentativa e o resultado em memória da tela. Não existe uma lista navegável de criações recuperável após recarregar. Os GETs atuais informam cotas, não esse histórico. A nova consulta deve confirmar propriedade no servidor e retornar somente os dados necessários, sem tokens de autorização.

Resultados antigos precisam continuar acessíveis depois de trocar de área ou entrar novamente. Consultar um job em andamento não deve reservar outra geração. Falhas e tentativas sem imagem devem ser identificadas com clareza, sem simular um resultado concluído.

## Regras do sistema, sem modelos

Totais, preços de meio a meio, taxas de entrega, disponibilidade, aprovação de endereço, transições do pedido, trial e acesso ao plano devem ser regras verificáveis do servidor. A calculadora já funciona sem IA e continua pública.

A IA não deve aceitar pedidos, confirmar recebimento de Pix, decidir com base num comprovante, modificar preços/descontos, alterar a chave Pix, publicar conteúdo ou enviar divulgação sozinha. Alertas de pedidos e mensagens também não precisam de modelos. Respostas rotineiras podem usar textos prontos.

O fluxo de cliente aceito no planejamento anterior permanece: navegar e montar carrinho sem cadastro ou espera; depois informar endereço/WhatsApp, verificar área e taxa, resolver a aprovação necessária, mostrar Pix e acompanhar pelo pedido/chat. Regras automáticas de bairros e taxas são o caminho normal; atendimento manual é para exceções. Essa evolução operacional ainda precisa ser implementada e validada, independentemente da IA.

## Consumo e dados

- Continuar usando os serviços de IA da Lovable já integrados, sem enviar cada criação ao agente que constrói o projeto.
- Não gerar ao abrir telas, digitar ou publicar. Sem geração de texto intermediária para uma imagem, repetição paga automática ou aumento de cota nesta proposta.
- Reutilizar resultados e referências de marca aprovadas. Criações de texto e imagem permanecem ações distintas; não transformar uma tarefa simples em várias chamadas ocultas.
- O serviço de texto atual orienta no máximo **duas descrições por solicitação**, apesar de aceitar contexto de até 12 produtos. A primeira entrega deve respeitar esse limite, sem prometer transformar todo o cardápio numa única chamada.
- Preservar os limites atuais até conferir consumo e orçamento: imagens **3 por proprietário/mês, 2 por dia em toda a plataforma**; texto **20 por proprietário/mês, 20 por dia na plataforma**. O limite global de imagens é uma proteção de orçamento; sua capacidade precisa ser revista antes de oferecer o recurso a um grupo maior, sem prometer uso ilimitado.
- Não definir novas cotas por plano nem custo unitário sem dados reais. As chamadas usam Run credits; conforme a [documentação Lovable](https://docs.lovable.dev/features/ai) consultada em 12/10, podem usar primeiro a franquia mensal de IA e depois créditos gerais disponíveis. Não presumir uma carteira isolada do saldo de construção. Conferir o consumo do projeto antes de dimensionar a oferta.
- Enviar apenas os dados da marca e dos produtos necessários. Clientes, endereços, conversas privadas de pedidos, comprovantes, credenciais e Pix ficam fora do contexto criativo.

## O que existe e o que falta

**Já comprovado:** texto real, geração de imagem pela Lovable, gravação R2 e aplicação ao rascunho privado de teste. Nas telas enviadas em 12/10, o proprietário confirmou no celular a imagem da pizza voando sob uma luz e a prévia na área de IA. Não foi confirmada a aplicação/publicação dessa capa na sua pizzaria.

**Reaproveitar:** rotas de geração, autorização de uso único, validação de produtos, proteção de preços/Pix, rascunho/publicação e quatro áreas do painel. Não repetir diagnóstico pago ou reconstruir esses mecanismos para começar o novo trabalho.

**Implementar primeiro:** recuperação de criações existentes; tarefas com destino explícito; melhoria de descrições com contexto confirmado, comparação e aceitação por produto. Cores/layout continuam limitados aos parâmetros suportados, sem prometer que a IA reescreve o site.

**Posterior:** legenda e arte de divulgação. O schema atual de texto não oferece uma saída própria para legendas, e as regras atuais proíbem preços/novas ofertas. Isso exige uma função específica, não apenas um novo exemplo de prompt. Eventuais preços de uma divulgação devem vir dos valores aprovados no servidor, sem cálculo ou desconto inventado pelo modelo. Não publicar nas redes automaticamente.

**Fora da primeira entrega:** edição de imagens com referências enviadas ao modelo, atendimento autônomo a clientes e análise comercial de pedidos. O serviço de imagem atual recebe texto; usar upload como referência de geração exigiria desenvolvimento próprio e outra validação.

## Critérios de sucesso

Avaliar tempo até o primeiro cardápio publicado, proporção de sugestões realmente aplicadas, proporção de criações refeitas/descartadas e consumo por pizzaria ativa. Registrar metadados mínimos, sem copiar conversas ou dados de clientes para métricas.

Critérios de aceitação da primeira implementação:

- O dono consegue recuperar uma criação depois de recarregar ou entrar novamente, sem novo consumo e sem acesso a outra pizzaria.
- Uma descrição proposta só altera o produto escolhido, depois de aprovação, preservando preços/Pix e a versão pública até o clique de publicação.
- Uma solicitação de imagem chega ao gerador de imagem com a ideia original; falhas não exibem o próprio cardápio como imagem criada.
- Os ingredientes e fatos usados foram confirmados; as sugestões não apresentam características não informadas como verdade.
- O fluxo manual continua completo e a indisponibilidade da IA não impede publicar o cardápio ou receber pedidos.
- Uma nova prova paga, se necessária para mudanças futuras, depende do aviso de consumo e da autorização correspondente; os testes locais devem identificar claramente o uso de respostas simuladas.

Esses critérios medem utilidade e confiabilidade. Aumento de vendas ainda é uma hipótese a avaliar com uso real, não uma promessa da IA.

## Ordem sugerida

1. Reaproveitar a geração publicada e entregar o histórico sem novos modelos.
2. Ligar a ajuda de descrições aos produtos e ao preparo do cardápio, com comparação e aprovação.
3. Organizar capa/logo e imagens ilustrativas por destino, preservando a criação livre.
4. Concluir o fluxo operacional do SaaS já planejado: entrega, aprovações, acompanhamento/chat, acesso de trial e pagamento da assinatura. Não condicionar essas regras à IA.
5. Depois do uso pelo grupo e da conferência de custo, oferecer divulgação contextual e rever limites comerciais.

Nenhuma tela, endpoint, migração, segredo, plano comercial ou limite foi alterado para registrar esta proposta. Documentação não exige nova publicação Sites.

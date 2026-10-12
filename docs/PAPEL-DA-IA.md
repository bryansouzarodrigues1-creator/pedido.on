# Papel da IA no pedido.on

**Planejamento de produto — atualizado em 12/10/2026.** O proprietário pediu planejar o sentido da IA antes de implementar a evolução do SaaS e depois definiu a prioridade: enviar foto do cardápio, reconhecer os produtos e deixá-los prontos para compra com o mínimo de digitação. Também pediu promoção do dia, cadastro manual disponível, simplicidade e produtividade, com divulgação por IA possivelmente nos planos superiores depois. Autorizou avançar com a implementação. A primeira entrega por OCR local e promoção por regras está preparada e validada, conforme [LEITOR-CARDAPIO.md](LEITOR-CARDAPIO.md); a publicação deve ser conferida em `CONTINUAR.md`. Leitura complementar por IA, divulgação criativa, galeria e outras evoluções abaixo ainda são futuras.

## Objetivo

Ajudar o pizzaiolo a colocar seu cardápio no ar a partir de uma foto, sem cadastrar cada sabor do zero, e cuidar das tarefas diárias com poucas ações. O valor deve aparecer no trabalho concluído: produtos compráveis, menos digitação, promoções fáceis de administrar e conteúdo que o dono realmente aproveita.

Receber e acompanhar pedidos continua sendo a função principal do pedido.on. A IA é opcional: cadastro, edição, publicação, calculadora e compra de pizza precisam funcionar sem geração. Uma imagem bonita é um recurso de criação; não comprova aumento de vendas nem, sozinha, justifica uma assinatura.

## Tarefas propostas

| Tarefa do dono | Ajuda da IA | Resultado que ele pode usar | Prioridade |
| --- | --- | --- | --- |
| Trazer meu cardápio de uma foto | OCR e organização por regras; IA de leitura somente quando trouxer ganho justificado | Categorias, produtos, ingredientes e preços reconhecidos, prontos para conferência e compra após publicação | Prioridade principal |
| Criar a promoção do dia | Regras de preço/validade e texto pronto, sem modelo | Produto ou combo em destaque com preço aprovado e encerramento automático | Primeira etapa de produtividade |
| Melhorar meu cardápio | Redigir descrições curtas com os ingredientes confirmados e uma apresentação da casa | Textos ligados aos produtos existentes, com comparação antes/depois | Opcional, depois da importação |
| Criar capa ou logo | Gerar a imagem pedida usando o nome e as referências da marca; sugerir cores e estilos suportados quando solicitado | Capa, logo ou imagem ilustrativa para um destino explícito | Aproveitar o que já funciona, sem geração automática |
| Preparar uma divulgação | Escrever uma legenda e, se o dono pedir separadamente, criar uma arte para produtos escolhidos | Material pronto para revisar, baixar/copiar e compartilhar manualmente | Etapa posterior |

## Entrada principal: enviar a foto e conferir

Na área **Cardápio**, apresentar **Enviar foto do cardápio** como ação principal para uma loja sem produtos e **Adicionar manualmente** como alternativa sempre disponível. Aceitar câmera ou galeria e mais de uma foto para cardápios com várias páginas. Colar texto continua uma opção secundária.

O fluxo proposto é **enviar foto → ler e organizar → conferir → adicionar ao rascunho → publicar**. A tela de conferência deve mostrar uma prévia do cardápio de verdade, com nomes, ingredientes, categorias e preços. Os produtos confirmados usam os componentes existentes de seleção de tamanho, compra e carrinho; não precisam de IA para criar botões ou código de página.

- Preencher de uma vez os itens reconhecidos e destacar ambiguidades. Mostrar todos os preços numa revisão compacta, permitindo confirmar o conjunto numa ação; abrir edição detalhada só quando necessário.
- Quando houver dúvida, mostrar junto do campo o trecho correspondente da foto. Um valor ausente ou ilegível fica pendente; nunca estimar preço nem esconder a dúvida por uma pontuação alta do OCR.
- Relacionar cada preço ao sabor e tamanho corretos, preservando colunas e tabelas. Não atribuir um preço sem tamanho à pizza grande automaticamente. Se toda a página usar um único tamanho, uma confirmação explícita do dono pode resolver o conjunto.
- Não converter nomes como família, GG ou medidas em centímetros para P/M/G sem confirmação. Registrar uma variante não suportada como pendência, sem descartá-la silenciosamente; avaliar a extensão dos tamanhos antes de prometer qualquer cardápio importado por completo.
- Identificar bebidas, combos, bordas e adicionais. O formato atual não representa todos esses dados da fonte; cada informação deve ter destino próprio ou aparecer como pendência na conferência. Telefone, taxa de entrega e observações do rodapé não viram produtos.
- Informar páginas processadas, quantidade reconhecida e pendências. Limites ou interrupções devem mostrar o que ficou por ler. Não dizer que o cardápio foi lido inteiro quando parte foi omitida.
- Não exigir foto para cada produto nem gerar fotografias automaticamente. Um cardápio organizado e comprável pode ser publicado sem imagens de produto, usando o layout existente.
- Reimportar não sobrescreve os preços ou produtos existentes. Comparar possíveis duplicados, sugerir adicionar/atualizar e aplicar só as mudanças confirmadas. A leitura de um preço da foto é uma proposta; a aplicação ao rascunho continua explícita.
- Guardar a leitura para retomar sem reler tudo e sem repetir consumo. Resultados incompletos não devem apagar o rascunho existente.

## Foto legível e leitura econômica

Preparar a imagem para leitura com processamento convencional: ajustar orientação, recortar margens, testar correção de inclinação/contraste e reduzir o tamanho de envio preservando as letras e números. Manter a fonte original para conferência. Não usar geração de imagem para reconstruir a foto do cardápio, pois isso pode alterar justamente o texto e os preços a extrair.

A [documentação oficial do Tesseract](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html) explica a influência de resolução, inclinação e segmentação; tabelas exigem cuidado próprio. OCR local é um candidato para economizar chamadas, não garantia de leitura completa e rápida em qualquer celular.

Comparar OCR local com os casos reais antes de escolher o caminho padrão. Avaliar tempo total, carregamento inicial, memória, associação entre preço/produto e clareza da conferência. Fotos simples podem usar OCR com organização por regras, sem créditos Lovable. Uma etapa de visão ou organização pela IA pode ser útil para fontes complexas, mas não deve ser adicionada automaticamente a toda leitura.

Se a IA for necessária, preparar uma função específica de leitura pela integração Lovable, com saída estruturada, validação e consumo limitado. Não ativar a importação antiga OpenAI nem aumentar limites. Agrupar o trabalho necessário, evitar uma chamada por produto e informar o limite de consumo antes de qualquer leitura paga. Se mais de uma solicitação for necessária para várias páginas, isso precisa estar visível, sem chamadas ocultas.

A classificação de confiabilidade precisa considerar estrutura da página e associação dos valores, não apenas a confiança dos caracteres. Documento borrado que não pode ser recuperado deve pedir outra foto ou correção localizada. Não gastar várias gerações tentando reconstruir conteúdo ausente.

## Promoção do dia

O dono escolhe um produto ou combo cadastrado, o tamanho quando necessário, o preço promocional e a validade. A data de hoje é o padrão, no horário da pizzaria; o prazo final fica visível e pode ser ajustado. Uma prévia mostra a oferta e a ação de compra antes da publicação.

A promoção aprovada aparece em destaque no cardápio. A validade é aplicada pelo servidor: ao terminar, a oferta deixa de valer sem apagar o produto nem alterar o preço-base. O servidor recalcula o carrinho; se a oferta expirar ou o total mudar antes de confirmar, o cliente confere o novo valor. Pedidos já confirmados preservam seu histórico de preços.

Copiar uma mensagem pronta com nome, preço, validade e link do cardápio não exige IA. O dono compartilha manualmente; nenhuma mensagem é enviada pelo sistema nesta etapa. Criatividade de legenda/arte por IA pode entrar depois nos planos superiores, após medir uso e custo. Não mudar os valores atuais de Essencial R$ 49, Profissional R$ 89 e Rede R$ 149, nem decidir novas cotas por plano neste planejamento.

Cupom e destaque de produto já existem, mas não equivalem a uma promoção com preço próprio e validade. A v20 ainda não tinha essa função. A primeira implementação e seus testes estão registrados em LEITOR-CARDAPIO.md.

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

Exemplo de uso opcional depois da importação: o dono escolhe dois sabores cadastrados, confirma os ingredientes e pede descrições mais claras. Recebe duas sugestões ao lado dos textos atuais, pode aceitar uma, editar a outra ou descartar ambas. Preços, Pix e demais produtos permanecem sob seu controle. Uma foto desses sabores é outra ação, com seu próprio consumo indicado.

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
- Importar uma foto e gerar uma arte são tarefas diferentes. A importação não deve gerar capa, fotos dos sabores, descrições criativas ou campanhas como efeitos colaterais. Melhorias criativas dependem de uma escolha posterior do dono.
- Reutilizar resultados e referências de marca aprovadas. Criações de texto e imagem permanecem ações distintas; não transformar uma tarefa simples em várias chamadas ocultas.
- O serviço de texto atual orienta no máximo **duas descrições por solicitação**, apesar de aceitar contexto de até 12 produtos. A primeira entrega deve respeitar esse limite, sem prometer transformar todo o cardápio numa única chamada.
- Preservar os limites atuais até conferir consumo e orçamento: imagens **3 por proprietário/mês, 2 por dia em toda a plataforma**; texto **20 por proprietário/mês, 20 por dia na plataforma**. O limite global de imagens é uma proteção de orçamento; sua capacidade precisa ser revista antes de oferecer o recurso a um grupo maior, sem prometer uso ilimitado.
- Não definir novas cotas por plano nem custo unitário sem dados reais. As chamadas usam Run credits; conforme a [documentação Lovable](https://docs.lovable.dev/features/ai) consultada em 12/10, podem usar primeiro a franquia mensal de IA e depois créditos gerais disponíveis. Não presumir uma carteira isolada do saldo de construção. Conferir o consumo do projeto antes de dimensionar a oferta.
- Enviar apenas os dados da marca e dos produtos necessários. Clientes, endereços, conversas privadas de pedidos, comprovantes, credenciais e Pix ficam fora do contexto criativo.

## O que existe e o que falta

**Já comprovado:** texto real, geração de imagem pela Lovable, gravação R2 e aplicação ao rascunho privado de teste. Nas telas enviadas em 12/10, o proprietário confirmou no celular a imagem da pizza voando sob uma luz e a prévia na área de IA. Não foi confirmada a aplicação/publicação dessa capa na sua pizzaria.

**Reaproveitar:** rotas de geração, autorização de uso único, validação de produtos, proteção de preços/Pix, rascunho/publicação e quatro áreas do painel. Não repetir diagnóstico pago ou reconstruir esses mecanismos para começar o novo trabalho.

**Importador existente, ainda desativado:** `components/ai-import.tsx`, `lib/ai.ts`, `lib/ai-menu.ts` e `/api/restaurants/[id]/ai/menu`. Usa OpenAI, uma imagem JPG/PNG/WebP de até 3 MB ou texto; reconhece no máximo 35 produtos por pedido e pede revisão antes de acrescentar ao rascunho. Essa era a base da v20; a primeira implementação agora usa OCR local, conforme LEITOR-CARDAPIO.md. Os valores `text:1` e `image:3` são unidades internas desse importador, não o custo comprovado de uma chamada Lovable. Não confundir a geração Lovable validada com importação por foto funcionando em produção.

**Primeira implementação autorizada:** importação por foto e revisão compacta; produtos com destino de compra pelo cardápio existente; cadastro manual fácil; promoção do dia. Recuperar criações evita desperdício e pode aproveitar os jobs existentes sem modelos. Descrições criativas ficam opcionais, depois de colocar o cardápio no ar. Cores/layout continuam limitados aos parâmetros suportados, sem prometer que a IA reescreve o site.

**Posterior:** legenda e arte de divulgação. O schema atual de texto não oferece uma saída própria para legendas, e as regras atuais proíbem preços/novas ofertas. Isso exige uma função específica, não apenas um novo exemplo de prompt. Eventuais preços de uma divulgação devem vir dos valores aprovados no servidor, sem cálculo ou desconto inventado pelo modelo. Não publicar nas redes automaticamente.

**Fora da primeira entrega:** edição de imagens com referências enviadas ao modelo, atendimento autônomo a clientes e análise comercial de pedidos. O serviço de imagem atual recebe texto; usar upload como referência de geração exigiria desenvolvimento próprio e outra validação.

## Critérios de sucesso

Avaliar tempo da foto até a prévia e até o primeiro cardápio publicado, número de correções necessárias, ingredientes/preços associados corretamente, proporção de sugestões realmente aplicadas, criações refeitas/descartadas e consumo por pizzaria ativa. Separar primeira leitura no aparelho e leituras seguintes. Não prometer um tempo fixo antes de medir fotos simples, colunas/tabelas e celulares comuns. Registrar metadados mínimos, sem copiar conversas ou dados de clientes para métricas.

Critérios de aceitação da primeira implementação:

- Uma foto legível vira produtos estruturados e a prévia de compra, sem cadastrar um formulário para cada sabor. A confirmação do conjunto precede a aplicação/publicação.
- Fotos com colunas, preços compartilhados, múltiplas páginas, valores ilegíveis ou mais de 35 produtos não sofrem truncamento silencioso. Pendências são localizadas e ligadas à fonte. Testar R$ com vírgula/ponto, tamanho sem identificação, GG/família, bebidas e bordas.
- Uma reimportação mostra duplicados e mudanças propostas, sem sobrescrever lojas, preços e produtos existentes. O dono consegue continuar manualmente ou retomar a leitura.
- Não há geração criativa automática durante a importação; o consumo da leitura, quando houver, é separado e limitado.
- Promoções vigentes/expiradas têm o preço correto no servidor e na compra, preservando preço-base e pedidos confirmados. Publicar exige aprovação do dono.
- O dono consegue recuperar uma criação depois de recarregar ou entrar novamente, sem novo consumo e sem acesso a outra pizzaria.
- Uma descrição proposta só altera o produto escolhido, depois de aprovação, preservando preços/Pix e a versão pública até o clique de publicação.
- Uma solicitação de imagem chega ao gerador de imagem com a ideia original; falhas não exibem o próprio cardápio como imagem criada.
- Os ingredientes e fatos usados foram confirmados; as sugestões não apresentam características não informadas como verdade.
- O fluxo manual continua completo e a indisponibilidade da IA não impede publicar o cardápio ou receber pedidos.
- Uma nova prova paga, se necessária para mudanças futuras, depende do aviso de consumo e da autorização correspondente; os testes locais devem identificar claramente o uso de respostas simuladas.

Esses critérios medem utilidade e confiabilidade. Aumento de vendas ainda é uma hipótese a avaliar com uso real, não uma promessa da IA.

## Ordem sugerida

1. Preparar fotos e testar OCR/organização sem modelos; aproveitar a revisão e os componentes de produto existentes. Escolher a abordagem de leitura por qualidade, tempo e orçamento comprovados.
2. Entregar a entrada por foto, revisão compacta, retomada e cadastro manual, sem consumo criativo automático.
3. Implementar promoção do dia com validade e cálculo no servidor; oferecer mensagem pronta para copiar sem IA.
4. Concluir o fluxo operacional do SaaS já planejado: entrega, aprovações, acompanhamento/chat, acesso de trial e pagamento da assinatura. Não condicionar essas regras à IA.
5. Reaproveitar a geração publicada, recuperar criações e manter descrições/capa/logo opcionais, sem repetir trabalho ou diagnósticos pagos.
6. Depois do uso pelo grupo e da conferência de custo, oferecer divulgação contextual nos planos superiores e rever limites comerciais.

O registro inicial desta proposta alterou somente documentação. A implementação posterior do leitor/promoções modifica o aplicativo e exige publicação Sites, com validações registradas em LEITOR-CARDAPIO.md e CONTINUAR.md. Segredos, planos comerciais e cotas de modelos permanecem preservados.

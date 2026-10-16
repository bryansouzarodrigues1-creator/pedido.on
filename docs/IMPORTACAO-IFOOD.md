# Importação de cardápio iFood na pizzaria.on

## Atualização de 16/10/2026

A entrada pública pela ideia e o painel **Cardápio → Importar cardápio** aceitam link iFood, texto completo, TXT/CSV e fotos. O link pode iniciar uma consulta controlada à página pública, sem credenciais e sem redirecionamentos. Apenas dados estruturados `MenuItem`/`MenuSection` com preço BRL inequívoco são levados à revisão. A rota `/api/menu-source` impõe timeout, limite de 1,5 MB e limites de tentativas em D1; não contorna autenticação, CAPTCHA ou bloqueios.

O link real da Aione abaixo respondeu **HTTP 403** na tentativa desta sessão. Isso não comprova importação automática dessa loja. O aplicativo informa o bloqueio e aceita o texto completo ou arquivo TXT/CSV; fotos continuam como alternativa. O conector oficial segue dependente de aplicação homologada e autorização por loja. [Implementação, evidências e limites](IDEIA-CARDAPIO-2026-10-16.md).

A leitura local remove ruído de capturas e distingue o produto de avaliações, taxas, botões e adicionais. Preços personalizados/promocionais exigem revisão individual. A tentativa inicial e seus arquivos continuam após o cadastro, sem redigitar o briefing.

## Histórico — candidata da PR #13, 13/10/2026

O registro abaixo documenta o estado daquela candidata; as referências de versão e a ausência de consulta pública foram superadas pelo pacote de 16/10.

A candidata aceita a mensagem compartilhada inteira ou o link público da loja em **Cardápio → Enviar foto do cardápio → Colar texto ou link da loja**. A produção continua na v28; esta mudança ainda não foi publicada.

O reconhecimento roda no aparelho. Valida HTTPS, domínio iFood, rota pública de delivery e identificador UUID; monta um endereço canônico sem query de rastreamento ou fragmento. Mostra a referência do link e uma ação para abrir o cardápio no iFood. Hosts semelhantes, credenciais na URL, portas alternativas, slugs inválidos e IDs malformados são rejeitados. Nenhum endereço enviado é buscado pelo servidor, nenhum modelo é chamado e nenhum crédito de IA é consumido.

Nomes e localidade são **rótulos derivados do endereço**, não dados confirmados pela API. O ID do link público não é presumido como o `merchantId` autorizado. CNPJ, produtos, preço mínimo, avaliação e horários não são inferidos ou aplicados à pizzaria do usuário. O CNPJ corporativo do rodapé do site iFood não identifica o restaurante.

## Exemplo fornecido pelo proprietário

Link canônico: [Aione Pizzas no iFood](https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/900caad5-258e-4bf7-9458-353cb0bffe60).

| Referência extraída localmente | Valor |
| --- | --- |
| Origem | iFood |
| Rótulo do endereço | Aione Pizzas Jardim Pero |
| Localidade do endereço | Cabo Frio · RJ |
| Identificador do link | `900caad5-258e-4bf7-9458-353cb0bffe60` |

Uma mensagem que contém apenas o convite para favoritar e a URL produz **zero itens de cardápio**. URLs e esses textos de compartilhamento são removidos antes da interpretação de produtos. Quando o dono acrescenta produtos e preços ao mesmo texto, eles continuam passando pelo leitor/revisor existente. Trechos que contêm somente referência e URL não são produtos; valores presentes apenas nos parâmetros da URL nunca viram preços. Links de lojas diferentes são mostrados separadamente, com conferência de origem.

A leitura original já é guardada em IndexedDB por pizzaria. A referência reaparece ao reabrir o leitor ou continuar uma importação parcial. Não há novo esquema D1, nova migração ou alteração na gravação/publicação do cardápio. O dono ainda confere os itens e confirma o rascunho.

No **Estúdio**, a mensagem compartilhada também recebe ajuda local, com ação **Conferir no leitor**. A transferência carrega primeiro o checkpoint da pizzaria ativa, acrescenta a nova fonte sem substituir os itens/ajustes e abre a revisão de fontes. Links repetidos são consolidados; falta de espaço gera aviso em vez de truncamento. O checkpoint é enfileirado imediatamente, e o PWA considera a transferência pendente como atividade.

Uma mensagem reconhecida como dúvida/ajuda local não pode cair no gerador de texto/imagem: o construtor de pedidos e as duas rotas autenticadas recusam esses casos antes de criar jobs ou reservar cotas. Solicitações criativas explícitas de imagem continuam no caminho existente.

## Importação automática do catálogo — dependência externa

A interface informa que a importação automática por link ainda está indisponível. O caminho utilizável agora é abrir a loja, enviar prints voluntários dos produtos ou colar o texto com preços e revisar o resultado. Não há scraping do iFood/99Food nem simulação de catálogo obtido da loja Aione.

Para o conector oficial, o próximo trabalho concreto depende de uma aplicação iFood própria, com módulos e finalidade de importação aprovados:

1. Cadastrar a aplicação no iFood Developer, escolher o tipo adequado à arquitetura e solicitar os módulos Merchant/Catalog necessários. Concluir a homologação antes de pedir acesso a lojas de produção.
2. Guardar as credenciais somente no servidor do pedido.on. Nenhum segredo pode ser colocado no campo de texto, navegador, código GitHub ou documentação.
3. Conectar cada pizzaria pelo fluxo do tipo de aplicação aprovado. Na aplicação centralizada, o portal permite localizar a loja por ID/CNPJ e enviar a solicitação; o responsável aprova no Portal do Parceiro. O fluxo distribuído usa código/URL de autorização. O CNPJ é uma referência de busca, não uma credencial.
4. Consultar as lojas autorizadas e confirmar a loja correta antes de usar seu `merchantId`. Consultar catálogo, categorias/itens e adicionais com token autorizado e renovação apropriada. A importação será de leitura; comandos de escrita do catálogo iFood não fazem parte desta tarefa.
5. Mapear os dados ao revisor existente, mantendo IDs externos para deduplicação, valores em centavos e relatório de tamanhos/adicionais que o pedido.on não representa. Conferir associação/direitos das fotografias e preços de cada canal. Salvar apenas itens aprovados no rascunho; a publicação permanece uma decisão separada do dono.

Sem essa aplicação homologada e o aceite da Aione, a URL pública comprova a referência da loja, mas não uma importação completa do catálogo. A etapa externa não bloqueia o beta por fotos/texto. Limites de IA, planos/trial e gateway permanecem os existentes.

## Provas e limites

Os testes usam a **URL real fornecida** e cardápio **fictício** acrescentado ao texto. Cobrem links enganosos, mensagem inteira/multilinha, preços/ingredientes, referências duplicadas, duas lojas, Unicode, retomada/importação parcial e mesclagem da transferência com `fetch` bloqueado. As duas rotas reais de IA recusaram links/dúvidas locais com 422, zero jobs/chamadas/cotas e cardápio público/Pix preservados; identidade e adaptadores D1/R2 são simulados. A tela de referência real foi renderizada em SSR; não houve clique/teste interativo em Android nem chamada autenticada à API iFood. A ficha pública foi localizada por pesquisa, mas não forneceu um catálogo de produtos verificável nesta sessão.

Fontes oficiais consultadas em 13/10/2026:

- [Solicitação de acesso e autorização de lojas](https://developer.ifood.com.br/en-US/docs/getting-started/first-steps/request-access).
- [Autenticação e permissões](https://developer.ifood.com.br/en-US/docs/food/guides/modules/authentication/intro).
- [Consultas da API de catálogo](https://developer.ifood.com.br/en-US/docs/food/guides/modules/catalog/endpoints).
- [Guia Anota AI: importação do iFood com autorização](https://anota.ai/ajuda/primeiros-passos/).

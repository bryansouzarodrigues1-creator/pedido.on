# Alternativas para importar o cardápio — 24/10/2026 UTC

## Decisão proposta

Para o beta de 5–10 pizzarias, usar o leitor existente com arquivos fornecidos pelo dono e revisão assistida. Para automatizar a leitura do iFood, priorizar a avaliação de uma integração autorizada por loja. O iHub é candidato a essa avaliação; ainda não é uma integração implementada nem homologada neste projeto.

A v85 segue publicada. A última consulta real ao iFood terminou em HTTP 403/zero produtos. Sugestão de nome pelo endereço, processo concluído ou catálogo vazio não comprovam importação. Nesta pesquisa não houve nova captura da loja bloqueada, execução de Actor, contratação ou alteração de ambiente.

## Comparação

| Alternativa | Evidência e limite | Encaminhamento |
| --- | --- | --- |
| TXT/CSV, PDF digital, HTML salvo e fotos enviados pelo dono | Fluxos já implementados. Arquivo precisa conter os produtos; OCR e fotos exigem conferência. | Utilizar agora, preferindo texto/CSV/PDF com texto selecionável. |
| Extensão já existente | Depende de o dono abrir normalmente o cardápio no computador. Não resolve página bloqueada nem oferece importação automática no celular. | Opção assistida para quem já consegue acessar. |
| iHub com autorização do lojista | Anuncia R$49/mês por integração e múltiplas lojas sem limite imposto pelo fornecedor. Documenta Catalog, vínculo autorizado e consulta de itens/opções. Catalog não tem simulação no sandbox. | Candidato prioritário; confirmar cobertura do plano, elegibilidade e vínculo sem efeitos operacionais indesejados. |
| API direta iFood | Documentação oficial indexada exige CNPJ/CNAE tecnológico e restringe aplicações operacionais somente para leitura. As páginas diretas retornaram 403 nesta pesquisa. | Não contar com acesso imediato; confirmar enquadramento com o iFood. |
| Coletores Apify | Contratos comerciais consultados; nenhum novo resultado real obtido. | Não ativar ou trocar o coletor com base apenas na descrição da loja de aplicativos. |
| Gravação da tela do próprio cliente | Hipótese técnica, sem implementação ou benchmark neste projeto. | Não anunciar suporte nem substituir os anexos existentes por essa promessa. |

## Candidato iHub: o que validar

A oferta é por integração, não explicitamente por pizzaria. **Cálculo condicional:** R$49 divididos entre cinco lojas = R$9,80 por loja/mês; entre dez = R$4,90. Essa conta não inclui nossos outros custos e depende da confirmação de que Catalog e o uso pretendido estão cobertos. A alegação de homologação é do fornecedor; não foi confirmada independentemente.

A documentação inicia polling/webhooks de pedidos após vincular a loja. Portanto, não vincular uma loja real apenas para experimentar leitura sem primeiro esclarecer esse comportamento. Também falta prova real de fotos, tamanhos, bordas e regras de combinação de pizzas.

Proposta de teste, ainda não implementada: usar uma loja cujo proprietário autorize o acesso; percorrer catálogos, categorias e itens completos; transformar a resposta em rascunho para revisão. Conferir loja, moeda, cobertura, preços por canal, opções e origem das fotos. Recusar associação ambígua e informar resultados parciais. Publicar somente depois da confirmação do dono. Não alterar produtos, disponibilidade, pedidos ou horários no iFood.

## Apify: custo não significa catálogo entregue

- `viralanalyzer/ifood-restaurant-intelligence`: US$0,025 por restaurante; a página de preços atual informa custos de plataforma incluídos. Corrigida a indicação anterior de custos separados neste contrato. A ponte existente continua desativada e sem resultado real de catálogo validado.
- `yasmany.casanova/ifood-scraper`: US$0,025 por resultado. No modo menu, cada item é um resultado: 100 itens representam US$2,50 em eventos. O fornecedor exige proxy residencial para dados ao vivo; não é a rota proposta para a loja que já retornou bloqueio.
- `memo23/ifood-scraper`: admite retornar a loja com menu indisponível e cobrar pelo registro da loja. Outro coletor não é prova de resolver o bloqueio.

A Anota AI também documenta importação autorizada durante o cadastro. Isso demonstra uma experiência comercial possível, sem documentar uma API reutilizável por nosso produto ou comprovar acesso anônimo universal.

## Evidência e continuidade

Esta é uma revisão documental e comercial; não uma nova homologação externa. Os 609 testes da v85 e os 27 do frontend Lovable são da entrega anterior. Nenhuma nova bateria de testes do aplicativo foi necessária por estes arquivos de documentação.

Próximo marco verificável: um catálogo não vazio de uma loja autorizada, com preços e fotos conferidos pelo dono. Até lá, arquivos e revisão assistida mantêm o beta utilizável.

## Fontes primárias consultadas

- [iHub: oferta, preço e múltiplas lojas](https://ihub.arcn.com.br/) · [autorização, Catalog e sandbox](https://ihub.arcn.com.br/docs)
- [iFood: requisitos](https://developer.ifood.com.br/pt-BR/) · [política de homologação](https://developer.ifood.com.br/en-US/docs/getting-started/homologation/categories) — conteúdo indexado; acesso direto bloqueado.
- [Viralanalyzer: preços](https://apify.com/viralanalyzer/ifood-restaurant-intelligence/pricing)
- [Yasmany: contrato e unidade de cobrança](https://apify.com/yasmany.casanova/ifood-scraper)
- [Memo23: limites de catálogo](https://apify.com/memo23/ifood-scraper)
- [Anota AI: primeiros passos](https://anota.ai/ajuda/primeiros-passos/)
- [Estado publicado e testes da v85](LINK-E-CALCULADORA-20261023.md) · [Pesquisa anterior](IFOOD-ACESSO-E-CATALOGO-20261019.md)

# Base de cardápios do iFood: viabilidade — 24/10/2026 UTC

## Resultado

É possível construir um acervo de cardápios obtidos por fontes autorizadas e mantê-lo por loja. **Não foi encontrada nem baixada uma fonte comprovada com todos os cardápios atuais de todas as pizzarias do iFood.** Um índice de estabelecimentos não substitui produtos, tamanhos, bordas, adicionais, fotografias e preços.

A recomendação para o beta é importar sob demanda e guardar o resultado conferido de cada cliente. Fazer uma captura nacional antecipada não resolve o bloqueio observado e adiciona coleta e manutenção antes de termos clientes suficientes para usar os dados.

## O que foi verificado

| Fonte | Evidência observada | Consequência |
| --- | --- | --- |
| Extensão própria 0.4.0 | Manifesto com activeTab/scripting, sem processo de varredura em segundo plano; captura do DOM da aba aberta, limitada a 200 itens. | Pode ajudar na leitura de uma loja normalmente acessível; não oferece cobertura nacional nem completude. |
| Actor Yasmany no Apify | Anuncia índice de mais de 98 mil **restaurantes de várias categorias**, atualizado periodicamente. A busca usa o índice; o menu exige outra operação ao vivo. | A contagem anunciada não é de pizzarias com cardápio pronto. Não houve execução do Actor. |
| Projeto público ricardotachinardi/ifood-scraper | README aponta bases de novembro/2020 e fevereiro/2021. O spider inspecionado exporta informações da loja; não itens de cardápio. | Fonte histórica para análise, sem prova de catálogo atual utilizável. CSVs completos e fotografias não foram baixados; licença de reutilização dos dados não foi validada. |
| API oficial | A documentação indexada descreve permissões para merchants autorizados. O acesso direto à página retornou 403 nesta consulta. | Conectar uma loja não libera todos os estabelecimentos da plataforma. |

O README do runner e os testes preservam a parada em bloqueios. Nenhum endpoint alternativo, proxy, credencial de visitante ou tentativa adicional na loja bloqueada foi utilizado nesta pesquisa.

## Custo: cenário ilustrativo, não contagem real de pizzarias

O contrato Yasmany informa US$0,025 por resultado, sendo cada item um resultado no modo menu. **1.000 lojas × 50 itens = 50.000 resultados = US$1.250 em eventos por coleta.** Esse valor não cobre necessariamente todos os custos e não garante êxito, cobertura ou atualização. Uma captura inicial não mantém o catálogo atual.

O coletor Viralanalyzer tem outra unidade comercial, por restaurante, e continua sem resultado de catálogo real validado no projeto. Não comparar preços por item e por restaurante como se comprassem a mesma cobertura.

## Proposta para nossa base, ainda não implementada

Guardar por identificador canônico da loja, com origem, data de captura, data de conferência e cobertura declarada. Consultar os dados permitidos para o cliente autenticado e atualizar quando ele solicitar, com confirmação de preço/foto antes de publicar. Um catálogo incompleto ou antigo precisa aparecer como tal.

A importação por arquivo e a integração autorizada são entradas possíveis para essa base. Não reaproveitar silenciosamente rascunhos privados de outro proprietário. Não migrar D1/R2 nem ativar aquisição paga para implementar apenas esta proposta.

## Verificação executada e pendência anterior

- Sete testes da extensão passaram com DOM e produtos **fictícios**, incluindo centavos, preços ambíguos, tamanhos, páginas vazias e limite de 200 itens. São testes do extrator e do leitor, não uma extração nacional.
- Os hashes do teste, manifesto, extrator, formatador e leitor local coincidem com a fonte atual do GitHub. Evidência sanitizada: [JSON](evidence/base-nacional-20261024.json).
- A PR principal #98 já estava integrada. O espelho #52 foi conferido por diff e igualdade dos três blobs e integrado por merge normal, sem alterar proteções. Duas tentativas do workflow 40048993909 falharam sem etapas/logs; não declarar esse CI aprovado.
- O conector Stripe respondeu à consulta de contas após a reconexão. Nenhuma configuração financeira foi alterada. Stripe não fornece os cardápios. A busca do Directory pela CLI ficou indisponível devido à restrição de socket local; a pesquisa continuou pelas fontes primárias e pelo conector Apify.
- Esta entrega é documental. A v85 permanece a versão publicada; não houve mudança do aplicativo, ambiente, dados de restaurantes ou contratação.

## Fontes primárias

- [Manifesto da extensão](../tools/ifood-import-extension/manifest.json) · [limites e operação](../tools/ifood-import-extension/README.md)
- [Apify: índice e operações separadas](https://apify.com/yasmany.casanova/ifood-scraper)
- [Projeto histórico e datas das bases](https://github.com/ricardotachinardi/ifood-scraper) · [campos do spider](https://github.com/ricardotachinardi/ifood-scraper/blob/main/ifood_spider.py)
- [iFood: autorização](https://developer.ifood.com.br/en-US/docs/food/guides/modules/authentication/intro) — conteúdo indexado; página direta bloqueada.
- [Alternativas de importação já avaliadas](ALTERNATIVAS-IMPORTACAO-20261024.md)

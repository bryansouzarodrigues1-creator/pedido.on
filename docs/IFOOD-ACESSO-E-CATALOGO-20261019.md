# Acesso ao iFood e revisão de catálogos grandes

## O que depende de acesso externo

O link público não precisa vir do proprietário. Aceitar o endereço compartilhado, porém, não significa receber seu catálogo. Os testes reais de Master Pizzas e Aione continuam sem produtos, endereço ou horários por causa da confirmação humana/HTTP 403. [Prova anterior](TESTE-LINK-PUBLICO-IFOOD-20261019.md). Esta correção não remove esse bloqueio e não ativa o conector oficial.

Consulta a fontes primárias em 19/10/2026:

| Caminho | Preço informado pelo fornecedor | Condições e resultado observado |
| --- | --- | --- |
| iFood Developer | APIs gratuitas para desenvolvedores elegíveis | FAQ exige CNPJ válido, CNAE de tecnologia e aplicativo funcional/homologado. A política não aceita módulos operacionais somente para leitura, exceto Financial/Analytics. Confirmar com o iFood a elegibilidade desta importação pontual antes de contar com Merchant/Catalog em produção. |
| BrScrapp | Anuncia 50 créditos de teste, sem cartão; plano de R$5/66 chamadas | Homepage, cadastro, documentação e API retornaram HTTP 525 na consulta real desta sessão. Nenhuma conta ou chave criada; funcionamento e qualidade do catálogo não validados. Não contratar com base apenas na página indexada. |
| iHub | Anuncia R$49/mês por integração | Documenta autorização de cada loja, catálogo e dados cadastrais; a afirmação de homologação é do fornecedor. Exige conta/plano, webhook e chave. Vincular uma loja inicia também polling de pedidos. Catálogo não é simulado no sandbox. Não houve contratação, vínculo de loja, teste real ou confirmação contratual da cobertura de catálogo. |

Não foi contratada plataforma, criada conta externa ou feita cobrança nesta pesquisa. O iHub usa autorização do dono; não demonstrou extração anônima de qualquer link. O acesso só por link continua sem solução operacional comprovada nestas duas lojas.

## Falhas corrigidas no código

- O texto da importação autorizada reserva espaço para o link e a quebra de linha dentro do limite de 60.000 caracteres usado pelo compositor e pela leitura salva. A exportação mantém produtos inteiros e avisa quando o catálogo é parcial.
- O cálculo do limite inclui o separador entre produtos, corrigindo a passagem indevida de 60.001 caracteres. O tamanho é acumulado sem remontar o texto a cada produto.
- Mesmo após alcançar 500 produtos, um preço posterior conflitante remove o produto ambíguo. Produtos adicionais omitidos geram aviso; não são descartados silenciosamente.
- Descrições oficiais recebem um marcador explícito. O leitor mantém texto, medidas, contatos e valores da descrição no próprio produto, sem transformá-los em outros itens ou preços.

## Ensaios reproduzíveis

Os quatro testes novos usam catálogo e transporte **fictícios**, sem acesso a uma loja real:

1. Limites de texto: 60.000 caracteres exatos, tentativa de 60.001, espaço menor e espaço zero, sempre preservando produtos inteiros.
2. Descrições com medidas, oferta com valores monetários e contato/endereço, preservando o preço do produto.
3. 501 produtos mais uma repetição conflitante; o produto ambíguo é excluído e os limites ficam explícitos.
4. Importação autorizada com catálogo grande → `mergeReaderSource` → schema da ideia salva → leitor real de revisão. O link é preservado, 99 produtos cabem e todos mantêm R$12,34.

Passaram **476 testes**, `pnpm typecheck` e build Sites. A primeira tentativa do build encontrou `ENOTEMPTY` no diretório gerado `dist/.openai`; a limpeza desse build temporário permitiu concluir sem alteração de código/configuração. Não há migração ou alteração de configuração, assinatura, cotas, sessão ou loja real nesta mudança.

## Publicação e resultados externos

**v68 publicada em 19/10/2026 às 19:04:43 de Brasília**, ambiente revisão 13 e audiência pública preservados. Fonte Sites `641923fc5aa4906b37b283ab89ad106839fbfc40`, árvore `4861ac828860a6219ce3457a4f0e362e09cd7efe`, implantação `appgdep_6ad693e1f9f081919d43ce0d622e4b6d`. PR [#72](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/72) integrada; mirror [#29](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/29) integrado apenas em `legacy/pizzaria-on-source`.

- Chrome `39331706936`: onze suítes locais da candidata e sete da interface pública, todas sem erro; dados iFood controlados. As sete públicas ocorreram na v67 anterior à implantação. Artefato `12223654406`, SHA-256 `6c0b728c3f838bc8edcba63e29081400bcd9a7901c4be06ef88279e3a127b3bd` conferido; captura da prévia fictícia inspecionada.
- Windows `39331706766`, autenticação/pedidos `39331706640` e mirror `39331732694` aprovados.
- Benchmark de PDF público real `39331706906`: **13/21 preços corretos e 14 itens prontos segundo o leitor**. Workflow concluído mede a execução; não significa precisão de 100% nem homologação geral do OCR. Continua necessária revisão dos preços. Artefato `12225170954`.
- Após a publicação, às 19:05:05 de Brasília: início e cardápio existente `/p/pizzaria-do-bryan` responderam HTTP 200; `/api/ifood/import` respondeu 200 com `enabled:false`. Os sete cadastros completos foram comparados antes/depois, sem alteração ou valores truncados.

Pixel 7 emulado não equivale a Android físico. O teste positivo de importação oficial permanece fictício. Não houve primeira importação autenticada real, nova conta em fornecedor, contratação, mensagem, pagamento ou geração paga. [Evidência estruturada](EVIDENCIA-IFOOD-CATALOGO-20261019.json).

## Fontes primárias

- [iFood Developer — FAQ de requisitos e preço](https://developer.ifood.com.br/pt-BR/)
- [iFood — política de homologação, aplicativos somente de leitura](https://developer.ifood.com.br/en-US/docs/getting-started/homologation/categories)
- [BrScrapp — API iFood](https://brscrapp.com/api-ifood), [preços](https://brscrapp.com/pricing), [cadastro](https://brscrapp.com/signup) e [documentação](https://brscrapp.com/docs)
- [iHub — oferta](https://ihub.arcn.com.br/) e [documentação de autorização/catálogo](https://ihub.arcn.com.br/docs)

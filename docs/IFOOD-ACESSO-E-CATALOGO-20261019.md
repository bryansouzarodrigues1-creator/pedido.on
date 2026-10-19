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

Comandos: `pnpm test`, `pnpm typecheck` e build Sites. O resultado de publicação e CI será registrado após a conclusão. Não há migração ou alteração de configuração, assinatura, cotas, sessão ou loja real nesta mudança.

## Fontes primárias

- [iFood Developer — FAQ de requisitos e preço](https://developer.ifood.com.br/pt-BR/)
- [iFood — política de homologação, aplicativos somente de leitura](https://developer.ifood.com.br/en-US/docs/getting-started/homologation/categories)
- [BrScrapp — API iFood](https://brscrapp.com/api-ifood), [preços](https://brscrapp.com/pricing), [cadastro](https://brscrapp.com/signup) e [documentação](https://brscrapp.com/docs)
- [iHub — oferta](https://ihub.arcn.com.br/) e [documentação de autorização/catálogo](https://ihub.arcn.com.br/docs)

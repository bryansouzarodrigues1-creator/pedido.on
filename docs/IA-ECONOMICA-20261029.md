# IA e planos — continuidade de 29/10/2026

A atualização comercial de 28/10 foi incorporada sobre a v107; não recomeça o produto. Essencial permanece R$49/mês e Pro R$89/mês. Nenhuma chamada ao construtor Lovable, compra de créditos, geração real ou novo fornecedor foi autorizada/executada nesta etapa.

## Regras implementadas

- Teste de 10 dias preservado. Novas adesões recebem **uma imagem + uma criação de texto de IA no período inteiro**, compartilhadas por conta, loja, Estúdio e kit. Duas rodadas de sugestões locais e artes com fotos salvas continuam disponíveis sem gerar novas imagens. Testes/cortesias anteriores conservam sua oferta registrada.
- Essencial: **três novas imagens por dia de Brasília**, com legendas de divulgação; sem atendente ao consumidor. Fotos/logo/capa/fundos compartilham a contagem. Reutilização de modelos e downloads não consome geração.
- Pro: **sem cota mensal fixa de imagens**, com uma geração em andamento por conta, até três solicitações por minuto, ausência de repetição automática e proteção financeira global. O antigo teto de 20 por semana foi removido. O teto global estimado de 20 créditos de referência NÃO foi aumentado. Esta reserva não é uma fatura ou medição de custo real.
- Atendente específico da loja e seu histórico já existem desde a v107. Perguntas objetivas usam dados publicados, sem chamar modelo; Essencial não recebe essa função. O agente WhatsApp segue fora do escopo.
- Artes usam foto/fundo reutilizável e tipografia programática: nome, preço, validade e condição vêm da oferta publicada. A legenda aparece junto da nova imagem, sem outro modelo. Uma criação é reaproveitada no quadrado e no vertical. Texto de retirada não promete entrega.
- O pagamento antecipado preserva o prazo gratuito e o mês pago, conforme a regra existente; não foi recriada a assinatura nem feita cobrança real.

## Custos e dados disponíveis

Novo registro por tentativa, loja e função: imagens/promoções, texto do proprietário e atendimento ao cliente. Nenhum prompt, token de acesso ou conversa é copiado para o registro financeiro. Idempotência mantém uma linha por trabalho. O serviço atual pode omitir tokens e custo; nesse caso ficam **não informados**, inclusive no admin. O contrato opcional de metadados de resposta está preparado, mas a versão remota Lovable não foi editada para começar a fornecê-los.

O admin passa a apresentar uso por pizzaria/função, tentativas concluídas/falhas, tokens/custos com cobertura parcial explícita, reservas estimadas e assinaturas confirmadas por conta. Somente cobranças canônicas de produção, com cliente correspondente e data de pagamento informada entram na receita do período. Cobranças reembolsadas/contestadas/pendentes não entram. Registros antigos sem data são separados. Receita de assinaturas não é o movimento de pedidos da pizzaria. Valores líquidos e tarifas/ajustes só vêm de `netValue` informado pelo Asaas na conciliação normal; tarifa desconhecida não vira R$1,99 nem zero. Não foi disparada conciliação externa para preencher histórico.

Alertas de 80% da reserva global e pausas de geração preservam o orçamento. O relatório não calcula lucro líquido: faltam custos totais de infraestrutura, suporte, armazenamento, impostos e aquisição. Créditos de desenvolvimento são separados dos custos operacionais; não há telemetria automática do saldo de desenvolvimento Lovable.

## Pesquisa oficial, sem contratação

Consultado em 29/10/2026:

- [FLUX.1 Schnell/fal](https://fal.ai/models/fal-ai/flux/schnell): US$0,003 por megapixel, arredondamento para cima e uso comercial. 1024 × 1024 = 1,048576 MP, portanto 2 MP faturáveis = **US$0,006 por imagem**. A quantidade não inclui novas tentativas/repetições.
- [Preços Gemini](https://ai.google.dev/gemini-api/docs/pricing?hl=pt-br): Gemini 2.5 Flash-Lite de referência com US$0,10/milhão de entrada e US$0,40/milhão de saída. Não aplicar esses preços ao modelo distinto usado pelo serviço atual.
- [Asaas — eventos](https://docs.asaas.com/docs/webhook-para-cobrancas) e [valor líquido](https://docs.asaas.com/docs/split-de-pagamentos): `value`, `netValue`, `paymentDate`/`confirmedDate` são dados da cobrança. Nenhuma taxa comercial da conta foi presumida.

| Hipótese FLUX 1024² | USD | BRL com dólar **ilustrativo** a R$5,30 |
| --- | ---: | ---: |
| 30 imagens | 0,18 | 0,95 |
| 90 imagens | 0,54 | 2,86 |
| 300 imagens | 1,80 | 9,54 |
| 1.000 imagens | 6,00 | 31,80 |

No exemplo Gemini, 500 consumidores/mês × 3 interações × (1.500 tokens de entrada + 300 de saída) resultam em US$0,405, ou R$2,15 com esse câmbio ilustrativo. 500 consumidores/dia por 30 dias resultariam em US$12,15/R$64,40. São simulações, não consumo observado, e não incluem raciocínio adicional, conversas longas, tentativas, infraestrutura ou tarifas.

**A FLUX não foi ativada.** O serviço publicado continua Lovable AI Gateway, com `google/gemini-3.1-flash-lite-image` e `google/gemini-3.1-flash-lite`. Não há credencial fal validada no projeto. Antes da migração: autorização específica para chave/consumo, uma avaliação visual comparável, conferência da cobrança e só então troca controlada do provedor. Não publicar a estimativa da FLUX como custo da operação atual.

## Migração, validação e limites

Migração 0026 apenas acrescenta tabela de recibos e colunas opcionais de pagamento, além da versão da oferta com padrão legado constante. Novas adesões gravam a versão 3 explicitamente. Não reescreve testes/cobranças já existentes, sessões, identidade de loja, preços, Pix ou objetos R2. Não há backfill destrutivo nem nova conta de demonstração em produção.

A validação desta entrega usou banco descartável, D1/workerd real, provedores simulados, tipos/build e Chrome no CI. Nenhum teste simulado comprova o custo ou a qualidade de um modelo real. Android físico, recuperação por e-mail real, assinatura paga real e troca de provedor continuam exigindo homologação própria. A publicação v108 e seus checks estão registrados abaixo.

### Verificação local concluída

- **778 testes aprovados**, zero falhas, incluindo concorrência real em D1, nova franquia cruzando Estúdio/kit/lojas, calendário de Brasília, migração preservando registros anteriores, Pro além de 20 imagens, orçamento global e suspensão.
- TypeScript e build oficial aprovados. Testes dos provedores e Asaas são simulados; nenhuma geração ou cobrança real ocorreu.
- Leitura antes da publicação: três lojas e três testes existentes, zero cobranças Asaas registradas. A projeção de duas células JSON de lojas foi truncada pela ferramenta: isso não é backup integral nem prova de igualdade de todos os campos. Não foram lidas/expostas credenciais de sessão.
- Tokens e custo reais continuam desconhecidos quando o serviço não informa metadados; os números dos testes são sintéticos.


### Publicação do núcleo e correção da apresentação

- **v108 publicada em 29/10/2026 às 09:06:59 de Brasília**, audiência pública e ambiente revisão 20 preservados. Fonte Sites `5824045a02401efebe5d3e3097deb9c874b2758e`, árvore `0fc7e99bdea37fb13f60e2b8915b340ef334e65a`, versão salva `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_3d51b013f7248191be13f1a2af465e2c`, implantação `appgdep_6ae336c9b11c8191ab42e76b1badee81`, resultado `succeeded`.
- PR #147 integrada em `ea27c66ba65ff1d8404c1d03bd046e8441a0696e`. Checks sobre o head `d8d1ff07b6696ee87d04153aba9531e22511f260`: Chrome `40794328654` (core e welcome-kit), Windows `40794328708`, autenticação/pedidos `40794328792`, chat/build `40794328665` e disponibilidade `40794328889`, todos aprovados.
- O Chrome do kit comprovou oito cenários, uma imagem + texto simulados, quatro PNGs reais nos formatos de redes, revisão de preços, verificação/desverificação e envio manual de material. O provedor foi simulado; não é prova de custo real.
- A leitura após a migração mostra três lojas, três testes existentes, zero cobranças e zero recibos novos de IA. As contagens são compatíveis com a leitura anterior. Não há comparação integral disponível dos dados de produção: duas células JSON vieram truncadas, e o estado completo anterior não permaneceu disponível após a retomada. A migração é aditiva e a preservação foi verificada no D1 descartável. Sessões não foram expostas.
- A conferência no navegador público identificou um texto antigo no cartão Free anunciando quatro fotos. Foi corrigido para uma imagem com texto, usando `trialOffer` do servidor, com condições de uso justo na página real e teste de regressão do HTML efetivamente renderizado. Os modelos sem nova foto deixam de prometer outra geração. Esta correção é de apresentação; não altera a nova franquia, os pagamentos, a migração ou o atendimento.
- A FLUX e seu preço pesquisado continuam como candidata: nenhuma credencial/contratação/geração real foi realizada. A prioridade seguinte é validar qualidade e custo reais do provedor econômico, antes de trocar o serviço publicado.

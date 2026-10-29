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

A validação desta entrega usa banco descartável, D1/workerd real, provedores simulados, tipos/build e Chrome no CI. Nenhum teste simulado comprova o custo ou a qualidade de um modelo real. Android físico, recuperação por e-mail real, assinatura paga real e troca de provedor continuam exigindo homologação própria. O estado final da publicação e os checks serão registrados na continuidade após os resultados.

### Verificação local concluída

- **778 testes aprovados**, zero falhas, incluindo concorrência real em D1, nova franquia cruzando Estúdio/kit/lojas, calendário de Brasília, migração preservando registros anteriores, Pro além de 20 imagens, orçamento global e suspensão.
- TypeScript e build oficial aprovados. Testes dos provedores e Asaas são simulados; nenhuma geração ou cobrança real ocorreu.
- Leitura antes da publicação: três lojas e três testes existentes, zero cobranças Asaas registradas. A projeção de duas células JSON de lojas foi truncada pela ferramenta: isso não é backup integral nem prova de igualdade de todos os campos. Não foram lidas/expostas credenciais de sessão.
- Tokens e custo reais continuam desconhecidos quando o serviço não informa metadados; os números dos testes são sintéticos.

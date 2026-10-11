# IA em produção — diagnóstico de 11/10/2026

## Estado confirmado

- Sites continua na versão **17**, fonte `b8ba77bb6b93498b0f686151ee318958236a2ae7`, ambiente revisão **5**, público.
- GitHub `main` conferida em `0bdfe38df88430da5656cf64603d8cef4a06b55b`: PRs #2, #3 e #4 integradas. PR #1 Asaas permanece separada.
- Lovable ativa: projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, URL https://pedido-on-estudio.lovable.app. Correção publicada do commit `b7ef46a7efc0132b48ed4386382d66bc942f40eb`, implantação `7d13aeee-902f-449c-b513-9f27f13dd619`.
- `PEDIDO_STUDIO_ENDPOINT` aponta para `/api/pedido-on/studio` nessa URL e `PEDIDO_IMAGE_ENDPOINT` para `/api/pedido-on/image`. As duas flags estão `true` em produção. Valores secretos não foram exportados nem alterados.
- D1 confirma tentativas de texto e imagem canceladas, sem resultado e sem resgate da autorização. As tabelas das migrações `0007_delivery_approval` e `0008_order_chat` ainda não existem na publicação atual.

## Evidência e causa

O POST de texto de **11/10/2026 às 19:35:49 UTC**, request ID `11085ae7c41da2c9d91bb402b94e511d`, recebeu **401** do serviço Lovable e terminou em 503 no aplicativo. Não há POST do serviço para `/api/ai/studio/claim` no período correspondente. O D1 registrou `cancelled`, sem descontar a sugestão.

Os handlers remotos foram lidos diretamente na Lovable. O projeto usa Nitro com destino Cloudflare. Reproduzir esses arquivos no workerd devolveu `401 claim_denied` com **zero requisições externas**.

Há dois bloqueios no serviço:

1. `deps.fetch(...)` chama a função nativa com o objeto de dependências como receptor. O workerd lança `TypeError: Illegal invocation`, ocultado pelo catch que retorna `claim_denied`. Ligar a função a `globalThis` permite que o POST alcance o callback.
2. Os quatro envios ainda usam `redirect: "error"`, incompatível com o workerd: callback e gateway, para texto e imagem. A correção anterior abrangia apenas o aplicativo Sites. Agora o serviço usa `manual`; status diferente de 200 no callback e respostas não OK do modelo continuam rejeitados, sem seguir redirecionamentos.

## Correção publicada no serviço

Os dois handlers do serviço, suas verificações e a documentação foram ajustados. A proposta de aumento da cota na PR #2 dependia de autorização de custo, conforme `BETA-GRUPO.md`; `imageLimits` volta aos limites já publicados, **3 por proprietário/mês e 2 por dia na plataforma**, antes de preparar a atualização Sites. Tokens continuam de uso único, protocolos e modelos fixos, prazos e ausência de repetição automática preservados. Nenhuma chave, conta, sessão, dado de negócio, preço ou Pix foi modificado.

Os novos testes da raiz executam os handlers no **workerd real local**, com callback e modelo **simulados**. Cobrem texto e bytes de imagem, apenas um envio por etapa, rejeição de redirects no callback e no gateway, capacidade vencida/repetida e ausência de repetição em 402/429/5xx. Não constituem prova de geração paga ou de uma sessão real de produção.

Verificações desta correção: **121 testes da raiz** passaram (incluindo quatro novos testes do serviço, três deles em workerd), **9 testes de protocolo** do serviço passaram e os **13 testes de imagem** passaram com o runner Vitest 3.2.7 já disponível localmente, sem instalar dependências. Typecheck da raiz e checagem TypeScript estrita dos dois handlers passaram. Na construção remota autorizada, a Lovable confirmou 9 testes de protocolo, 14 testes Vitest, TypeScript e build completos. Os quatro arquivos alterados foram lidos no commit remoto e sincronizados neste repositório.

O proprietário autorizou esta nova construção econômica e no máximo um texto e uma imagem reais depois da comunicação comprovada. A construção em `plan_mode:false`, sem Max, informou **2,3 créditos**. A consulta posterior usou `plan_mode:true` como pedido pelo proprietário; na pausa de apresentação o serviço informou **1 crédito**, embora a resposta final após recusar o plano informasse 0. Não presumir que modo conversa é sempre gratuito; não houve novas chamadas ao agente. Nenhuma geração paga foi executada nessa consulta.

## Comunicação publicada comprovada sem geração

A publicação foi identificada pelos headers de saúde, não apenas por um GET 200. Dois POSTs usaram UUIDs inexistentes e tokens aleatórios, sem dados de uma pizzaria:

| Endpoint Lovable | Envio UTC | Resultado | Callback comprovado nos logs Sites |
| --- | --- | --- | --- |
| `/api/pedido-on/studio` | 20:54:46.407 | 401 `claim_denied` | `/api/ai/studio/claim`, 20:54:49.299, 401, request `22d645b7c372c516d2cb4f09c5413eaf` |
| `/api/pedido-on/image` | 20:54:49.418 | 401 `claim_denied` | `/api/ai/images/claim`, 20:54:49.700, 401, request `3cd26053dbdc2edf4e314f40851b52a7` |

Os 401 são esperados nesse diagnóstico: comprovam que o serviço chegou ao Sites e a autorização inválida foi rejeitada antes de chamar o modelo. Isso prova a correção do transporte real, mas ainda não prova geração autorizada, gravação R2 nem aplicação ao rascunho.

## Preservação para atualizar o Sites

Foi salva uma cópia privada dos dados de negócio de 13 tabelas do D1, sem linhas ou colunas omitidas/truncadas nessas tabelas. Não é um dump completo: a leitura de `auth_sessions` trunca dois valores, por isso as sessões foram excluídas da cópia e a tabela será preservada em produção. Nenhum dado dessa cópia ou valor secreto foi incluído no GitHub.

As migrações 0007 e 0008 somente criam duas tabelas e seus índices; não alteram nem excluem linhas/tabelas existentes e não modificam objetos R2. A fonte e a versão v17 foram preservadas para reversão do aplicativo. Isso não equivale a um backup integral de sessões ou do R2. Chave de sessão, ambiente revisão 5, bindings e audiência pública permanecem os mesmos.

## Sequência restante

1. Integrar a PR #5 e implantar a atualização Sites pelo fluxo oficial no mesmo projeto, com as migrações adicionais. GitHub e Lovable não implantam o Sites automaticamente.
2. Com a conexão comprovada e autorização já recebida, validar **no máximo um texto e uma imagem** pela pizzaria autenticada. Registrar request IDs e estados, prévia e imagem no R2; reaproveitar os resultados nos demais testes. Aplicar somente ao rascunho aprovado, preservando preços/Pix e sem publicar conteúdo automaticamente. Não criar uma sessão falsa, utilizar selos extraídos do D1 ou simular a identidade do proprietário para esse teste.
3. Conferir as tabelas de entrega/chat e realizar os testes com dois celulares antes de ativar o beta e seus convites.

Não declarar a IA funcionando até concluir a geração real e a aplicação ao rascunho. Continuam pendentes testes com dois celulares, migrações de entrega/chat, Web Push com app fechado, entrega real de recuperação de senha, persistência/fiscalização do trial, Asaas e a migração Netlify.

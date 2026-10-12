# IA em produção — diagnóstico de 11/10/2026

## Estado confirmado

- Sites publicou a versão **18**, fonte `0509ffc7875ff02b1db786b6a51207b121be5911`, implantação `appgdep_6acbf9522808819187183b508e487dbd` concluída em **11/10/2026 às 21:02:35 UTC**, ambiente revisão **5**, público. A v17 continua preservada no histórico.
- PR #5 integrada à `main` em `de1414ef15a9a2f975d6fb942eb7cd1784acea90`, além das PRs #2, #3 e #4. PR #1 Asaas permanece separada. Esta atualização posterior de documentação registra a publicação; não requer outra implantação para alterar o comportamento do aplicativo.
- Lovable ativa: projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, URL https://pedido-on-estudio.lovable.app. Correção publicada do commit `b7ef46a7efc0132b48ed4386382d66bc942f40eb`, implantação `7d13aeee-902f-449c-b513-9f27f13dd619`.
- `PEDIDO_STUDIO_ENDPOINT` aponta para `/api/pedido-on/studio` nessa URL e `PEDIDO_IMAGE_ENDPOINT` para `/api/pedido-on/image`. As duas flags estão `true` em produção. Valores secretos não foram exportados nem alterados.
- D1 registra as tentativas antigas canceladas e, agora, duas gerações reais de texto concluídas pelo proprietário. Ainda não há imagem real concluída nesta sessão. As migrações `0007_delivery_approval` e `0008_order_chat` foram aplicadas: `delivery_checks` e `order_messages` existem e estão vazias. Os dados visíveis das 14 tabelas anteriores permaneceram iguais após a publicação (a inspeção de sessões continua parcial).

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

## Texto real comprovado no celular e erro de destino

As duas tentativas mostradas nas novas telas têm claim e POST autenticado com status 200, além de estado `completed` e resultado no D1:

| Job | Criado UTC | Concluído UTC | Resultado |
| --- | --- | --- | --- |
| `df158380-d0b4-4836-9c6e-b649fb7eefb6` | 21:08:40.477 | 21:08:43.830 | Texto/visual, 465 bytes |
| `39fa6cba-cfe3-4b1a-a107-66c4dfd5302c` | 21:09:21.237 | 21:09:23.718 | Texto/visual, 1.025 bytes |

Os POSTs tiveram requests `69f6849babbb9690d572f5ac1f226d64` e `eb1bcf5606c1666adf3a337efdea72f6`. São gerações reais de texto em 3,35 e 2,48 segundos; velocidade não era prova de simulação. As ideias pediam uma logo, mas a interface as enviou à rota de texto. Esse gerador devolve parâmetros, descrições e briefing de imagem, sem bytes de logo. A interface antiga não apresentava o briefing como uma etapa separada.

A correção do aplicativo detecta pedidos explícitos de logo/capa/perfil/foto antes de reservar qualquer texto e seleciona a rota de imagem. O servidor de texto rejeita uma solicitação explícita de imagem com 422 e sem consumo. Briefings sugeridos pelo texto têm botão para preparar a imagem; a geração só começa após clique do proprietário. Falhas não exibem fallback local como resultado de IA. Nenhum novo build/consulta do agente Lovable foi necessário.

## Sequência restante

1. Sites v19, modo convite e cadastro direto já estão configurados e comprovados pela API real. Testar uma conta nova pelo cadastro normal, sem enviar confirmação. Nunca rotacionar `AUTH_SESSION_KEY`, apagar usuários ou expor convite na API/GitHub.
2. Validar **uma imagem real** pela pizzaria autenticada. Não repetir texto: os dois resultados acima já comprovam esse fluxo. Registrar claim, estado, prévia e bytes no R2; aplicar somente ao rascunho aprovado, preservando preços/Pix. Não criar sessão falsa, extrair selos D1 nem simular o proprietário. O dono está autenticado no celular e pode iniciar o pedido normal.
3. Realizar entrega e chat com dois celulares. As migrações estão aplicadas; o fluxo completo ainda precisa de validação. Web Push com app fechado, recuperação de senha real, trial persistente/fiscalizado, Asaas e Netlify permanecem pendentes.

Não declarar imagem ou cadastro externo funcionando somente com mocks/configuração. Os 129 testes e typecheck desta correção passaram; a publicação e provas reais posteriores devem ser registradas em `CONTINUAR.md`.

## Publicação da correção de destino — v19

Sites v19 publicada em 12/10/2026 às 02:18:30.023 UTC, fonte `7b609fe29aed01a5195a9f8df3e05da8f395133c`, ambiente revisão 6, implantação `appgdep_6acc435cfc788191968ed813789fb57e`. PR #6 integrada à main em `8f4bc7fa813ceedc93f47087095a132a6969f7c9`. Os dois endpoints Lovable e suas flags permaneceram iguais e ativados. Não houve nova chamada ao agente Lovable nem geração paga do agente.

Os registros ainda mostram dois textos completos e quatro imagens antigas canceladas. O proprietário recebeu a instrução de atualizar o celular e fazer uma única geração de logo; não declarar que essa imagem funcionou até observar seu job/claim/bytes e aplicação. O cadastro foi retirado do modo de protótipo. A configuração Supabase inicialmente bloqueava o acesso direto; Confirm email foi desativado e salvo após aprovação explícita do dono, e o GET real confirmou `directSignup:true` em 12/10 às 02:57:06.934 UTC. Uma conta nova ainda precisa ser validada pelo formulário. As duas lojas e o perfil existente permaneceram iguais na comparação completa depois da publicação.

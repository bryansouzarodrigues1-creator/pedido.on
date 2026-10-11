# IA em produção — diagnóstico de 11/10/2026

## Estado confirmado

- Sites continua na versão **17**, fonte `b8ba77bb6b93498b0f686151ee318958236a2ae7`, ambiente revisão **5**, público.
- GitHub `main` conferida em `0bdfe38df88430da5656cf64603d8cef4a06b55b`: PRs #2, #3 e #4 integradas. PR #1 Asaas permanece separada.
- Lovable ativa: projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, URL https://pedido-on-estudio.lovable.app, fonte remota `81b09ac97be1ddfa62ec5ff60fb63fe6094a5221`.
- `PEDIDO_STUDIO_ENDPOINT` aponta para `/api/pedido-on/studio` nessa URL e `PEDIDO_IMAGE_ENDPOINT` para `/api/pedido-on/image`. As duas flags estão `true` em produção. Valores secretos não foram exportados nem alterados.
- D1 confirma tentativas de texto e imagem canceladas, sem resultado e sem resgate da autorização. As tabelas das migrações `0007_delivery_approval` e `0008_order_chat` ainda não existem na publicação atual.

## Evidência e causa

O POST de texto de **11/10/2026 às 19:35:49 UTC**, request ID `11085ae7c41da2c9d91bb402b94e511d`, recebeu **401** do serviço Lovable e terminou em 503 no aplicativo. Não há POST do serviço para `/api/ai/studio/claim` no período correspondente. O D1 registrou `cancelled`, sem descontar a sugestão.

Os handlers remotos foram lidos diretamente na Lovable. O projeto usa Nitro com destino Cloudflare. Reproduzir esses arquivos no workerd devolveu `401 claim_denied` com **zero requisições externas**.

Há dois bloqueios no serviço:

1. `deps.fetch(...)` chama a função nativa com o objeto de dependências como receptor. O workerd lança `TypeError: Illegal invocation`, ocultado pelo catch que retorna `claim_denied`. Ligar a função a `globalThis` permite que o POST alcance o callback.
2. Os quatro envios ainda usam `redirect: "error"`, incompatível com o workerd: callback e gateway, para texto e imagem. A correção anterior abrangia apenas o aplicativo Sites. Agora o serviço usa `manual`; status diferente de 200 no callback e respostas não OK do modelo continuam rejeitados, sem seguir redirecionamentos.

## Correção preparada

Somente os dois handlers do serviço, suas verificações e esta documentação foram ajustados. Tokens continuam de uso único, protocolos e modelos fixos, prazos e ausência de repetição automática preservados. Nenhuma chave, conta, sessão, dado de negócio, preço ou Pix foi modificado.

Os novos testes da raiz executam os handlers no **workerd real local**, com callback e modelo **simulados**. Cobrem texto e bytes de imagem, apenas um envio por etapa, rejeição de redirects no callback e no gateway, capacidade vencida/repetida e ausência de repetição em 402/429/5xx. Não constituem prova de geração paga ou de uma sessão real de produção.

Verificações desta correção: **121 testes da raiz** passaram (incluindo quatro novos testes do serviço, três deles em workerd), **7 testes de protocolo** do serviço passaram e os **13 testes de imagem** passaram com o runner Vitest 3.2.7 já disponível localmente, sem instalar dependências. Typecheck da raiz e checagem TypeScript estrita dos dois handlers passaram. O build completo do serviço com suas dependências próprias permanece para a implantação Lovable.

## Sequência restante

1. Autorizar uma única edição econômica na Lovable: sincronizar os dois handlers preparados, executar testes e build, sem Max, compra, geração paga, mudança de chave ou banco. A aceitação anterior dos 4 créditos refere-se à etapa já consumida; uma edição nova tem consumo novo.
2. Publicar o serviço existente. Enviar uma solicitação com formato válido, mas UUID aleatório inexistente e token inválido, a cada endpoint. Essa solicitação deve alcançar o claim do Sites, ser negada no D1 e não chamar modelo. Confirmar o callback nos logs reais; um health 200 ou um POST malformado 400 não prova isso.
3. Com a conexão comprovada e autorização de custo, validar **no máximo um texto e uma imagem** pela pizzaria autenticada. Registrar request IDs e estados, prévia e imagem no R2; reaproveitar os resultados nos demais testes. Aplicar somente ao rascunho aprovado, preservando preços/Pix e sem publicar conteúdo automaticamente.
4. Implantar a atualização Sites pelo fluxo oficial, no mesmo projeto, após validação e backup apropriado para as migrações adicionais. O GitHub e a Lovable não implantam o Sites automaticamente.

Não declarar a IA funcionando até concluir a geração real e a aplicação ao rascunho. Continuam pendentes testes com dois celulares, migrações de entrega/chat, Web Push com app fechado, entrega real de recuperação de senha, persistência/fiscalização do trial, Asaas e a migração Netlify.

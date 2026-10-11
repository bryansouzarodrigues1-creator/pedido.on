# Ativar a IA do estúdio sem refazer o site

O aplicativo principal já contém o chat, a revisão, a aplicação ao rascunho, a calculadora pública e o visual SaaS. A modalidade **Estilos** funciona sem modelos. A modalidade **IA** ainda está desativada. Não foi gasto crédito de construção ou de geração nesta atualização.

## Fontes e workspace

O serviço de imagens publicado continua no projeto Lovable `c1919edd-8b5e-40f8-b646-9ccd9c69e01f`, workspace `pidO24xJbN1TAzXmLHwH` (**Bryan’s Lovable**, Free). A outra área `workspace_01kn20zmepfahsq3q7xa36ct6h` (**BRYAN’s Lovable**, Pro) está acessível e sem projetos. O usuário informou uma recarga de 30 créditos nessa outra área; o plugin não expõe o saldo, portanto ele não foi confirmado pelo sistema.

Copiar ou publicar a raiz inteira na Lovable recriaria desnecessariamente o aplicativo. A fonte preparada em `services/image-service` contém o novo chat de textos/visual e a extensão de fotos de produtos; ela deve ser incorporada somente ao serviço existente ou a uma cópia desse serviço na área correta. O banco e o Supabase Auth do aplicativo principal não precisam ser recriados.

## Uma intervenção agrupada, depois da autorização de custos

1. Confirmar no painel que o saldo pertence à área Pro. Não comprar créditos nem habilitar recarga automática.
2. Usar a operação de remix da Lovable para copiar o serviço existente para essa área, mantendo o original disponível. O plugin não oferece mudança direta de workspace. Conferir custos aplicáveis antes de executar o remix.
3. Incorporar em uma única intervenção, sem Max, somente o servidor e a rota novos, a extensão de imagem e seus testes. Reutilizar a implementação deste repositório, sem solicitar uma reconstrução livre do produto:
   - `src/lib/pedido-studio.server.ts`
   - `src/routes/api/pedido-on/studio.ts`
   - `src/lib/pedido-image.server.ts`
   - `scripts/check-studio.mjs` e script `test:studio` do `package.json`
   - Regeneração da tabela de rotas TanStack para incluir `/api/pedido-on/studio`.
4. Executar testes simulados, a verificação de tipos e o build do serviço. A chave `LOVABLE_API_KEY` permanece gerenciada e somente no servidor. Não fazer geração real nessa intervenção.
5. Publicar o serviço e verificar os dois endpoints GET, que não geram texto nem imagens. Conferir URLs e configuração retornadas antes de trocar os endpoints no aplicativo.
6. Com autorização, usar uma mensagem curta e, separadamente, uma imagem para medir consumo real e revisar qualidade. Esses testes consomem Run credits e não estão incluídos implicitamente em uma autorização somente de construção.
7. Alterar os dois endpoints na hospedagem, ativar `PEDIDO_STUDIO_ENABLED` e preservar cotas, Supabase, sessão, D1/R2, audience público e cobrança desligada.

O consumo da construção é variável; o plugin não aceita um teto financeiro por mensagem. Não garantir que a execução consumirá uma quantidade exata dos 30 créditos. A IA em uso também consome saldo, com limites de tentativas no aplicativo, modelo fixo, saída limitada e sem repetição automática de chamadas pagas. Medir custo antes de oferecer geração ilimitada a clientes.

## O que foi verificado

- Aplicativo: 88 testes passaram, incluindo SQL real das migrações, isolamento por proprietário, sessão/pedidos/Pix, cálculo, aplicação de identidade, cotas, idempotência, claim e retorno inválido. Provedores externos simulados.
- Serviço preparado: 7 testes adicionais passaram sem rede real; chave ausente, entrada inválida, claim recusado, modelo e limite fixos, falta de saldo, falha/truncamento, resposta exagerada e foto de produto.
- O envio real ao modelo, o custo dos créditos, a publicação do novo serviço e a validação visual em navegador/celular seguem pendentes. O plugin de controle de navegador não estava disponível nesta execução; não foram inventadas capturas ou resultados de navegação.

Referências atuais: [Lovable AI](https://docs.lovable.dev/features/ai) e [Lovable Cloud](https://docs.lovable.dev/features/cloud). O saldo e a cobrança devem ser verificados na área escolhida; documentação não comprova o saldo da conta.

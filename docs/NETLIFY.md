# Preparação para a Netlify

O código está preparado para usar a Netlify como **endereço público** do pedido.on. Esta preparação não implantou a Netlify nem alterou o site publicado. O aplicativo continua na versão 17 em `https://forno-cardapios.waves4845.chatgpt.site`.

## Como será hospedado

| Parte | Onde continua |
| --- | --- |
| Endereço público, encaminhamento e HTTPS | Netlify, com gateway assinado |
| Páginas React/Vinext, painel e API | Aplicativo atual em Sites/Workers |
| Pizzarias, pedidos, sessões, limites e preços | D1 atual |
| Imagens e comprovantes privados | R2 atual |
| Contas e senhas | Supabase Auth atual |
| Criação de textos e imagens | Serviço Lovable atual |

Isso é uma entrada Netlify conectada ao servidor atual. **Não é uma migração completa do servidor, banco ou arquivos para a Netlify.** O Vinext usa bindings `cloudflare:workers`, D1 e R2; publicar somente `dist/client` perderia as páginas dinâmicas e as funções do negócio. Não desligue o site atual.

O gateway encaminha páginas, arquivos, RSC, APIs, cookies e uploads, mantendo o novo domínio no navegador. A assinatura vincula URL, método, corpo, origem, IP e cabeçalhos de autenticação. O servidor só aceita o domínio HTTPS cadastrado e uma assinatura recente. Cabeçalhos de identidade ChatGPT e de encaminhamento enviados pelo visitante são removidos. As regras existentes de propriedade, CSRF, Pix e cota de IA continuam valendo.

Uploads passam por Edge Functions para preservar comprovantes de até 5 MB. As rotas de criação usam uma Function Node separada: a Netlify documenta 60 segundos por chamada; o gateway espera até 55 segundos. Não existe repetição automática de uma geração. Se o tempo acabar, o painel mantém o mesmo `requestId` e oferece **Ver resultado**. O servidor conserva a chamada já iniciada com `waitUntil`, dentro do limite da plataforma; chamadas excepcionalmente demoradas ainda precisam ser conferidas. As demais rotas têm espera de 25 segundos.

## Valores para configurar depois

Gere uma chave nova de conexão com 32 bytes aleatórios em hexadecimal. Ela é diferente de `AUTH_SESSION_KEY`; a chave das sessões permanece intacta. Não coloque a chave em commits, mensagens, arquivos públicos ou variáveis `NEXT_PUBLIC_*`/`VITE_*`.

| Variável | Netlify | Servidor atual |
| --- | --- | --- |
| `PEDIDO_PUBLIC_ORIGIN` | URL HTTPS principal, sem caminho, exemplo `https://pedido-on.netlify.app` | O mesmo valor |
| `PEDIDO_PROXY_SECRET` | Nova chave de conexão, 64 caracteres hexadecimais | A mesma chave |
| `PEDIDO_BACKEND_ORIGIN` | `https://forno-cardapios.waves4845.chatgpt.site` | Não precisa |

Na Netlify, cadastre os três valores com escopos **Builds, Functions e Runtime**, disponíveis para Functions e Edge Functions. Não basta escrevê-los em `[build.environment]`: valores do `netlify.toml` não ficam automaticamente disponíveis às Functions. O build de produção bloqueia variáveis ausentes ou inválidas sem imprimir seus valores.

As chaves Supabase, Lovable, sessão e pagamentos ficam nas hospedagens atuais. Não copie todas as variáveis para a Netlify. Não ativar Stripe ou importação OpenAI como parte desta mudança.

## Ordem da implantação futura

1. Criar o projeto Netlify ligado a `bryansouzarodrigues1-creator/pedido.on`, branch `main`, e definir seu endereço principal. As configurações abaixo já estão no `netlify.toml` da raiz. Ainda não direcionar clientes para esse endereço.
2. Configurar os três valores acima na Netlify. O pacote separado evita a detecção indevida do aplicativo principal como um Next.js convencional.
3. Publicar a preparação do servidor pelo fluxo oficial Sites, no mesmo projeto/audiência, e cadastrar nele `PEDIDO_PUBLIC_ORIGIN` e `PEDIDO_PROXY_SECRET`. Preservar as demais variáveis, D1/R2, Supabase, lista de teste e chave de sessões. **Esta etapa ainda não foi executada.**
4. No Supabase, acrescentar os URLs exatos do novo domínio à lista de redirecionamento: `/redefinir-senha` e `/api/auth/google/callback/*` (nonce do fluxo). Manter os URLs atuais durante a transição. Conferir o provedor Google e o domínio de CAPTCHA se esses recursos estiverem ativos. Não liberar todos os subdomínios `*.netlify.app`.
5. Implantar a entrada Netlify e executar a conferência sem geração paga: `pnpm check:netlify --live https://seu-endereco.netlify.app`.
6. Conferir no navegador login por e-mail, recuperação, cardápio publicado, pedido, Pix/comprovante privado, uma geração autorizada, **Ver resultado**, aplicação no rascunho e publicação. Só depois divulgar o novo endereço ou apontar o domínio próprio.

| Campo de build | Valor |
| --- | --- |
| Base directory | `deploy/netlify` |
| Build command | `node ../../scripts/prepare-netlify.mjs` |
| Publish directory | `public` (relativo à base) |
| Functions directory | `netlify/functions` (relativo à base) |
| Node.js | 24 |

Não usar `pnpm build` da raiz como build Netlify: esse comando produz o Worker Sites. `pnpm build:netlify` prepara somente a entrada Netlify. O cliente e o serviço Lovable não precisam ser reconstruídos por essa entrada.

## Domínio, contas e histórico

- Cookies ficam no novo domínio. O usuário entra novamente por Supabase; suas pizzarias e pedidos continuam no D1 com o mesmo proprietário. Sessões ChatGPT de Sites não são um login disponível na Netlify. Se existir loja vinculada a um proprietário ChatGPT, manter seu acesso no site atual e planejar uma transferência explícita de propriedade antes de migrar esse usuário.
- A calculadora permanece sem cadastro. Seu histórico usa armazenamento do navegador por domínio: os cálculos do endereço antigo não aparecem automaticamente no novo. O download em texto no site antigo permite guardar uma cópia.
- Os links antigos de cardápio e acompanhamento continuam no servidor atual. Os novos links usam o domínio Netlify. O serviço Lovable continua fazendo claim no servidor atual; não alterar seus endpoints nem gastar créditos de construção por causa do novo endereço.
- Deploy previews não recebem autorização automática para usar contas e dados de produção. O gateway exige o endereço principal configurado; não cadastrar previews com curingas.
- Se a Netlify falhar, voltar a divulgar o endereço Sites atual. Retirar as duas variáveis da ponte desativa o acesso assinado sem alterar dados ou sessões existentes.

## Verificação local e limites

```sh
pnpm test
pnpm typecheck
pnpm build:netlify
pnpm check:netlify
pnpm build
```

Os testes novos usam respostas e contas simuladas e o runtime Workers real para a assinatura. A conferência `--live` faz somente GETs: inicial, calculadora, saúde da conexão e saúde da IA. Não cria conta, não envia e-mail/pedido, não faz claim e não gera imagem/texto. A implantação Netlify e os testes reais de navegador permanecem para a etapa seguinte.

Na preparação de 11/10/2026 passaram 103 testes (10 novos do gateway), typecheck, build do aplicativo, preparação Netlify, lockfile separado e empacotamento das funções Edge/Node. O build de produção também foi conferido: bloqueia configuração ausente e aceita os três valores válidos de teste. Não houve novas chamadas pagas nem créditos Lovable usados nessa preparação.

Uma conferência adicional executou o aplicativo compilado no Workers local com D1/R2 de teste, passando pela conexão assinada: `/api/hosting`, `/api/auth/config`, `/calculadora`, `/` e `/assets/pizza.webp` retornaram 200. A origem pública foi preservada, a saúde confirmou a ponte e o cookie CSRF seguro foi mantido. Essa evidência é local; não representa uma implantação Netlify ou acesso aos dados de produção.

Referências oficiais consultadas em 11/10/2026: [Monorepos](https://docs.netlify.com/build/configure-builds/monorepos/), [Functions e limites](https://docs.netlify.com/build/functions/configuration/), [API e streaming](https://docs.netlify.com/build/functions/api/), [Edge Functions](https://docs.netlify.com/build/edge-functions/api/), [assinaturas Workers](https://developers.cloudflare.com/workers/examples/signing-requests/).

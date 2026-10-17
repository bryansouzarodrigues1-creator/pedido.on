# Pizzaria.on — Cloudflare GitHub Builds (staging isolado)

Data de configuração: 17/10/2026. Este documento registra a infraestrutura criada no Cloudflare **sem trocar o Sites**.

## Conexões verificadas

- Repositório-fonte: `bryansouzarodrigues1-creator/pedido.on`.
- Repositório vinculado à integração Cloudflare GitHub.
- Worker exclusivo de staging: `pizzaria-on-backend-staging-20261017`.
- Branch monitorada: `infra/cloudflare-staging-deploy-gated-20261017`, **não** `main`.
- Build: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm build`.
- Deploy: `corepack pnpm exec wrangler deploy --config dist/server/wrangler.json`.
- Código de entrada: `build/self-hosted-worker.ts`, compilado pelo Vinext.
- D1: `pizzaria-on-staging-20261017`, ID `1d4b48d1-7689-4a1e-a9ea-d85a2983fa9a`.
- R2: `pizzaria-on-staging-private-20261017` (classe Standard, sem domínio público).
- Previews e subdomínio público do Worker: **desativados**.
- PR #47: proteção de segurança integrada ao backend; testes, TypeScript, Chrome e Windows aprovados.

## Segurança obrigatória

O Worker independente executa `standaloneLaunchGate` **antes** da camada Vinext, de autenticação, dos bancos, das imagens e dos pagamentos.

A menos que `PEDIDO_INDEPENDENT_LAUNCH_GATE` seja `reconciled-and-approved`, **todos** os métodos e endpoints retornam HTTP 503. O retorno de `/healthz` também é 503 e deixa claro que o aplicativo não está pronto. A configuração de build define `PEDIDO_INDEPENDENT_LAUNCH_GATE=locked` e mantém IA, Studio e billing desativados. Não remover essa trava para executar smoke público.

Não habilitar `reconciled-and-approved` até conciliar/exportar o D1 atual do Sites, restaurar os objetos privados R2, configurar Supabase Auth/segredos por canal seguro, testar isolamento entre pizzarias, login real, pedidos, imagens e pagamentos em staging e receber autorização separada para o corte. Nem o GitHub CI verde nem a implantação do Worker comprovam essas condições.

## Dados atuais

A Cloudflare possui somente o snapshot parcial de 13/10 (16 registros recuperados), enquanto o sistema Sites continuou avançando depois dessa data. Não sobrescrever com backup antigo e não importar usuários/sessões do Supabase à força. O R2 novo **não** possui os arquivos privados antigos. O sistema atual permanece:

https://forno-cardapios.waves4845.chatgpt.site/criar

Galeria visual Lovable publicada:

https://pizzaria-on-estilos.lovable.app

Essa galeria ainda transfere briefing manualmente para o Sites, não executa CRUD próprio.

## Operação

- O pipeline só acompanha a branch de staging. Novas mudanças na main não são implantadas nele automaticamente.
- GitHub Actions realiza testes e build offline; Cloudflare Workers Builds realiza build/deploy na nuvem. Sem necessidade de computador pessoal ligado.
- Evitar compartilhar variáveis de autenticação, tokens de deploy, backups SQL, URLs assinadas de mídia ou credenciais em GitHub, prompts e logs.
- O Worker pode permanecer privado durante os testes. Não criar rota pública, trocar webhook ou divulgar staging como site operacional.
- A Cloudflare possui cobrança por excedente de R2 e outros serviços; monitorar uso e alertas de faturamento.

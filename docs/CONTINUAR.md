# Continuar o pedido.on

Este repositório reúne o aplicativo publicado e uma cópia completa do serviço de imagens. O registro de origem está em `source-provenance.json`; os hashes de cada arquivo estão em `source-files.json`.

## Estado preservado

| Área | Implementação | Validação pendente |
| --- | --- | --- |
| Cardápio | Quatro layouts, editor por loja, URL `/p/<slug>`, rascunho e publicação | Revisão final em celular e desktop |
| Pedidos | Totais no servidor, carrinho, meio a meio, entrega/retirada, WhatsApp manual | Operação acompanhada com uma pizzaria de teste |
| Pix | Chave por loja, comprovante privado, conferência manual, aprovação e previsão | Conferência de um pagamento real pela loja |
| Acesso | Supabase Auth, sessão protegida, cadastro direto, login, recuperação e logout | Cadastro/login e recuperação com conta e e-mail reais |
| Identidade | Estilos locais, exportação PNG e aplicação após revisão | Revisão visual da identidade desejada |
| Imagens IA | Serviço Lovable, token de uso único, cotas e proteção contra duplicidade | Uma geração real autorizada, medição do custo e aplicação do arquivo |
| Mensalidades | Integração Stripe e webhook preparados | Configuração comercial e teste em sandbox; cobrança desativada |
| Importação IA | Implementação OpenAI preservada | Desativada; não exige configurar OpenAI para usar o restante |

O aplicativo principal está em `https://forno-cardapios.waves4845.chatgpt.site`; o serviço de imagens está em `https://pedido-on-imagens.lovable.app`. Copiar o código para o GitHub não troca a hospedagem nem configura sincronização automática da Lovable.

## Primeiros passos no próximo desenvolvimento

1. Ler `README.md`, `docs/ARQUITETURA.md` e `docs/IMAGENS.md`.
2. Instalar as dependências com os lockfiles existentes e executar `pnpm test` e `pnpm typecheck`.
3. Preservar o projeto Supabase `lxavrmzafumqmbswtfbe`, a chave interna de sessão e os bindings de armazenamento existentes. Não criar um segundo sistema de contas.
4. Conferir **Confirm email** no Supabase: a regra autorizada para este protótipo é cadastro direto, sem confirmação, com e-mail somente em **Esqueci minha senha**. O servidor exige `mailer_autoconfirm=true` antes de cadastrar. Configurações externas não foram alteradas durante esta exportação.
5. Manter o protótipo restrito a `PEDIDO_AUTH_TEST_EMAILS` até validar o ciclo externo. Testar cadastro, recarga, login, logout, recuperação no mesmo navegador e acesso negado entre duas lojas.
6. Antes de gastar créditos Lovable ou iniciar uma geração paga, apresentar o custo e obter autorização do proprietário. Testes com mocks e consultas de saúde não geram imagens.

## O que os testes comprovam

Os testes do aplicativo executam SQL das migrações em SQLite e adaptadores de D1/R2, verificam permissões entre lojas, pedidos/Pix, autenticação, recuperação, cookies, cálculos, cobranças e cotas de IA. Provedores externos são simulados. Eles não comprovam entrega de e-mail, pagamento recebido, OAuth real nem custo de geração.

O serviço inclui testes de rotas e do protocolo de imagem. O arquivo `src/lib/pedido-image.test.ts` usa respostas simuladas; nunca chama o gateway real.

## Publicar a partir deste código

O diretório raiz é um aplicativo Vinext para Cloudflare Workers, com bindings `DB` e `BUCKET`. Não é um site estático. A publicação atual pertence ao projeto Sites registrado em `.openai/hosting.json`. No ambiente Sites, use o fluxo oficial de abertura, verificação, sincronização da fonte e publicação para esse mesmo projeto.

O GitHub contém o código, os ativos estáticos e as migrações. Dados de produção, uploads de clientes, comprovantes, sessões e segredos permanecem nos serviços de armazenamento e autenticação. Migrar a hospedagem exige planejar esses dados, os bindings, o acesso interno da plataforma e as URLs de retorno antes de mudar o domínio.

O serviço em `services/image-service` é uma cópia do projeto Lovable, não uma conexão GitHub configurada pelo plugin. Não conecte automaticamente a raiz deste monorepositório ao projeto Lovable: a raiz contém outro aplicativo. Para mudar o serviço, trabalhe na pasta correta e use o mecanismo de publicação aprovado para esse serviço. Preserve o histórico já publicado.

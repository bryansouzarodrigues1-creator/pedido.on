# pedido.on

> **Atualização de produção — 11/10/2026:** a IA do estúdio foi conectada e habilitada no aplicativo principal. Serviço publicado: https://pedido-on-estudio.lovable.app, projeto Lovable `aa27093c-2768-41f2-8274-923fdfe2b5ff`, workspace Pro `workspace_01kn20zmepfahsq3q7xa36ct6h`, commit `81b09ac97be1ddfa62ec5ff60fb63fe6094a5221`. O original permanece disponível. Os endpoints de texto e imagem do aplicativo agora apontam para o serviço novo; ambas as flags estão habilitadas. A versão 16 do Sites foi republicada com revisão de ambiente 5, implantação concluída. A Lovable verificou GETs públicos 200/application-json/configured=true e POSTs com tokens desconhecidos 401/claim_denied. Passaram 7 testes de protocolo e 14 testes existentes, typecheck e build do serviço. A atualização e a verificação consumiram 3,8 créditos de construção informados pelo plugin. Não houve geração real. O teste de um texto e uma imagem por uma loja autenticada permanece pendente; o acesso HTTP direto deste ambiente foi bloqueado. Preservar cotas e publicação após revisão. O texto abaixo registra o planejamento/estado anterior, quando mencionar IA desativada ou ativação pendente.


Plataforma de cardápios digitais para várias pizzarias, com quatro layouts, painel por proprietário, pedidos, Pix com aprovação manual e criação de identidade visual.

Este repositório reúne o aplicativo principal e o serviço de imagens da Lovable. A fonte do aplicativo corresponde à versão publicada **v16**, commit `b8cbe68b5fc7720c4543453709eefd560e4ec1ac`. O serviço tem como origem o commit `4578d1cc508cfc850946fcf882bab3032288ab18`, com uma extensão de chat/fotos preparada aqui e ainda não publicada na Lovable.

**Aplicativo:** [forno-cardapios.waves4845.chatgpt.site](https://forno-cardapios.waves4845.chatgpt.site) · **Serviço de imagens:** [pedido-on-imagens.lovable.app](https://pedido-on-imagens.lovable.app)

## Funcionalidades

- Visual SaaS compacto em carvão/vermelho, com painel operacional e foco em pizzarias.
- Calculadora pública em `/calculadora`, sem conta, com projeção de resultado, preço, equilíbrio e cenários salvos no navegador.
- Estúdio em um chat, com estilo, cor, chamada, textos e briefing de imagens na mesma prévia. Aplicação ao rascunho antes de publicar; IA de textos ainda depende da ativação autorizada.


- Cardápios em `/p/<slug>`, com estilos Artesanal, Essencial, Noturno e Família.
- Painel com Vendas, Cardápio e Minha loja; produtos com ou sem foto, tamanhos, bordas, preços, entrega e pagamentos.
- Rascunho e publicação separados, com proteção contra sobrescrita entre abas.
- Pizzas inteiras ou meio a meio; preços, descontos e entrega recalculados no servidor.
- Cliente pede sem criar conta e acompanha pelo link privado. A mensagem de WhatsApp tem envio manual.
- Pix com chave própria da pizzaria, comprovante privado, conferência humana, aprovação, prazo e acompanhamento.
- Contas e senhas pelo Supabase Auth, sessões protegidas e autorização das lojas no servidor. Cadastro direto; e-mail somente na recuperação.
- Identidade local com exportação PNG e serviço de imagens Lovable separado, com cotas e revisão antes de publicar.
- Integrações Stripe e importação de cardápio OpenAI preservadas, atualmente desativadas.

## Estrutura e dados

| Diretório ou serviço | Responsabilidade |
| --- | --- |
| `app/`, `components/`, `lib/` | Aplicativo: React, TypeScript, Vinext e Cloudflare Workers |
| `db/`, `drizzle/` | Esquema e migrações do D1 |
| `build/`, `scripts/`, `.openai/hosting.json` | Integração e execução da hospedagem atual |
| `public/` | Símbolo da marca, logos e imagens estáticas |
| `services/image-service/` | Fonte completa do servidor TanStack Start/Lovable |
| Supabase Auth | Usuários e senhas, projeto `lxavrmzafumqmbswtfbe` |
| D1 e R2 | Dados do negócio, sessões protegidas, imagens e comprovantes |

## Desenvolvimento do aplicativo

Use **Node.js 24** e o **pnpm 11.25.0** definido em `package.json`. Instale a versão de pnpm correspondente usando o método disponível no seu ambiente.

```sh
git clone https://github.com/bryansouzarodrigues1-creator/pedido.on.git
cd pedido.on
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm test
pnpm typecheck
pnpm dev
```

O ambiente local usa emulação de D1/R2 e a integração de desenvolvimento presente no código. O acesso interno simulado serve apenas ao desenvolvimento; teste o fluxo Supabase com credenciais de teste e ambiente próprio. `.env.example` contém nomes e exemplos, sem segredos. Configure valores reais somente em arquivos ignorados ou no ambiente da hospedagem.

```sh
pnpm build
pnpm start
```

`start` executa localmente o Worker produzido pelo build. A publicação atual usa Sites e preserva seu projeto, bindings e fluxo oficial; veja [como continuar](docs/CONTINUAR.md). Outra hospedagem exige configurar os serviços e transferir os dados separadamente do código.

## Serviço de imagens

O serviço possui suas próprias dependências e seu `bun.lock`. Use Bun para instalação com lockfile congelado; os comandos e o protocolo estão em [docs/IMAGENS.md](docs/IMAGENS.md). A chave gerenciada da Lovable pertence somente ao servidor desse serviço e não é exportada.

O protótipo limita imagens a **3 tentativas por proprietário/mês** e **2 por dia na plataforma inteira**. Geração real consome saldo; o próximo teste pago depende de autorização do proprietário. A identidade por estilos locais funciona sem geração por IA.

## Guias

- [Ativar a IA do estúdio, custos e workspace](docs/ATIVAR_ESTUDIO.md)
- [Fluxo e proteção do estúdio](STUDIO.md)
- [Cálculo, escopo e armazenamento de cenários](CALCULADORA.md)
- [Estado atual e próximos passos](docs/CONTINUAR.md)
- [Arquitetura e armazenamento](docs/ARQUITETURA.md)
- [Geração de imagens, custos e limites](docs/IMAGENS.md)
- [Cadastro, Google e ativação das integrações](ATIVACAO.md)
- [Recuperação de senha e e-mails](EMAIL_SUPABASE.md)
- [Fluxo de pedidos com Pix](FLUXO_PEDIDOS.md)

Os testes usam provedores simulados e SQL real das migrações. Não substituem testes externos de e-mail, OAuth, pagamento ou geração. A validação visual final no celular e o ciclo externo de autenticação permanecem registrados no guia de continuidade.

O repositório contém código, ativos estáticos, lockfiles, migrações, templates e testes. Dados de clientes, uploads, comprovantes, sessões, chaves e bancos de produção permanecem nos serviços existentes.

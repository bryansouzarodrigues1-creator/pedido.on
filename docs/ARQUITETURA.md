# Arquitetura do pedido.on

## Aplicativo principal

React e TypeScript com rotas App Router, executados por Vinext/Vite em Cloudflare Workers. A integração de hospedagem fica em `build/`, `scripts/` e `.openai/hosting.json`; esses arquivos fazem parte do código necessário para executar e publicar o aplicativo.

| Responsabilidade | Local |
| --- | --- |
| Telas e endpoints | `app/` |
| Painel, cardápio e componentes | `components/` |
| Regras, acesso, preços e integrações | `lib/` |
| Esquema D1 e acesso ao banco | `db/` |
| Migrações SQL e snapshots | `drizzle/` |
| Logos e imagens estáticas da plataforma | `public/` |
| E-mail de recuperação | `email-templates/recuperacao.html` |
| Testes do domínio e das rotas | `scripts/check-*.test.mjs` |

## Identificação e armazenamento

Supabase Auth identifica o dono da pizzaria e gerencia suas senhas. O projeto atual é `lxavrmzafumqmbswtfbe`. A integração usa HTTPS e chave publicável, sem `service_role`.

Os dados do negócio ficam no **D1**, não no Postgres do Supabase. Isso inclui lojas, cardápios, pedidos, dados necessários dos clientes, sessões protegidas, assinaturas e registros de geração. Os tokens Supabase são criptografados no servidor com `AUTH_SESSION_KEY`; senhas não são persistidas no D1. Cookies de sessão são HttpOnly e protegidos em HTTPS. A conta interna da plataforma usa a identificação fornecida pela hospedagem e preserva o acesso aos dados existentes.

Imagens enviadas e geradas ficam no **R2**. Comprovantes passam por autorização específica; conhecer um nome de arquivo não concede acesso a comprovantes de outra loja. O cliente acompanha seu pedido com um link privado com validade, sem criar uma conta de proprietário.

Cada operação administrativa verifica o proprietário da loja no servidor. Totais são recalculados a partir do cardápio vigente. Revisões protegem rascunhos contra sobrescrita por outra aba; a publicação é uma ação explícita.

## Serviços externos

| Serviço | Função | Credencial |
| --- | --- | --- |
| Supabase | Contas e senhas | URL e chave publicável no servidor principal |
| Lovable | Geração de logo, capa e perfil | Chave gerenciada somente no servidor de imagens |
| Stripe | Assinaturas da plataforma, quando ativadas | Segredos somente no servidor principal |
| OpenAI | Importação de cardápio, atualmente desligada | Chave opcional somente no servidor principal |

O WhatsApp recebe uma mensagem preparada em um link para envio manual. Não existe disparo automático nem integração ativa de WhatsApp Business API nesta versão. O Pix é recebido diretamente pela pizzaria; o painel registra a conferência humana, sem presumir que o comprovante prova recebimento bancário.

## Migrações

Execute as migrações em ordem; preserve seus nomes e conteúdos já aplicados. `pnpm db:generate` gera mudanças futuras a partir de `db/schema.ts`, mas não aplica automaticamente mudanças a um banco de produção. A hospedagem Sites aplica as migrações do pacote na publicação pelo seu fluxo oficial. A tabela `image_jobs` foi acrescentada por `0005_wonderful_umar.sql`.

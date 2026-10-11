# pedido.on

Cardápio digital para pizzarias, com pedidos, Pix conferido pela loja, criação de imagens e textos com IA e calculadora pública de preço e lucro.

**Publicado:** [forno-cardapios.waves4845.chatgpt.site](https://forno-cardapios.waves4845.chatgpt.site) · [Calculadora sem cadastro](https://forno-cardapios.waves4845.chatgpt.site/calculadora) · [Meu painel](https://forno-cardapios.waves4845.chatgpt.site/app)

## Estado atual — 11/10/2026

O aplicativo está na **versão 17**, fonte Sites `b8ba77bb6b93498b0f686151ee318958236a2ae7`, ambiente de produção revisão 5. O visual usa pizza real, carvão e vermelho, com menos ações e textos curtos. A navegação do painel é **Pedidos, Cardápio, Pizzaria e Criar com IA**. O cadastro inicial pede nome, WhatsApp e endereço do cardápio; a aparência pode ser ajustada depois.

A falha de IA foi reproduzida no runtime Cloudflare: `redirect: "error"` não é suportado e interrompia a chamada antes de chegar à Lovable. O aplicativo usa `redirect: "manual"`; retornos 3xx continuam rejeitados e o token de uso único não é encaminhado a outro endereço. Os erros diferenciam falhas antes e depois da autorização, com cota devolvida somente quando adequado.

O serviço ativo é [pedido-on-estudio.lovable.app](https://pedido-on-estudio.lovable.app), projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, workspace Pro `workspace_01kn20zmepfahsq3q7xa36ct6h`, commit `81b09ac97be1ddfa62ec5ff60fb63fe6094a5221`. Sua chave fica somente no servidor Lovable. O aplicativo e seus dados permanecem em Sites, D1/R2 e Supabase Auth.

## Funcionalidades

- Cardápios públicos em `/p/<slug>`, com pizzas, meio a meio, tamanhos, bordas, bebidas e combos. Preços, descontos e entrega são recalculados no servidor.
- Painel por proprietário, com revisão de produtos, pedidos, entrega, Pix e publicação. Rascunho e versão pública separados, com proteção contra sobrescrita entre abas.
- **Criar com IA** reúne visual, textos, logo, capa, perfil e fotos. Imagens podem ser pedidas diretamente, sem uma chamada de texto antes. O rascunho é salvo antes da solicitação; o resultado precisa ser revisado e aplicado antes de publicar.
- Estilos prontos opcionais: Forno a lenha, Clássico, Delivery e Família. Os IDs antigos de temas continuam válidos, preservando lojas existentes.
- **Calculadora em `/calculadora` sem login**: custo pronto, despesas, taxas, volume, preço sugerido e resultado estimado. Salvamento automático do preenchimento, até seis cálculos, cópia e download em texto. Dados ficam neste navegador.
- Cliente pede sem conta e acompanha pelo link privado do pedido. WhatsApp tem envio manual.
- Pix direto na chave da pizzaria: comprovante privado, conferência no banco, aprovação manual, prazo e acompanhamento.
- Supabase Auth, sessões protegidas e autorização por loja. Para este protótipo: cadastro direto, e-mail somente na recuperação, lista autorizada de contas de teste.
- Stripe e importação de cardápio OpenAI estão preservados e desativados; não são necessários para usar as demais funções.

## Estrutura

| Local | Responsabilidade |
| --- | --- |
| `app/`, `components/`, `lib/` | React, TypeScript, Vinext e Cloudflare Workers |
| `db/`, `drizzle/` | Esquema e migrações do D1 |
| `scripts/`, `.openai/hosting.json` | Verificação e hospedagem Sites |
| `public/` | Marca e imagens estáticas |
| `services/image-service/` | Serviço TanStack/Lovable; arquivos de servidor e rotas sincronizados com o commit ativo |
| Supabase Auth | Usuários e senhas; projeto `lxavrmzafumqmbswtfbe` |
| D1 e R2 | Negócio, sessões, imagens e comprovantes |

## Desenvolvimento

Node.js 24 e pnpm 11.25.0, conforme `package.json`.

```sh
git clone https://github.com/bryansouzarodrigues1-creator/pedido.on.git
cd pedido.on
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm test
pnpm typecheck
pnpm dev
```

Configure valores reais somente em arquivos ignorados ou no ambiente da hospedagem. Nunca exporte segredos ou dados de produção. O modo local usa emulação de D1/R2; não substitui testes externos de autenticação.

```sh
pnpm build
pnpm start
```

`start` executa o Worker local. Sites preserva o projeto de `.openai/hosting.json`. GitHub não publica automaticamente o aplicativo, nem conecta este monorepositório à Lovable.

## Entrada Netlify preparada

`netlify.toml` e `deploy/netlify/` preparam a Netlify como endereço público, conectada por assinatura ao aplicativo atual. Dados D1/R2, contas Supabase e serviço Lovable continuam nas hospedagens atuais. Não houve implantação Netlify nem mudança no site publicado.

```sh
pnpm build:netlify
pnpm check:netlify
# Depois de implantar, sem gerar IA:
pnpm check:netlify --live https://seu-endereco.netlify.app
```

O [guia Netlify](docs/NETLIFY.md) descreve os três valores do gateway, a publicação prévia da ponte no servidor, os redirecionamentos do Supabase e os testes do novo domínio. A base de build Netlify é `deploy/netlify`; o build da raiz continua sendo o Worker Sites. A preparação não migra banco nem desliga o endereço atual.

## IA e validação

**Produção de 11/10 — v18:** o 401 foi rastreado aos handlers do serviço Lovable, que chamavam `fetch` com receptor incorreto e ainda usavam `redirect: "error"`. A correção foi publicada na Lovable e os dois callbacks foram comprovados nos logs reais do Sites com tokens inválidos, sem chamar modelos. PR #5 integrada e Sites atualizado pelo fluxo oficial; migrações de entrega e chat confirmadas no D1. Passaram 121 testes do aplicativo, typecheck, build e os testes do serviço. A geração com loja autenticada, R2 e aplicação ao rascunho permanecem pendentes. Ver [evidências e pendências](docs/IA-PRODUCAO.md).

Cotas mantidas: imagens **3 por proprietário/mês e 2/dia na plataforma**; sugestões **20 por proprietário/mês e 20/dia na plataforma**. Cada geração nova consome saldo de IA. Não existe repetição paga automática; consultar o mesmo pedido reutiliza o resultado. Estilos prontos não usam modelos.

- **103 testes do repositório passaram**, incluindo 10 verificações da entrada Netlify, runtime Workers, proteção de cookies/origem e falhas de IA antes/depois do claim. Typecheck, build Sites, build da entrada Netlify e empacotamento das duas funções passaram. A Netlify ainda não foi implantada.
- Serviço: 7 testes de protocolo e 14 testes existentes passaram, assim como typecheck e build.
- Um teste real de texto e um de imagem passaram pelo gateway. Texto: 200, JSON, 577 bytes; imagem: 200, JPEG, 179.881 bytes. Apenas o claim do aplicativo foi simulado nesse teste interno; a proteção de produção continua obrigatória.
- Após publicar v17, consultas externas confirmaram `/` e `/calculadora` anônimos com 200, sem redirecionamento para login; `/api/platform?check=ai` retornou texto e imagens habilitados/conectados. Esse endpoint só consulta saúde, não gera conteúdo.
- Geração completa por uma loja autenticada e revisão visual no celular ainda precisam de validação acompanhada. Não houve navegador disponível nesta execução.

Nesta correção, Lovable informou **4,0 créditos de construção** (3,1 para diagnóstico/testes e 0,9 para a conferência final), além das duas chamadas reais de IA cujo custo unitário não foi informado. Não houve compra de saldo nem uso do modo Max da Lovable.

## Guias

- [Continuidade e validações pendentes](docs/CONTINUAR.md)
- [Preparação e implantação futura na Netlify](docs/NETLIFY.md)
- [Configuração atual da IA](docs/ATIVAR_ESTUDIO.md)
- [Criação com IA e proteção dos dados](STUDIO.md)
- [Calculadora pública](CALCULADORA.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Protocolo e limites de imagens](docs/IMAGENS.md)
- [Cadastro e integrações](ATIVACAO.md)
- [Recuperação de senha](EMAIL_SUPABASE.md)
- [Pedidos com Pix](FLUXO_PEDIDOS.md)

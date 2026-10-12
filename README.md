# pedido.on

Cardápio digital para pizzarias, com pedidos, Pix conferido pela loja, criação de imagens e textos com IA e calculadora pública de preço e lucro.

**Publicado:** [forno-cardapios.waves4845.chatgpt.site](https://forno-cardapios.waves4845.chatgpt.site) · [Calculadora sem cadastro](https://forno-cardapios.waves4845.chatgpt.site/calculadora) · [Meu painel](https://forno-cardapios.waves4845.chatgpt.site/app)

## Estado atual — 12/10/2026

Última publicação confirmada: **versão 20**, fonte Sites `5153cab4266fa7680de194336f686cdb9f367fcb`, ambiente revisão 6, PR #7 integrada. A criação começa em imagem e conserva o prompt do dono até o gerador. O cadastro por convite foi validado com acesso direto e login normal, sem confirmação de e-mail. Uma imagem real do pedido “Gere algo marcante de pizza de queijo” foi gerada pela Lovable, salva no R2 e aplicada ao rascunho privado de teste. Posteriormente, o dono mostrou a geração/prévia de uma pizza voando sob uma luz no seu celular; a aplicação/publicação dessa capa ainda não foi confirmada. As duas pizzarias e o perfil anteriores foram comparados e permaneceram iguais no teste. A navegação mantém **Pedidos, Cardápio, Pizzaria e Criar com IA**. A próxima evolução está em [planejamento de produto](docs/PAPEL-DA-IA.md), sem novas funções implementadas nesta etapa.

**Atualização preparada:** [leitura por foto no aparelho e promoção do dia](docs/LEITOR-CARDAPIO.md), com conferência em lote, retomada local, prévia de compra e mensagens prontas sem modelos pagos. O dono continua podendo cadastrar manualmente. OCR real passou em tabela, duas colunas e JPEG inclinado/escurecido; 151 testes e typecheck passaram, além de um build inicial. A publicação posterior deve ser registrada em `CONTINUAR.md`. Importação OpenAI continua desativada; esta entrega não usa essa rota nem o seu limite antigo de 35 itens. Leitura complementar Lovable e divulgação criativa permanecem futuras e dependem de orçamento justificado.

A falha de IA foi reproduzida no runtime Cloudflare: `redirect: "error"` não é suportado e interrompia a chamada antes de chegar à Lovable. O aplicativo usa `redirect: "manual"`; retornos 3xx continuam rejeitados e o token de uso único não é encaminhado a outro endereço. Os erros diferenciam falhas antes e depois da autorização, com cota devolvida somente quando adequado.

O serviço ativo é [pedido-on-estudio.lovable.app](https://pedido-on-estudio.lovable.app), projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, workspace Pro `workspace_01kn20zmepfahsq3q7xa36ct6h`, commit publicado `b7ef46a7efc0132b48ed4386382d66bc942f40eb`. Sua chave fica somente no servidor Lovable. O aplicativo e seus dados permanecem em Sites, D1/R2 e Supabase Auth.

## Funcionalidades

- Cardápios públicos em `/p/<slug>`, com pizzas, meio a meio, tamanhos, bordas, bebidas e combos. Preços, descontos e entrega são recalculados no servidor.
- Painel por proprietário, com revisão de produtos, pedidos, entrega, Pix e publicação. Rascunho e versão pública separados, com proteção contra sobrescrita entre abas.
- **Criar com IA** reúne visual, textos, logo, capa, perfil e fotos. Imagens podem ser pedidas diretamente, sem uma chamada de texto antes. O rascunho é salvo antes da solicitação; o resultado precisa ser revisado e aplicado antes de publicar.
- Estilos prontos opcionais: Forno a lenha, Clássico, Delivery e Família. Os IDs antigos de temas continuam válidos, preservando lojas existentes.
- **Calculadora em `/calculadora` sem login**: custo pronto, despesas, taxas, volume, preço sugerido e resultado estimado. Salvamento automático do preenchimento, até seis cálculos, cópia e download em texto. Dados ficam neste navegador.
- Cliente pede sem conta e acompanha pelo link privado do pedido. WhatsApp tem envio manual.
- Pix direto na chave da pizzaria: comprovante privado, conferência no banco, aprovação manual, prazo e acompanhamento.
- Supabase Auth, sessões protegidas e autorização por loja. Cadastro real por convite do grupo, com acesso direto e sem confirmação por e-mail. A recuperação fica indisponível até comprovar a entrega real.
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

**Histórico de 11/10 — v18:** o transporte Lovable foi corrigido e publicado. Os registros do celular comprovam duas gerações reais de texto, com autorização de uso único e resultados concluídos no D1. As ideias pediam logo, mas foram enviadas ao gerador de textos; por isso apareciam como prévia de cardápio. A correção atual reconhece pedidos explícitos de imagem antes de qualquer chamada de texto e encaminha ao gerador de imagens. Não há fallback automático de IA para estilo pronto.

Cotas mantidas: imagens **3 por proprietário/mês e 2/dia na plataforma**; sugestões **20 por proprietário/mês e 20/dia na plataforma**. Cada geração nova consome saldo de IA. Consultar o mesmo pedido reutiliza o resultado; estilos prontos não usam modelos.

Passaram **134 testes**, typecheck e build nesta correção. Os testes locais adaptam modelos e D1/R2; não são novas gerações reais. Em produção, uma conta isolada foi criada pelo convite e autenticada por senha. Uma geração real recebeu o prompt original, completou o claim, devolveu JPEG **1376 × 768 / 230.350 bytes**, foi lida do R2 e aplicada ao rascunho privado, conservando preços/Pix. Três textos anteriores do proprietário também estão comprovados. Foi consumida **uma geração de imagem**, sem novo build/consulta do agente Lovable ou nova geração de texto. A geração/prévia no celular foi confirmada depois pelo proprietário. Aplicação/publicação dessa capa pelo dono, recuperação de senha, Web Push, trial fiscalizado, Asaas e Netlify permanecem pendentes. Ver [evidências](docs/IA-PRODUCAO.md) e [cadastro por convite](docs/CADASTRO-GRUPO.md).

## Guias

- [Continuidade e validações pendentes](docs/CONTINUAR.md)
- [Proposta de papel da IA no SaaS](docs/PAPEL-DA-IA.md)
- [Leitor por foto e promoção do dia](docs/LEITOR-CARDAPIO.md)
- [Preparação e implantação futura na Netlify](docs/NETLIFY.md)
- [Configuração atual da IA](docs/ATIVAR_ESTUDIO.md)
- [Criação com IA e proteção dos dados](STUDIO.md)
- [Calculadora pública](CALCULADORA.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Protocolo e limites de imagens](docs/IMAGENS.md)
- [Cadastro e integrações](ATIVACAO.md)
- [Recuperação de senha](EMAIL_SUPABASE.md)
- [Pedidos com Pix](FLUXO_PEDIDOS.md)

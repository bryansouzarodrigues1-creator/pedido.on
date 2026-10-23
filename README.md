# pizzaria.on

**Execução real — 23/10/2026, 08:41 de Brasília:** chave Browserbase salva como segredo criptografado de Actions; workflow #15 conectou ao navegador remoto e consultou a Master Pizzas autorizada. A loja respondeu **HTTP 403**, com **zero produtos**; a sessão foi encerrada e não houve nova consulta após o bloqueio. Conexão remota validada, importação de catálogo real ainda sem homologação. Nesta execução passaram 21 testes de política/provedor, 14 cenários sintéticos e quatro de rede; a base anterior mantém 596 testes, tipos/build, Chrome e Windows aprovados. A v82 continua publicada. [Resultado, provas e limites](docs/BROWSERBASE-20261023.md).

**Publicado via Work — v82, 22/10/2026, 13:54 de Brasília:** o administrador pode enviar `resultado-importacao.json` do robô à solicitação correta; o dono recebe produtos e pendências para conferir, sem alterar o rascunho ou publicar. Não depende de um computador pessoal conectado para usar o runner no GitHub Actions. Passaram 584 testes, TypeScript/build, Chrome e Windows; sete lojas completas preservadas. PR principal #89 e espelho #44 integradas. A consulta real às 13:24 continuou HTTP 403/zero produtos: captura automática real ainda não homologada. [Continuar daqui](docs/ENTREGA-ROBO-WORK-20261022.md).

**Etapa anterior — 22/10/2026, captura local:** entrada Windows com Node 24 e navegador instalado, rolagem nativa e relatório HTML para conferir produtos/preços/pendências. Passaram 574 testes locais, TypeScript e 14 cenários sintéticos em Chrome no Linux e Windows. O teste físico depende de um computador conectado ao Desktop Commander; a última captura real da Master Pizzas continua HTTP 403/zero produtos. PR principal #88 e espelho #43. [Estado e limites](docs/ROBO-CARDAPIO-20261022.md).

**Base publicada — criador v81 e captura própria:** o criador real, 252 estilos, prévia sem conta, WhatsApp único e extensão 0.4.0 estão publicados no Lovable. O runner próprio por tarefa reutiliza o extrator; 12 cenários Chrome e 570 testes locais passaram na entrega anterior. A consulta real à Master Pizzas em 21/10 às 21:10 de Brasília retornou HTTP 403, zero produtos. Não afirmar importação automática homologada. [Entrega e limites](docs/ROBO-CARDAPIO-20261022.md).


**Retomada publicada — v79, 21/10/2026, 11:50 de Brasília:** PDF direto antes das perguntas/cadastro e fotos corretas por categoria/produto. 531 testes, TypeScript/build, Chrome, Windows, autenticação/pedidos e espelho aprovados; sete cadastros completos preservados. Os cinco checks antes pendentes da PR #79 passaram, mas extensão/importação assistida continuam em rascunho; falta o número oficial de suporte e validação de ponta a ponta. [Estado completo e próximos passos](docs/RETOMADA-20261021.md).

**Correções publicadas e conferidas — 20/10/2026:** fotos confirmadas na prévia do painel, leitura antiga atualizada ao avançar para a conta e catálogo vazio quando o link não traz produtos. 529 testes, tipos/build, Chrome local e público, Windows e mirror aprovados; sete cadastros completos preservados. [Continuidade e provas](docs/CONTINUIDADE-IMPORTACAO-20261020.md).

**Publicação anterior — v76, 20/10/2026, 17:27 de Brasília:** PDF original com 48/48 nomes e preços, sugestões de fotos da fonte, escolha explícita do modelo e prévia rolável sem ocultar valores. Reenvio do mesmo PDF substitui suas páginas sem perder a leitura anterior se falhar. 526 testes, TypeScript/build, Chrome local/público na v76, Windows, autenticação/pedidos e mirror aprovados. Sete cadastros completos preservados; Apify do servidor preparada e desligada, sem catálogo real importado. [Provas e limites](docs/PDF-ORIGINAL-PREVIA-20261020.md).



**Publicação anterior — v69, 20/10/2026, 08:28 de Brasília:** PDF digital preserva centavos separados e exige revisão de texto corrompido/colunas ambíguas. 482 testes, TypeScript/build, Chrome, Windows, autenticação/pedidos e mirror aprovados; sete cadastros completos preservados. Apify conectada, três testes reais e zero produtos: iFood continua pendente. Foto OCR permanece 13/21. [Resultados e limites](docs/PDF-APIFY-20261020.md).

**Publicação anterior — v68, 19/10/2026:** revisão iFood mantém descrições no produto, reserva espaço para a URL em catálogos grandes e rejeita conflitos mesmo após 500 itens. Passaram 476 testes, TypeScript/build e CI Chrome/Windows/auth; sete cadastros completos preservados. Link público real ainda bloqueado e conector oficial desligado. Medição OCR de PDF real: 13/21 preços corretos, exigindo revisão. [Mudanças, acesso e provas](docs/IFOOD-ACESSO-E-CATALOGO-20261019.md).

**Publicação anterior — v67, 19/10/2026:** carrinho WhatsApp antes da aprovação manual; pedidos/Pix/comprovantes protegidos no servidor, solicitação do dono e denúncia com protocolo. Passaram 472 testes, TypeScript/build, Chrome (11 suítes locais e 7 públicas, incluindo 6 cenários de verificação), Windows, auth/pedidos e mirror. Sete cadastros preservados e cardápio antigo HTTP 200. Pixel 7 emulado; Android físico e importação oficial real iFood continuam pendentes. [Fluxo, provas e limites](docs/VERIFICACAO-DE-LOJAS-20261019.md).

**Publicação anterior — v63, 19/10/2026:** confirma dados do iFood sem campo de nome repetido e preserva as cores pedidas junto do link. Passaram 455 testes e Chrome local/público, incluindo as cores no CSS real da prévia. A importação oficial real continua desligada, aguardando cadastro/verificação e permissões externas. [Estado, limites e ativação](docs/IFOOD-AUTORIZADO.md).

**Continuidade de 18/10/2026:** o plano atual é único, **R$49/mês**. A homologação integrada do beta Cloudflare, OCR e Asaas exclusivamente Sandbox está documentada em [HOMOLOGACAO-INTEGRADA-20261018](docs/HOMOLOGACAO-INTEGRADA-20261018.md). Os relatos de versões e de planos abaixo são históricos; não equivalem à homologação externa atual.

**Contratação real — atualização de 15/10/2026:** página `/assinatura`, acesso direto pelos planos, plano preservado após login/cadastro e gestão centralizada das faturas Asaas. Os valores continuam R$49/R$89/R$149 por mês. [Uso e limites](docs/ASSINATURA-REAL.md). A v37 foi publicada às 19:52:57 de Brasília, ambiente 13, fonte Sites `f1c99186f70a3de73035ddf8ef68970b4ae98640`, PR [#20](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/20) integrada após CI aprovado. Passaram 291 testes, typecheck e build. O diagnóstico HTTP confere a página inicial de acesso e a configuração pública; não executa a hidratação do formulário no navegador. Esta continuação ajusta somente o diagnóstico/documentação, sem mudança do aplicativo ou configuração. Nenhuma cobrança foi criada por esta implementação; primeiro pagamento externo e domínio de recuperação continuam pendentes.


**Ponto de partida confirmado — v35:** PR #18 integrada, fonte Sites `a83fdda612418f121d4ee95566d49dc7113552e3`, publicação em 15/10/2026 às 17:18:48 de Brasília, ambiente revisão 13. A continuação prepara Pix/dinheiro e comandas fictícias na demonstração para facilitar o ensaio no celular; [uso e isolamento](docs/DEMONSTRACAO-OPERACAO.md). Confirmar a nova publicação na PR antes de anunciá-la.

**Base funcional publicada — v33, 15/10/2026:** comanda da cozinha, resumo do motoboy e guias de Pix/entrega, em Pedidos → Detalhes → Comanda e entrega. PR #17 integrada, implantação confirmada às 16:54 de Brasília, ambiente revisão 13. [Uso e limites](docs/COMANDAS-E-ORIENTACOES.md).

**Verificação ampliada:** 281 testes e typecheck aprovados; sete cenários novos com workerd/D1/R2 locais e sessões reais do aplicativo, dois de impressão/renderização e diagnóstico 14/14 de produção somente por GET. Provedor de identidade simulado; navegador, Pix bancário e impressão física ainda não homologados. [Evidências e reprodução](docs/QA-COMANDAS-2026-10-15.md).

**Atualização anterior — v32:** checkout alternativo pelo WhatsApp, artes da promoção com preço/validade escritos pelo aplicativo e catálogo Essencial/Pro/Divulgação (R$49/R$89/R$149), para uma pizzaria. Franquias por conta, orçamento estimado de beta e migração aditiva 0014 aplicados. [Fluxos e limites](docs/WHATSAPP-PROMOCOES-PLANOS.md).

Cardápio digital para pizzarias, com pedidos, Pix conferido pela loja, criação de imagens e textos com IA e calculadora pública de preço e lucro.

**Publicado:** [forno-cardapios.waves4845.chatgpt.site](https://forno-cardapios.waves4845.chatgpt.site) · [Calculadora sem cadastro](https://forno-cardapios.waves4845.chatgpt.site/calculadora) · [Meu painel](https://forno-cardapios.waves4845.chatgpt.site/app)

## Estado atual — 15/10/2026

Cadastro público, painel, pedidos/Pix/chat, OCR local, PWA/Web Push e admin estão publicados. Promoções permitem preço livre e combos; o painel recolhe opções secundárias. Importação automática por link iFood ainda não está disponível.

A assinatura Asaas está disponível em **Assinatura**, com atalho em Minha conta: Essencial R$49/mês, Pro R$89/mês e Divulgação R$149/mês. Webhook de produção habilitado e autenticado. Os 263 testes da v32 passaram, incluindo D1/workerd com identidade e Asaas simulados. Pagamento e ciclo financeiro externos ainda precisam de validação; consulta real da chave e teste do receptor não equivalem a pagamento real. O acesso comercial ainda não exige assinatura, e o trial não bloqueia contas. Contas, dados e URL preservados. As cotas da v32 e o teto estimado constam no guia de planos.

Os registros abaixo são históricos e não substituem este estado atual.

### Registro histórico — v21, 12/10/2026

Última publicação confirmada: **versão 21**, fonte Sites `c2c1b9cf75615acf24e6189db6c3d82575b74e65`, ambiente revisão 6, PR #8 integrada. Em **Cardápio**, o dono pode enviar fotos, revisar itens/preços em lote e acrescentar produtos e bordas ao rascunho, com OCR no aparelho. Promoção do dia usa preço e validade aprovados pelo dono; a compra confirma novamente um total que mudou. Mensagem pronta é copiada sem modelos. Contas existentes, configurações e as quatro áreas do painel foram preservadas. A validação de câmera/toque/retomada no celular continua pendente. A correção adicional de cancelamento está guardada na PR #9 em rascunho, sem publicação, após queda do ambiente.

**Publicado e conferido:** [leitura por foto e promoção do dia](docs/LEITOR-CARDAPIO.md). Passaram 151 testes, typecheck e build/empacotamento da v21. OCR real reconheceu tabela, duas colunas e JPEG inclinado/escurecido em três imagens reproduzíveis. Em produção, início, calculadora, demonstração e os cinco arquivos de OCR consultados responderam 200; os bytes do OCR coincidiram com os testados. As 14 tabelas de negócio comparadas permaneceram iguais e o ambiente continuou na revisão 6. Não houve chamada a modelo ou nova geração. A PR #9 adiciona dois testes de cancelamento (153 passaram antes da queda), mas ainda exige build/implantação. Leitura complementar por IA, divulgação criativa, trial fiscalizado, Asaas, Resend e Web Push permanecem futuras.

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
- Supabase Auth, sessões protegidas e autorização por loja. Cadastro aberto sem convite, com acesso direto e sem confirmação por e-mail. A recuperação fica indisponível até comprovar a entrega real.
- Stripe e importação de cardápio OpenAI estão preservados e desativados; não são necessários para usar as demais funções.

## Administração

O admin privado em `/admin` mostra pedidos e valor confirmado por pizzaria, períodos de 7/30/90 dias, etapas até o primeiro pedido, atividade do cardápio e uso/falhas de IA e alertas. Não mistura vendas das pizzarias com assinaturas. Ver [métricas e limites](docs/ADMIN-CLIENTES.md).

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
- [Referência por link iFood e requisitos do conector oficial](docs/IMPORTACAO-IFOOD.md)
- [Preparação e implantação futura na Netlify](docs/NETLIFY.md)
- [Configuração atual da IA](docs/ATIVAR_ESTUDIO.md)
- [Criação com IA e proteção dos dados](STUDIO.md)
- [Calculadora pública](CALCULADORA.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Protocolo e limites de imagens](docs/IMAGENS.md)
- [Cadastro e integrações](ATIVACAO.md)
- [Recuperação de senha](EMAIL_SUPABASE.md)
- [Pedidos com Pix](FLUXO_PEDIDOS.md)


## Atualização operacional — v26

**Publicado — v26, 12/10/2026:** fonte Sites `6629ea2cfa6c73130d06d07f7ee742cf3588944b`, versão `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_e37b0a5043348191ba8594d36c755045`, implantação `appgdep_6acd6779fb848191bbd72d892c9a196e` concluída às **23:04:53.326 UTC (20:04 no Brasil)**. Ambiente revisão **8**, audiência pública. PR #9, #10 e #11 integradas. Main de código `d7f72054cb933b085131d251cd8be8d38c30d56c` antes deste registro; PR #11 merge `da4045ac454e36dc8135bc82eedd57cc521ef44c`. GitHub e Sites não se atualizam automaticamente entre si.

Administração em /admin apenas para a conta existente fixada como segredo; PWA instalável com ícones, atualização protegida e shell offline; Web Push por aparelho e fila criptografada; carrinho antes de endereço/bairro/consulta; taxas/regras definidas pelo dono; aceite operacional separado da conferência Pix; Minhas criações recupera imagens/textos sem modelos; trial começa uma vez na primeira pizzaria de novos cadastros, com fiscalização **desativada até a cobrança**. Nenhum backfill ou corte de contas anteriores.

Migrações 0009, 0010 e 0011 confirmadas no D1 (19 tabelas); 0007/0008 preservadas. As **14 tabelas de negócio anteriores permaneceram iguais** após a v25; a v26 remove somente alertas antigos duplicados e com endereço no navegador, deixando o Web Push com texto genérico. Chave de sessão, Supabase, banco/R2, preços/Pix, cotas de IA preservados. Sem créditos Lovable/OpenAI ou mensagens de e-mail nesta etapa.

Passaram **175 testes**, typecheck, build/empacotamento e preparação/check Netlify. Após o ajuste final, 12 testes de administração/push/entrega, typecheck e build passaram. Criptografia/assinatura em workerd e SSR do menu são reais; transporte push, serviços Auth/modelo e adaptadores D1/R2 dos testes são simulados. Em produção: início, calculadora, offline, manifesto e arquivos PWA responderam 200; admin/status e notifications negaram anônimos com 401. A v23 teve redirecionamento de offline.html, corrigido na v24 para /offline; não repetir esse erro.

**Etapas humanas e comerciais ainda pendentes:** testar câmera, toque, instalação, atualização com rascunho, notificação com painel fechado e fluxo em dois celulares. Resend listou nenhum domínio; recuperação precisa de remetente/SMTP e entrega/link real validados. Asaas PR #1 continua separada, com políticas puras apenas: faltam integração/checkout/webhook/credenciais próprias e teste de pagamento/renovação/cancelamento. Não usar chaves JurisAuto, comprar domínio ou ativar fiscalização/cobrança sem finalizar essa etapa. Netlify continua preparada e entra após o gateway. Ver [registro completo](ADMIN-PWA-OPERACAO.md).


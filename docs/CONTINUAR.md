# Continuar o pedido.on

**Prioridade atual:** planejar o papel da IA antes de implementar a evolução do SaaS, conforme o pedido mais recente do proprietário. Ver a [proposta de produto](PAPEL-DA-IA.md); o escopo proposto ainda não foi aprovado nem implementado. A correção está **publicada na v20**, PR #7 integrada. A tela inicia em imagem, envia a ideia original ao Lovable e mantém cores/textos como escolha explícita. O cadastro por convite e acesso direto foram validados numa conta de teste pelo fluxo normal, com login, logout e isolamento do painel. Confirm email segue desativado; recuperação continua indisponível até validar a entrega real.

O prompt **“Gere algo marcante de pizza de queijo”** foi gerado como imagem real pela pizzaria autenticada de teste: JPEG **1376 × 768**, **230.350 bytes**, salvo no R2 e aplicado ao rascunho privado. Claim e POST de imagem tiveram 200; o job ficou `completed`. Nenhum texto intermediário foi usado. Foi consumida **uma geração de imagem**; não pedir outro texto/imagem pago para repetir essa prova. Posteriormente, as telas enviadas pelo dono mostram uma pizza voando sob uma luz, criada a partir de sua ideia, e a prévia de imagem no celular; a aplicação/publicação dessa capa pelo dono ainda não foi confirmada. As duas pizzarias, o perfil e os cinco jobs de texto anteriores foram comparados, completos e iguais no teste; as sessões de teste foram encerradas. Ver [IA-PRODUCAO.md](IA-PRODUCAO.md).

**Fluxo SaaS aceito no planejamento anterior:** cliente navega e monta carrinho sem cadastro/espera; depois informa endereço/WhatsApp, verifica área/taxa, resolve aprovação necessária, faz Pix e acompanha status/chat. Regras de bairros e taxas são o caminho normal; revisão manual para exceções. A aprovação operacional deve ser separada da confirmação financeira. O gate antigo antes de navegar não é esse fluxo: sua flag está ausente/desativada em produção, e as novas regras de bairros/taxas ainda não foram implementadas. Trial persistente/fiscalizado, Asaas, recuperação de senha e Web Push seguem pendentes. Não confundir a proposta de IA com a conclusão dessas etapas.

## Produção — 12/10/2026

**Atualização v20 — 12/10/2026:** Sites `5153cab4266fa7680de194336f686cdb9f367fcb`, versão `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_7c1dd5e15fd88191bd7e1bc589f02dd3`, implantação `appgdep_6accbc470bc481918ecf2f363a32eea9` concluída às **10:54:21.705 UTC (07:54 no Brasil)**. PR #7 integrada em `d4da8482aa6e21bf6b3b141f704ede3ff04f0aca`, head `417d2b93478b961cb000e6710abe3f9f484a397a`. Fonte Sites e GitHub têm a mesma árvore `ab42696c7a987a0503a035130fed706323347fc3` antes do registro posterior destas provas. **134 testes**, typecheck e build/empacotamento passaram. Audiência pública, ambiente **revisão 6**, chave de sessão, endpoints/flags e limites foram preservados. Nenhuma migração ou sobrescrita de pizzaria existente.

Imagem real: job `5e9d42fc-d5f9-4970-b4d8-9b22342f5cd1`, criado **11:03:18.594 UTC**, concluído **11:03:24.095 UTC**. Conta e pizzaria isoladas de teste, criadas e autenticadas por APIs normais do aplicativo; nenhuma sessão falsa ou selo D1 foi usado. A imagem foi baixada, decodificada e conferida antes da aplicação privada; nenhuma publicação de conteúdo foi executada. Há um perfil e uma pizzaria de teste adicionais, identificados como teste; o perfil e as duas pizzarias anteriores permanecem iguais. As três sessões anteriores seguem existentes, com leitura parcial dos campos selados; não declarar comparação completa das sessões. Não houve novo build Lovable nem outro POST ao gerador para reutilização.

**Histórico:**

**Atualização v19 — 12/10/2026 UTC (11/10 no Brasil):** Sites `7b609fe29aed01a5195a9f8df3e05da8f395133c`, versão `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_4deb0d6a4fec8191a7a6a41ddc81d420`, implantação `appgdep_6acc435cfc788191968ed813789fb57e` concluída às **02:18:30.023 UTC**, ambiente **revisão 6**, audiência pública. PR #6 integrada à main em `8f4bc7fa813ceedc93f47087095a132a6969f7c9`, head `aeaba78493506ef4a3b52401225ceb6e586e53e5`. A árvore local foi conferida igual à árvore GitHub `364fbc987c711784fd4c2c798b329418488eb115`. Build/empacotamento passaram; 129 testes e typecheck já tinham passado com esses mesmos fontes. O código do convite fica somente como segredo no Sites e é fornecido privadamente ao proprietário, nunca na API ou GitHub.

Somente `PEDIDO_AUTH_MODE` e `PEDIDO_AUTH_INVITE_CODE` foram alterados/adicionados. Chave de sessão, Supabase, endpoints/flags Lovable, bindings DB/BUCKET e cotas preservados. Nenhuma migração adicional ou transferência de dados. As duas pizzarias e o perfil existente foram comparados antes/depois, completos e sem mudanças. Logs reais após publicação mostram início público GET 200. A primeira tentativa Python recebeu Cloudflare 1010; identificação normal do diagnóstico resolveu o GET da API, sem alterar a hospedagem. A configuração de cadastro foi liberada posteriormente no Supabase, conforme a prioridade acima. Cadastro de conta nova e imagem real continuam pendentes.

**Histórico v18:**

Aplicativo: https://forno-cardapios.waves4845.chatgpt.site, versão **18**, fonte Sites `0509ffc7875ff02b1db786b6a51207b121be5911`, projeto `appgprj_6ac6d3ea9f7881918f315a156338ed52`. Implantação `appgdep_6acbf9522808819187183b508e487dbd` concluída em 11/10/2026 às 21:02:35 UTC, ambiente revisão 5, audiência pública preservada. PR #5 integrada à main em `de1414ef15a9a2f975d6fb942eb7cd1784acea90`. Migrações 0007/0008 confirmadas no D1; comparação dos dados visíveis anteriores não encontrou mudanças. Fluxos reais de entrega/chat e imagem autenticada continuam pendentes. O texto autenticado teve dois resultados reais concluídos às 21:08:43.830 e 21:09:23.718 UTC. A v17 está preservada no histórico para reversão do aplicativo.

IA: https://pedido-on-estudio.lovable.app, projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, workspace Pro `workspace_01kn20zmepfahsq3q7xa36ct6h`, commit publicado `b7ef46a7efc0132b48ed4386382d66bc942f40eb`, implantação `7d13aeee-902f-449c-b513-9f27f13dd619`. Chave gerenciada somente no servidor do serviço. Supabase Auth `lxavrmzafumqmbswtfbe`, D1/R2, contas e preços preservados.

## Correção e interface

A IA falhava antes do envio: workerd recusava `redirect: "error"`. A falha foi reproduzida no runtime. O helper `lib/ai-provider.ts` usa `manual`, rejeita redirects e não encaminha tokens. Erros retornam `attempt: cancelled`, `failed` ou `pending`; falha anterior ao claim não desconta a cota, falha ambígua posterior fica contada. Nenhum retry pago automático.

O painel tem **Pedidos, Cardápio, Pizzaria e Criar com IA**. Criação reúne visual/textos, logo, capa, perfil e foto numa seleção e campo de ideia. Imagens não precisam de uma chamada de texto antes. O rascunho é salvo antes do envio; o dono confere, usa no rascunho e publica explicitamente. Estilos sem IA ficam recolhidos.

Cadastro inicial sem seleção de quatro layouts; uma ação principal para adicionar produtos. A calculadora `/calculadora` é pública, destacada no início, login e painel. Salva preenchimento e até seis cálculos no navegador, copia/baixa resultado; nenhum login para calcular ou salvar. IDs de temas e chaves de armazenamento do navegador preservados.

## Evidências da etapa anterior (v17) e limites

| Verificação | Resultado |
| --- | --- |
| Repositório atual | 103 testes, typecheck, build Sites, preparação Netlify e empacotamento das duas funções passaram; Netlify ainda não implantada |
| Workers | Envio e não encaminhamento de tokens em redirects, com serviço simulado |
| Gateway no build local | Saúde, configuração de acesso, calculadora anônima, início e imagem estática 200; origem pública e cookie CSRF preservados, com D1/R2 de teste |
| Serviço Lovable | 7 testes de protocolo, 14 existentes, typecheck e build passaram |
| Gateway real | Um texto 200/JSON/577 bytes; uma imagem 200/JPEG/179.881 bytes; claim simulado somente no teste interno |
| Produção v17 | `/` e `/calculadora` anônimos 200, sem login; saúde de texto/imagem habilitada e conectada |
| Visual/celular | Navegador indisponível; revisão visual interativa não executada |
| Loja autenticada | Ciclo de geração → R2 → aplicar → publicar não executado nesta sessão |

Lovable informou **4,0 créditos de construção** nesta correção (3,1 diagnóstico/testes; 0,9 conferência final), além do consumo separado das duas chamadas reais, cujo custo unitário não foi informado. Sem compra de saldo, aumento de cotas ou Max.

## Próximos testes úteis

**Netlify permanece adiada até concluir a IA e o gateway de pagamento.** O repositório contém `netlify.toml`, o gateway em `deploy/netlify/` e a normalização assinada em `build/sites-worker.ts`. Ler [NETLIFY.md](NETLIFY.md) antes de implantar. A preparação está no código; não considerar o domínio Netlify ativo a partir do build local.

Netlify será o endereço público; aplicativo, D1/R2, Supabase e Lovable permanecem nas hospedagens atuais. Configurar somente o domínio HTTPS exato e uma chave nova de ponte; preservar `AUTH_SESSION_KEY`. Deploy previews não são autorizados automaticamente. Verificar os redirecionamentos Supabase e as lojas de proprietários ChatGPT antes da transição. Calculadora continua pública; seu histórico local não se transfere entre domínios.

1. Conferir os quatro destinos do painel no celular e a rolagem das janelas de produto.
2. Rever uma imagem existente antes de pedir outra. Para uma geração paga nova, considerar a autorização e o orçamento da sessão; não repetir chamadas para investigar conexão.
3. Validar com conta de teste o ciclo completo: produto salvo, uma imagem autorizada, conferir fidelidade, usar no rascunho e publicar somente o conteúdo aprovado pelo dono.
4. Abrir a calculadora fora do login, salvar, recarregar e baixar a cópia. Não há sincronização entre dispositivos.
5. Validar nova conta com convite e acesso direto, preservando contas existentes. Recuperação de e-mail permanece pendente de entrega real.

## Continuidade

Ler `AGENTS.md`, `README.md`, `STUDIO.md` e `CALCULADORA.md`. Preservar Supabase, chave interna de sessão, bindings DB/BUCKET, migrações e `PEDIDO_AUTH_TEST_EMAILS`. Não exportar segredos, dumps, dados pessoais ou comprovantes.

Executar `pnpm test`, `pnpm typecheck`, `pnpm build:netlify`, `pnpm check:netlify` e build do aplicativo. A etapa Netlify exige publicar previamente a ponte pelo fluxo oficial Sites, no mesmo projeto/audiência. Não houve publicação nessa preparação. GitHub não faz deploy automático Sites; não conectar a raiz do monorepositório à Lovable. O serviço fica separado em `services/image-service`.

Stripe e importação OpenAI continuam desativados. Não comprar saldo, aumentar limites ou usar Max sem instrução do dono. Não inventar revisão em navegador ou geração completa a partir de consulta de saúde.

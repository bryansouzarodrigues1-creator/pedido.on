# Continuar o pedido.on

**Prioridade atual:** concluir a configuração externa do cadastro e validar uma imagem real. A correção está **publicada na v19**, PR #6 integrada, sem novo gasto Lovable. O modo de protótipo foi substituído por convite secreto. O GET real `/api/auth/config?registration=1&v=19` retornou 200, `prototype:false`, `inviteRequired:true`, **`directSignup:false`**. O provedor real confirmou `external.email:true`, `disable_signup:false`, **`mailer_autoconfirm:false`**: Confirm email ainda está ativado no Supabase. O formulário permanece fechado para não disparar confirmação. É necessário desativar essa opção no painel Supabase; não contornar a verificação no código. O navegador do agente chegou à tela de login Supabase, sem sessão autenticada; acesso seguro pendente.

Duas gerações reais de texto do proprietário estão comprovadas. Pedidos explícitos de logo agora seguem diretamente à rota de imagem, sem gastar texto antes. Uma imagem autenticada, R2 e aplicação ao rascunho continuam pendentes. Ver [IA-PRODUCAO.md](IA-PRODUCAO.md) e [CADASTRO-GRUPO.md](CADASTRO-GRUPO.md).

## Produção — 11/10/2026

**Atualização v19 — 12/10/2026 UTC (11/10 no Brasil):** Sites `7b609fe29aed01a5195a9f8df3e05da8f395133c`, versão `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_4deb0d6a4fec8191a7a6a41ddc81d420`, implantação `appgdep_6acc435cfc788191968ed813789fb57e` concluída às **02:18:30.023 UTC**, ambiente **revisão 6**, audiência pública. PR #6 integrada à main em `8f4bc7fa813ceedc93f47087095a132a6969f7c9`, head `aeaba78493506ef4a3b52401225ceb6e586e53e5`. A árvore local foi conferida igual à árvore GitHub `364fbc987c711784fd4c2c798b329418488eb115`. Build/empacotamento passaram; 129 testes e typecheck já tinham passado com esses mesmos fontes. O código do convite fica somente como segredo no Sites e é fornecido privadamente ao proprietário, nunca na API ou GitHub.

Somente `PEDIDO_AUTH_MODE` e `PEDIDO_AUTH_INVITE_CODE` foram alterados/adicionados. Chave de sessão, Supabase, endpoints/flags Lovable, bindings DB/BUCKET e cotas preservados. Nenhuma migração adicional ou transferência de dados. As duas pizzarias e o perfil existente foram comparados antes/depois, completos e sem mudanças. Logs reais após publicação mostram início público GET 200. A primeira tentativa Python recebeu Cloudflare 1010; identificação normal do diagnóstico resolveu o GET da API, sem alterar a hospedagem. Cadastro e imagem real continuam pendentes conforme a prioridade acima.

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

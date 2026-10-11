# Continuar o pedido.on

**Prioridade atual:** validar a IA real com a pizzaria autenticada antes de avançar para pagamentos/Netlify. Ver [IA-PRODUCAO.md](IA-PRODUCAO.md): `Illegal invocation` e `redirect: "error"` foram corrigidos e publicados no serviço Lovable. Os dois callbacks chegaram ao Sites com tokens inválidos no diagnóstico sem geração, comprovado nos logs. A nova construção autorizada informou 2,3 créditos; a consulta em modo conversa informou 1 na pausa e 0 na resposta final. O dono já autorizou no máximo um texto e uma imagem reais após comprovar a conexão. Geração autenticada, R2 e aplicação ao rascunho ainda pendentes. Os 4 créditos citados abaixo são da etapa anterior.

## Produção — 11/10/2026

Aplicativo: https://forno-cardapios.waves4845.chatgpt.site, versão **18**, fonte Sites `0509ffc7875ff02b1db786b6a51207b121be5911`, projeto `appgprj_6ac6d3ea9f7881918f315a156338ed52`. Implantação `appgdep_6acbf9522808819187183b508e487dbd` concluída em 11/10/2026 às 21:02:35 UTC, ambiente revisão 5, audiência pública preservada. PR #5 integrada à main em `de1414ef15a9a2f975d6fb942eb7cd1784acea90`. Migrações 0007/0008 confirmadas no D1; comparação dos dados visíveis anteriores não encontrou mudanças. Fluxos reais de entrega/chat e IA autenticada continuam pendentes. A v17 está preservada no histórico para reversão do aplicativo.

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
5. Validar Supabase Auth e recuperação de e-mail quando necessário, mantendo cadastro direto e a lista de teste.

## Continuidade

Ler `AGENTS.md`, `README.md`, `STUDIO.md` e `CALCULADORA.md`. Preservar Supabase, chave interna de sessão, bindings DB/BUCKET, migrações e `PEDIDO_AUTH_TEST_EMAILS`. Não exportar segredos, dumps, dados pessoais ou comprovantes.

Executar `pnpm test`, `pnpm typecheck`, `pnpm build:netlify`, `pnpm check:netlify` e build do aplicativo. A etapa Netlify exige publicar previamente a ponte pelo fluxo oficial Sites, no mesmo projeto/audiência. Não houve publicação nessa preparação. GitHub não faz deploy automático Sites; não conectar a raiz do monorepositório à Lovable. O serviço fica separado em `services/image-service`.

Stripe e importação OpenAI continuam desativados. Não comprar saldo, aumentar limites ou usar Max sem instrução do dono. Não inventar revisão em navegador ou geração completa a partir de consulta de saúde.

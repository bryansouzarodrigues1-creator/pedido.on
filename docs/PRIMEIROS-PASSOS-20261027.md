# Primeiros passos para quem vai abrir uma pizzaria — 27/10/2026

## Motivo e escopo

O relato de um pizzaiolo iniciando um delivery com a esposa mostrou que ele precisava de um caminho curto para cadastrar, entender custos e publicar. O guia usa o aplicativo e os modelos existentes. As ferramentas completas continuam acessíveis, e nenhuma etapa educativa é exigida para publicar.

## Comportamento

- Pizzaria nova sem produtos abre em **Comece sua pizzaria**, com quatro etapas. Uma importação em revisão conserva seu fluxo atual. Escolher a importação é lembrado ao recarregar, e os avisos da equipe abrem diretamente a revisão. Quem já usa o painel encontra **Abrir primeiros passos** em Pedidos e o acesso no menu lateral. A escolha de usar as ferramentas completas é lembrada neste aparelho; reabrir o guia continua disponível.
- **Cadastre suas primeiras pizzas** abre o editor existente, só exige nome e preço de pelo menos um tamanho; foto/descrição ficam opcionais. Guardar e continuar usa o salvamento normal com revisão. O progresso só conta o produto quando salvo na conta.
- **Descubra quanto sobra** mostra uma conta por pizza com dois valores: custo e preço pretendido. Entrega paga pela loja, taxas/impostos e parcela fixa são opcionais e explícitos. R$20 de custo/R$40 de venda deixam R$20 antes dos gastos ausentes; não se apresenta esse valor como lucro líquido garantido. Perdas continuam negativas. A conta não altera preços do cardápio.
- **Configure seu delivery** reúne WhatsApp, horário, entrega/retirada, taxa e prazo. Retirada exige endereço. Guardar usa a mesma API/revisão e não publica. Mudanças nos dados conferidos tornam essa etapa pendente novamente. Horários informativos não abrem/fecham pedidos automaticamente.
- **Publique seu cardápio** oferece quatro modelos existentes, prévia com os produtos reais e foto ilustrativa de capa opcional. Retirar a foto não troca o layout, os produtos ou os preços. A foto padrão é identificada como ilustrativa também no cardápio público. Um modelo visual não substitui textos/contato/Pix do cliente. Publicação continua explícita e usa as regras existentes.
- **Fazer essa etapa depois** avança sem contar conclusão falsa. O progresso de publicação vem do servidor. O estudo de custos/conferências fica neste navegador, por pizzaria, e não é exposto no JSON público do menu. Storage indisponível é informado, sem falsa indicação de persistência.
- A calculadora Fácil também passa a explicar o significado do resultado e os gastos ainda não incluídos. O comparativo de margem/acréscimo e os cálculos existentes são preservados.
- Confirmar um estudo registra apenas uso da calculadora no contador autenticado já existente. Custos e preços não são enviados na medição; identidades fornecidas pelo cliente continuam proibidas.

As orientações e a conta são locais e pré-preparadas: nenhuma chamada de IA, nova chave, migração, compra ou mudança de franquia é necessária para estas orientações. Não foi criado grupo/comunidade nem enviada mensagem a clientes.

## Validação concluída

No commit final `13bf133d5890163b5af03572881cf05764d97b3d`:

- [Bateria principal](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40591006950): **761 testes aprovados, zero falhas**, TypeScript, schema com 41 tabelas sem diferença/migração, build e preparação/verificação Netlify.
- [Windows](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40591006974): aprovado.
- [Chrome](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40591006902): baterias `core` e `welcome-kit` aprovadas, incluindo guia, importação assistida, persistência de escolha e links de revisão enviados por avisos.
- [Disponibilidade do cadastro público](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40591007139): aprovada, sem criação de conta real.

Os seis testes puros novos verificam aritmética, perdas, limites, progresso real, retomada/isolamento de storage e preservação ao trocar modelo/foto. O contador autenticado foi testado sem valores financeiros. Os testes de workspace verificam tanto a pizzaria vazia no guia como a prioridade de revisão/importação explícita.

O ensaio Chrome novo completou sete cenários no runner descartável do GitHub, usando as APIs normais de salvar/publicar com D1/R2 locais e a identidade local oficial simulada: pizzaria vazia → produto → custo → retomada → entrega → modelo/foto → publicação. Abrange 320/412/768/1280 px, produto salvo antes de avançar, armazenamento indisponível, isolamento por loja, preservação de preço/Pix/conteúdo, publicação incompleta direcionada à etapa faltante e ferramentas completas disponíveis. Chamadas a modelos externos, pedidos, pagamentos e mensagens são bloqueadas.

A inspeção visual identificou título duplicado e excesso de altura no celular; o cabeçalho foi unificado, as quatro etapas ficaram compactas e o conteúdo ativo rola para a posição de leitura. As capturas finais inspecionadas são da rodada `40589215124`, artefato `12773042640` (SHA-256 `6da874b1ac3087de962614e736525dc8301e2b38c07e6ab2d9da3437fbcc9e33`). O guia/CSS é o mesmo da candidata final; os ajustes posteriores tratam da retomada de importação e links explícitos, validados novamente no Chrome.

Artefatos da rodada final `40591006902`:

- `12773493620`, `chrome-qa-40591006902-1-welcome-kit`: SHA-256 `c570ae9beae6b6419ce56b2a277baf9d00e672491d673f52bc363e9cb7a80be6`.
- `12774193380`, `chrome-qa-40591006902-1-core`: SHA-256 `142eda6cb71efed69f66330b2cee85789d26df2a1c55232a9ea4893a35deeb70`.

A prévia local não ofereceu rota acessível e foi parada; o teste completo local também não terminou neste ambiente. A prova da suíte completa e do navegador é o CI acima. Tipos, testes puros novos e builds foram conferidos localmente; não se afirma que os 761 testes terminaram no terminal local.

## Publicação confirmada

A [PR #142](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/142) foi integrada em `1ffa65ba7ff51bc23f35f9088fc917c37459336a`. A fonte nativa `858802c322a5594521edc2d8543ef1bc38ab2b12` tem a mesma árvore `baf788c893e3f7f085527124105a9cfff96fed20` do commit final e da integração.

- Versão **105**: `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_64aba9065fdc819185a21cebdbeff11f`.
- Implantação `appgdep_6ae120aa74e881919b3917e4b2ca9c8f`: **succeeded**, em **27/10/2026 às 19:08:02 de Brasília** (`2026-10-27T22:08:02.709402+00:00`).
- Ambiente **20**, audiência pública, preservados; nenhuma nova migração, dependência, configuração de autenticação, provedor, cota ou regra de cobrança.
- Pacote gzip conferido: 13.549.166 bytes; SHA-256 `27271e963f9429eab613ebd9d92539b2bea312a19558d39009dea382bd02f459`.
- Conteúdo tar salvo: 726 arquivos, 29.962.240 bytes, hash `sha256:3b8edb6ed32aacb6a661bc7fc4f277db787eba019eb3f36d00e697055ff33d0c`.
- Site público: https://pizzaria-on.netlify.app/ ; origem publicada: https://forno-cardapios.waves4845.chatgpt.site . O gateway Netlify existente encaminha à origem; não precisou de nova implantação separada.

Depois de publicar, `pnpm check:netlify --live https://pizzaria-on.netlify.app` confirmou gateway assinado, dados, página inicial, calculadora anônima e saúde da IA. Nenhuma imagem/texto de IA foi gerado pelo diagnóstico.

Na calculadora pública, o Chrome confirmou custo R$20, margem de 50%, preço R$40 e sobra R$20 com o texto “Isso ainda não garante lucro líquido”. O botão de detalhes abriu as orientações de embalagem, entrega paga pela loja, taxas, impostos, parcela fixa, ausência de duplicidade e significado de CMV.

O cardápio público da EFATA carregou com as sete opções e preços de R$49,99/R$52,99/R$41,99/R$40,99/R$48,99/R$56,99/R$55,99. A loja apareceu como verificada na leitura; nenhuma decisão de verificação nem alteração de cliente foi feita nesta continuação. Nenhum pedido, pagamento, mensagem ou geração paga foi criado na produção.

## Uso e continuidade

O cliente novo sem produtos entra automaticamente em **Comece sua pizzaria**. No painel existente, usar **Pedidos → Abrir primeiros passos** ou **Primeiros passos** no menu lateral. Etapas podem ser puladas; **Usar ferramentas completas** mantém o painel disponível.

Esta entrega não homologa Android físico, a conclusão de um novo e-mail real de recuperação nem a primeira cobrança externa Asaas. Essas pendências anteriores continuam registradas; os testes sintéticos e o diagnóstico de saúde não as substituem. Não foram alteradas autenticação, cobrança ou a configuração da loja real.

Este registro documental posterior à publicação não muda o código que está na v105 e não exige outro deploy.

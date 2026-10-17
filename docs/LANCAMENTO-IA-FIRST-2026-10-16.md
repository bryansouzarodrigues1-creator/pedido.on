# Lançamento IA-first — 16/10/2026

**Handoff Supabase real concluído na v45:** execução `38977586275`, seis verificações aprovadas, zero falhas; cadastro direto, dados/arquivos recebidos e sessão mantida após reabrir Chrome sem novo login nem rascunho duplicado. [Evidência posterior aos cenários simulados abaixo](QA-CADASTRO-REAL-2026-10-16.md). Google/recuperação, Android físico e OCR comercial continuam pendentes. Nenhuma nova versão Sites foi necessária para acrescentar os testes.

**v45:** o Chrome agora executa no GitHub Actions, sem depender do Rodrigues. Passaram 354 testes de domínio, TypeScript/build, 24 cenários locais e 20 na produção. A rodada reproduziu e corrigiu uma falha adicional de OCR em colunas com produtos desalinhados. Fonte Sites `912223a732c851d8ca3c1be80ccd8c3d86b26f8c`, publicada às 22:28:23 UTC, ambiente 13; repetição pública aprovada no CI `38975573660`, tentativa 2. [Resultados, capturas e limites comerciais reais](QA-CHROME-CI-2026-10-16.md). O cadastro Supabase foi validado posteriormente em execução própria, conforme a atualização acima; Android físico continua pendente.

O proprietário confirmou autorização integral para a integração e a publicação na continuação da sessão. Mantidos o Site, a audiência pública, o banco, os bindings, a revisão 13 do ambiente e os limites financeiros existentes.

## Integração e primeira publicação

- PR #24 integrada por merge em `301d0285462c25f3ca49cdd9707ec6076efe564f`.
- PR #26 integrada em seguida por merge em `95f7620e9966319fb008a54c4fdc47b2ceadc9f2`.
- A árvore integrada coincide com a candidata `bdc6cbe573f4a54e33aa7caec6882a2f7cc0d91d`: `f6649b74af61824a2c2d9591a34ae2982670a449`.
- A antiga fonte Sites coincide com a árvore de main anterior à integração. Os históricos foram reconciliados sem sobrescrever commits; fonte publicada `0628391116cb5e3eaded6de4e4e5c7d8d21b96c1`, com a mesma árvore validada.
- **v42 publicada com sucesso às 17:41 UTC**, no projeto `appgprj_6ac6d3ea9f7881918f315a156338ed52`, em https://forno-cardapios.waves4845.chatgpt.site/criar. Nenhuma migração ou alteração de configuração foi necessária.
- CI da candidata: execução `38938210684`, sucesso. O empacotamento e a publicação usaram o fluxo oficial Sites e o arquivo de build correspondente.

## Verificação após publicar

No Chrome instalado no Rodrigues, usando viewport Pixel 7, a primeira rodada na URL publicada passou nos **13 cenários de entrada, sem erros de JavaScript**, e nos **quatro de calculadora**. Conferidos largura de 320/360/412 px, duas rodadas de quatro modelos, refinamentos sucessivos, anexos independentes, reabertura do navegador e falha dos dois armazenamentos.

O teste adicional da transferência identificou um caminho ainda não coberto: após refinar, anexar produtos e atualizar as prévias, `generate` apagava o estilo escolhido e os pedidos escritos. O cadastro real dessa tentativa ainda não tinha sido enviado; nenhum cadastro ou rascunho adicional foi criado nesse diagnóstico. Uma expectativa inicial do teste que exigia o campo opcional `brandName` foi corrigida: o nome pode estar explicitamente no briefing, como previsto pelo produto.

## Correção da atualização das prévias

Atualizar a fonte agora conserva seleção, rodada, refinamentos e aviso dos limites locais. A mudança do briefing continua podendo limpar a seleção pela ação já existente no campo. A nova leitura substitui somente os produtos da prévia; não aplica produtos nem preços ao rascunho.

O teste de navegador passa a verificar esse caminho antes de seguir ao cadastro: o modelo escolhido, a composição compacta e os cantos arredondados precisam continuar presentes, e o checkpoint deve conservar exatamente os pedidos anteriores, incluindo um pedido fora do motor local. O teste atualizado **falhou na v42: 13 aprovados e uma falha**, reproduzindo a perda do modelo.

Nesta revisão, a suíte do aplicativo passou novamente em **331 testes, zero falhas/ignorados**; TypeScript e build oficial Sites aprovados. A validação visual da correção, o CI e a publicação seguinte devem ser registrados antes de declarar o fluxo completamente homologado na URL real.

A rodada no Chrome com a correção passou nos **14 cenários, sem falhas ou erros de JavaScript**, incluindo recuperação, atualização da fonte e ida ao cadastro. As provas de antes/depois estão em [QA-PREVIAS-2026-10-16.json](QA-PREVIAS-2026-10-16.json). O resultado local não substitui a verificação com Supabase na URL publicada.

## Publicação da correção

- PR #27: `d57958bd4fa709161173eea06bd5690f27c973fe`, integrada em `9c70dbc931a40f94ed7ef57d1bc4f50f940096bd` após CI `38968675814` concluído com sucesso.
- **v43 publicada com sucesso às 21:26 UTC**, fonte Sites `3ba75bf93b09190177ddbc55a2bd785b171d61e4`, árvore `4fc23c88cbc7af9ec1dff8192d4e59ebb2e168b2`; ambiente revisão 13 e audiência pública preservados.
- O primeiro arquivo de publicação estava truncado e foi recusado pelo serviço, sem implantação. O pacote foi refeito pelo helper oficial, passou na verificação gzip e gerou a v43; não se removeu nenhuma proteção de validação.
- O Rodrigues ficou offline antes da conferência final na v43. As consultas diretas do executor às páginas publicadas retornaram 403 e não comprovaram o funcionamento. Não houve tentativa de contornar esse bloqueio. A publicação é confirmada pelo Sites; a homologação completa do cadastro e dos anexos com Supabase na versão final continua pendente.
- Nenhum terceiro cadastro foi enviado nessa tentativa, e nenhum rascunho adicional foi criado. As duas contas e o rascunho privado descritos no relatório anterior continuam sendo os testes reais de produção dessa rodada.

## Publicação das correções do OCR

- PR #28 integrada em `6af785a6144758dd7a107b5d66d3efd059bc472f`, candidata `db53921eaecba6281a4526ef3130a3b41b9055a7`, após CI `38971079784` concluído com sucesso.
- **v44 publicada com sucesso às 21:47 UTC**, fonte Sites `2d8005972b9fa315a3c4c6768d6a62dde03781ab`, árvore `bcbfa94bacda9bb0e796458f57bab3a5757aadf0`; ambiente revisão 13 e audiência pública preservados.
- Passaram 348 testes do aplicativo, TypeScript, build oficial e oito imagens reproduzíveis de Tesseract. Ver [escopo e métricas](OCR-CONFIANCA-2026-10-16.md).
- O Rodrigues continua offline. Não houve rodada final de navegador/Supabase na v44, Android físico, novo pedido de produção, cobrança ou geração paga. A assinatura comercial ainda depende da homologação registrada em [HOMOLOGACAO-COMERCIAL-2026-10-16.md](HOMOLOGACAO-COMERCIAL-2026-10-16.md).

## Limites que continuam válidos após a v44

- Viewport móvel no Windows não comprova teclado, memória, bateria, câmera ou instalação em Android físico.
- Google e recuperação de senha estão desativados na configuração efetiva; não foram ativados nesta publicação.
- O prazo gratuito é de sete dias, mas a cobrança obrigatória e o corte após vencimento continuam desativados até a homologação financeira.
- Não foram executadas gerações pagas, cobranças financeiras, pedidos reais ou mensagens para clientes.
- A PR #25 continua separada. OCR de cardápios reais, homologação iFood oficial e ciclo bancário Asaas permanecem nas próximas entregas.

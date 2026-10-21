# Atendimento WhatsApp e importação assistida — 21/10/2026

## Publicação confirmada

A **v80** foi publicada em **21/10/2026, 13:43:53 de Brasília** em https://forno-cardapios.waves4845.chatgpt.site . A audiência pública e a revisão de ambiente **13** foram preservadas.

- PR principal #84; head testado `aee2af1a7c29f46fa1a523e96db166ad0d8c223e`; merge `5ac73c38076c00c6b3a3fbc9bfed195200bc8ac6`.
- Árvore testada/publicada `b3c342d6b05dc785be6b6cf24774555f73dd7ff1`; fonte Sites `a8f2d1996ad468e114dc93dc82b6625d39999f0a`.
- Versão `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_25b6b97e125c8191a66789f39c2cd851`.
- Implantação `appgdep_6ad8ebaf23e08191aa3ab1f88adba279`, `succeeded`.
- Espelho `pizzaria.on-chat` #36; head `05424057a2f8c6c6169744406554ba7d4e995a95`; merge `6fe177060dea658c1a8c6e740e77ebeb0f8b4933`; árvore `b5d10ba69af08608b5bb72cea64b0bd9cac3611b`. Fonte em `legacy/pizzaria-on-source/`; frontend TanStack preservado. Esta sincronização não é deploy do beta Cloudflare independente nem publicação Lovable.

## Comportamento e correções

O dono informa o link da própria loja, WhatsApp com DDD e autorizações separadas de leitura e contato. A fila administrativa mostra o solicitante autorizado. O operador gera um código temporário, recebe fotos da própria loja e entrega o catálogo uma única vez. A coleta externa não é automática por WhatsApp. O dono revisa preços e aprova cada foto antes de salvar somente o rascunho; publicar permanece uma ação explícita.

Corrigidos: catálogo de 200 itens com descrições longas que era cortado para 99; fotos recebidas que desapareciam na recarga; substituição de leitura pendente; perda de edição ao retomar a mesma solicitação; gravações concorrentes de pedidos de assistência, códigos e quota de fotos; uploads que terminavam depois de cancelamento/entrega. Entradas pendentes ficam visíveis e não viram produtos com preço confirmado. O aviso de catálogo abre Cardápio/revisão em navegação nova e em aba existente.

PDF direto antes de perguntas/cadastro e fotos associadas por categoria/identificador da v79 foram preservados. Não há nova geração de imagem ou ativação financeira.

## Validação e evidências

- **559 testes**, TypeScript, build e empacotamento oficial aprovados; execução Linux e Windows.
- Doze cenários reais locais de workerd/D1/R2 cobrem autorização, CSRF/consentimento, propriedade/admin, expiração/rotação/uso único, concorrência, quota, cancelamento durante upload, entrega e migração preservando linhas existentes. Push usa transporte externo simulado e opt-in.
- Chrome [39636220597](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39636220597) aprovado: 13 suítes locais, sete públicas. As públicas rodaram na v79 anterior; a v80 foi confirmada pelo retorno nativo de publicação e pela conferência de banco. Cinco cenários de assistência sem erros: formulário responsivo, fila/link, entrega controlada/recarga, prévia/rascunho e notificação. Pixel 7 emulado.
- Windows [39636220614](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39636220614), auth/pedidos `39636221025`, testes/build `39636220856`, extensão `39636220829` e espelho `39636223411` aprovados nos heads finais.
- Artefato Chrome `12360689839`, SHA256 `396656c8f9885b8e3f19fb4181829fca31a6489e44f99aabdfbe3474a49f87d0`: download conferido, relatório `passed:true`, cinco cenários e zero erros; prévia e rascunho móveis inspecionados, incluindo água alterada de R$5,50 para R$6,00 após recarga e no rascunho.
- A espera de persistência nos testes de assistência/PDF foi corrigida: `waitForFunction` com função assíncrona não repetia uma Promise resolvida como falsa. Agora o teste lê o resultado real do IndexedDB com prazo limitado e só recarrega após confirmar os dados.
- A exceção da origem fictícia de extensão existe somente com as três flags de CI. Configuração normal e produção mantêm os controles padrão.
- Arquivo tar local: SHA256 `3b20879ce278a1a9c1d35540440dacfbe466d024701cfbc0f82a114ae41b0fc4`; conteúdo armazenado pelo Sites: `sha256:6ea814b47c62d4fac9680f0b0658a63e193e3705bf219425cebef394fc4c5088`.

Após publicação, a migração **0016** acrescentou apenas `menu_import_assistance` e `menu_import_assistance_photos`: **32 tabelas**, nenhuma removida. Os **sete cadastros de pizzarias foram comparados integralmente**, sem truncamento, e continuam iguais. Nenhuma conta ou catálogo real foi criado para QA.

## Limites e próxima ação

O número oficial de suporte não foi fornecido nem localizado no histórico. `PEDIDO_SUPPORT_WHATSAPP` continua ausente em produção; a interface aceita a solicitação e informa que o suporte responderá ao WhatsApp do dono. O número sintético do teste não deve ser copiado para configuração, divulgação ou contatos reais. Receber o número oficial com DDD é a próxima informação necessária para ativar e conferir o link direto de atendimento.

Links WhatsApp foram interceptados: **nenhuma mensagem enviada**. Captura de catálogo e imagens são controladas no teste; não há prova de extração real do iFood nem de uso real da extensão em uma loja. A consulta pública de Master Pizzas segue HTTP403/zero produtos. Apify/conector oficial real permanecem pendentes. Sem Android físico ou entrega push real no aparelho, cobrança, chamada paga ou prospecção.

PR #77 incorporada/encerrada; #79 encerrada como incorporada pela #84. PRs #82/#83 foram substituídas durante a homologação; suas fontes não foram publicadas. O objetivo comercial continua R$49/mês, PDF/fotos e suporte humano para três pilotos reais. Pedir novamente, recuperação ativa de carrinho e confirmação bancária automática continuam fora desta entrega.

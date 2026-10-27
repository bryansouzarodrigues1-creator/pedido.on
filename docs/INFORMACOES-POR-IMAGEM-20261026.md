# Informações da pizzaria por imagem — 26/10/2026

## Uso

**Preencher dados com imagem** aparece no início/criador, junto das opções de importação, e em **Pizzaria** no painel. Aceita prints do Google, WhatsApp, redes sociais ou outra fonte e fotos JPG/PNG/WebP. Até oito imagens, 15 MB por arquivo. Pode fotografar, girar, ampliar a origem, extrair texto, corrigir, copiar todo o conteúdo e escolher os trechos.

O leitor organiza sugestões conservadoras de nome, endereço, telefone e horários. No painel também permite descrição, cidade/estado e tempo estimado. Dados sem correspondência automática continuam no texto; **Usar outro trecho ou informação** permite indicar seu destino. Não promete compreender toda imagem ou converter qualquer informação em uma configuração.

Cada campo começa desmarcado. Versões conflitantes são alternativas, sem escolher automaticamente uma. O dono pode editar o texto; ao selecionar um campo já preenchido, a interface informa que substituirá aquele valor. Um telefone encontrado não é assumido como WhatsApp. É necessário confirmar os campos antes de usar.

No criador, os campos aprovados entram nos dados da prévia. No painel, são salvos no rascunho pela API normal, com controle de revisão; **Atualizar/Publicar** continua sendo uma ação separada. Campos não selecionados, produtos, preços, Pix, dados de pagamento e estado de abertura permanecem intactos. Não há nova migração.

## Horários, datas e limites

São reconhecidas linhas explícitas de dias da semana com horários de 24 horas, fechamento, meia-noite e vários períodos, inclusive quando dia e horário ficam em linhas separadas. Dias ausentes não são completados. Datas especiais continuam como texto, sem conversão de fuso ou transformação silenciosa em horários semanais. Textos e horários extensos exigem escolher um trecho dentro do limite do campo.

Esta importação preenche o texto exibido ao cliente. Não cria agendamento de pedidos, calendário automático, regras de feriados ou abertura/fechamento programado. Quando a leitura está incerta, o dono confere o trecho original; também pode preencher manualmente.

## Leitura e armazenamento

Reutiliza o Tesseract e os ativos servidos pela própria origem. Não chama Google, Meta, OpenAI ou Lovable, nem usa um robô para entrar no perfil. A imagem é preparada localmente; para prints escuros, somente a cópia de trabalho do OCR recebe ajuste de contraste. A imagem disponível para conferência é mantida.

Imagem e texto podem ficar no IndexedDB por sete dias, com chave separada por pizzaria e separação do criador público/administrativo. Não sobem para R2/D1. Ao voltar, o texto pode ser organizado novamente e os campos precisam ser selecionados outra vez. O botão de remoção limpa somente a leitura local, sem apagar informações já usadas na pizzaria. Falha de armazenamento é informada. Cancelamento e saída interrompem o worker; não há repetição automática de gravações.

## Validação

Quatorze testes de regras cobrem semana do Google, períodos, meia-noite, dados conflitantes, horários impossíveis, datas especiais, baixa confiança, campos permitidos e preservação do restante do cardápio. A leitura real local passou em três documentos sintéticos: tabela clara, tabela escura e mensagem com dados. O primeiro ensaio escuro perdeu o domingo; o ajuste de contraste foi aplicado antes da segmentação e a nova leitura conferiu todos os sete dias.

O cenário de Chrome adicional exercita OCR real na interface móvel, prévia e recarga, arquivo inválido sem perder a leitura, aplicação seletiva via API real isolada, preservação da publicação anterior, publicação explícita e remoção da cópia local. O cenário passou nos dois ensaios Chrome finais, com zero erros e somente as duas alterações de negócio previstas na base isolada (salvar rascunho e publicar explicitamente). Publicado na v102, fonte `8c0d28c9df4bbb1474a177d6fda42668f58529cf`, ambiente 20, em 27/10/2026 às 01:01 UTC. A abertura do leitor foi conferida na Netlify. A regressão final teve 732 testes aprovados, tipos/build e CIs Chrome/Windows/auth verdes. Documentos são sintéticos; não são homologação de qualquer print de cliente nem de câmera Android física.

Reprodução local das regras: `node --experimental-strip-types --test scripts/business-info-reader.test.mjs`. OCR: `node --experimental-strip-types scripts/check-business-info-ocr.mjs`. Navegador: `scripts/check-business-info-browser.mjs`, somente no runner isolado de QA. Nenhum envio externo, pagamento ou geração paga.

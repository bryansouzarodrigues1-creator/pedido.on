# Leitor por foto e promoção do dia

**Publicada na v21 em 12/10/2026**, no mesmo projeto Sites, PR #8 integrada. Início, calculadora, demo e arquivos de OCR foram conferidos por GET real; os bytes de OCR coincidiram com os testados. Nenhum modelo pago é chamado por estas funções. Câmera/toque/retomada no celular ainda precisam de validação. A correção adicional de cancelamento da PR #9 está em rascunho e não foi publicada porque o ambiente ficou offline.

## Uso do leitor

Em **Cardápio → Enviar foto do cardápio**, escolher câmera ou galeria. Até oito fotos JPG/PNG/WebP, 15 MB por arquivo; a preparação local ajusta tamanho/orientação, mantendo uma cópia JPEG para conferência. Há giro manual e entrada alternativa por texto. Cadastro manual permanece disponível.

A primeira leitura carrega Tesseract.js 7 e o idioma português. Worker, três variantes LSTM e treinamento são servidos pela própria origem, sem CDN de terceiros no fluxo do cliente. O treinamento tem SHA-256 fixo e é verificado no build; os arquivos gerados ficam fora do Git e entram nos ativos da implantação. O pós-instalação de doações da dependência é explicitamente desativado; nenhum script novo foi aprovado em bloco.

O OCR roda no aparelho, em um Web Worker. Agrupamento por posição associa as colunas de preço às linhas e separa colunas paralelas do cardápio. O processamento usa um worker para o conjunto de fotos, com progresso, cancelamento e gravação incremental das páginas lidas.

A revisão mostra nomes, ingredientes, categorias, preços P/M/G e itens simples. Bordas têm destino próprio. Uma confirmação do dono permite acrescentar vários itens ao rascunho; a versão pública só muda depois de **Publicar/Atualizar**. A prévia usa o cardápio e os botões de compra existentes, sem gerar imagens ou código por IA.

Preços ausentes/ambíguos não são inventados. Um preço de pizza sem tamanho precisa ser associado pelo dono; há preenchimento em lote quando todos esses valores representam o mesmo tamanho. GG/família/medidas não são convertidos silenciosamente para P/M/G. Trechos de contato, entrega e ofertas ficam separados para conferência, não viram produtos. Fontes difíceis continuam precisando de correção ou outra foto; a extensão de tamanhos além de P/M/G ainda é uma etapa futura.

Itens já cadastrados começam desmarcados. Uma atualização selecionada e confirmada preserva IDs, imagens e propriedades que não foram importadas; os produtos restantes e o Pix não mudam. Limites de 200 produtos, 20 categorias e 12 bordas são validados antes de aplicar. Não há o antigo corte de 35 itens por solicitação de modelo.

Foto, texto reconhecido e ajustes ficam em IndexedDB, separados por pizzaria, disponíveis para retomada por até sete dias neste navegador. Não há envio dessas fotos ao D1/R2, OpenAI ou Lovable pelo leitor. Páginas já reconhecidas não precisam ser relidas; pendências de preço/tamanho são mantidas quando o dono importa o restante. Limpar os dados do navegador perde essa cópia local. Dados inválidos/expirados não são restaurados.

## Promoção do dia

Escolher um produto existente, tamanho quando necessário, preço menor que o normal e encerramento no horário de Brasília. A oferta vai para o rascunho e exige publicação. O campo JSON de promoções é opcional nas lojas antigas e recebe lista vazia ao validar; nenhuma migração ou alteração em massa das pizzarias é necessária.

O servidor só aplica ofertas dentro do prazo e ao produto/tamanho correto. Pizza promocional vale inteira; meio a meio usa a regra normal. Borda é acrescentada normalmente. Cupons não acumulam com a linha promocional e continuam aplicados a outras linhas elegíveis. O preço-base não é alterado quando a oferta termina, e pedidos já registrados conservam seus valores.

O cliente envia o total que confirmou. Se o valor vigente mudar, a API responde 409 com os valores atualizados, sem criar o pedido; a tela apresenta a nova cotação e exige outra confirmação. O preço final é sempre recalculado no servidor. Repetir um pedido já registrado conserva seu total e token privado.

Depois de publicar, o dono pode copiar uma mensagem pronta com nome, preço, validade e link. É texto montado por regras, sem IA e sem envio automático. Divulgação criativa e cotas por planos superiores permanecem futuras.

## Verificações

- **151 testes** passaram no aplicativo: importação, valores BRL, itens sem tamanho, duplicados, bordas, recuperação local, aprovação de total, expiração e não acúmulo com cupom, além dos fluxos anteriores. Serviços de IA/Auth e D1/R2 dos testes automatizados são adaptados/simulados; IndexedDB usa `fake-indexeddb`.
- OCR **real**, sem respostas simuladas e sem API paga, em três imagens reproduzíveis: tabela com P/M/G; duas colunas; JPEG inclinado/escurecido. Todos os itens esperados e seus preços foram verificados. Tempos locais de 0,394–0,821 s por imagem após inicializar o worker; não representam uma promessa de velocidade em celular nem o download inicial.
- Typecheck e build/empacotamento final pelo fluxo oficial Sites passaram. A v21 foi publicada com ambiente revisão 6. As 14 tabelas de negócio comparadas permaneceram iguais; GETs de páginas públicas e cinco ativos OCR retornaram 200, com hashes de bytes conferidos.
- O navegador de QA exigido pelo fluxo Sites não está disponível nesta sessão. Câmera, toque, cancelamento e retomada no aparelho original ainda precisam de validação do proprietário; não declarar uma revisão móvel executada.
- Cópia privada de 14 tabelas de negócio do D1, sem truncamento, foi guardada antes da implantação. Isso não é um backup integral de sessões ou do R2. Não houve migração, alteração de chave, mudança de cota ou nova geração Lovable.

Execução do OCR reproduzível: `node --experimental-strip-types scripts/check-menu-ocr.mjs`. Os arquivos de QA ficam em `.sites-runtime/ocr-qa`, fora do Git. Preparação dos ativos: `pnpm ocr:assets`; o build normal também executa essa etapa.

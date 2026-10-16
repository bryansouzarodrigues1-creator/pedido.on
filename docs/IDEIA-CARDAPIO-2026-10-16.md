# Entrada pela ideia e cardápios com composição própria

Implementação de 16/10/2026 sobre a produção v39. A PR deste pacote registra os identificadores finais de fonte, CI, versão e implantação.

## Comportamento

- A página inicial começa com a descrição da pizzaria e uma prévia, antes do cadastro. O dono pode trazer o link iFood, texto completo, TXT/CSV ou até oito imagens no mesmo fluxo.
- A prévia inicial é gratuita e determinística, identificada na interface como composição pronta. Nenhum modelo é chamado anonimamente. No painel, a IA já conectada continua disponível para interpretação e textos, mediante solicitação do dono.
- Há quatro composições implementadas no cardápio público: lista artesanal, fotos em destaque, lista compacta sem fotografias de produtos e cartões. Capa, tipografia e cantos também podem mudar. O editor usa as mesmas propriedades que a página publicada.
- O briefing fica no navegador por até sete dias. Fotos e leitura usam um checkpoint próprio por tentativa; só são removidos depois de gravar a cópia da pizzaria criada. O prompt não vai na URL de cadastro. Texto continua utilizável quando IndexedDB estiver indisponível.
- A criação pede primeiro a ideia, depois o nome. WhatsApp e pagamento ficam para a configuração da loja. O rascunho já recebe o visual escolhido e continua sem produtos fictícios ou publicação automática. Após criar, a URL deixa de pedir outra loja ao recarregar.
- Alertas de primeira ativação não ocupam o topo de lojas ainda não publicadas; a fila de entrega vazia não ocupa um cartão. Alertas de lojas publicadas e solicitações reais continuam ativos.

## Falha da IA

O erro real de 15/10 às 22:13 em Brasília ocorreu na validação de uma sugestão opcional de foto: `asset=product` sem `productId`, numa loja vazia. O aplicativo rejeitava toda a proposta.

A normalização agora tolera exclusivamente esse alvo ausente: usa o produto explicitamente selecionado, quando existe, ou omite a sugestão de foto e avisa no resultado. Texto e identidade válidos são preservados sem repetir a chamada. Campos de pagamento, IDs estrangeiros, produto diferente do selecionado e estruturas desconhecidas continuam rejeitados. A proposta é apenas uma prévia até o dono aplicar e publicar.

## Leitor

Capturas de detalhe são tratadas como um produto base. Avaliação, tempo, taxa de entrega, botões, quantidade e grupos opcionais não viram produtos. Um preço personalizado/promocional precisa de revisão individual antes de entrar numa seleção em lote. Linhas sem evidência de produto/preço não viram uma lista de cartões ilegíveis; nomes sem preço em seções explícitas continuam disponíveis para ajuste.

A segmentação automática é usada para imagens altas, como capturas de celular; tabelas e fotos largas mantêm a segmentação anterior. Sem upload a modelo ou consumo pago.

CSV: colunas `nome`, `categoria`, `tipo`, `descricao`, `p`, `m`, `g`, `preco`. Valores em reais. O modelo público é `/modelo-cardapio.csv`. Separador vírgula ou ponto e vírgula, com aspas suportadas. TXT usa a leitura existente. Não há associação automática de preço sem tamanho ao tamanho G.

## iFood: limite externo explícito

O endpoint `/api/menu-source` tenta **uma consulta à página pública canônica**, somente em HTTPS e domínio iFood validado, sem autenticação e sem seguir redirecionamentos. A leitura tem limite de 1,5 MB, timeout e limites por IP/global em D1. Cookies e credenciais do visitante não são encaminhados.

Só itens estruturados `MenuItem`/`MenuSection` com oferta BRL inequívoca são lidos. Avaliações, taxas e rótulos derivados da URL não são catálogo. Bloqueio, ausência de estrutura ou falha retornam `needs_content`, com texto/arquivo como alternativa, sem catálogo simulado.

O link real da Aione fornecido pelo proprietário respondeu **403** na consulta realizada nesta sessão. Portanto, este pacote **não comprova importação automática dessa loja**. Integração oficial continua dependendo de aplicação homologada, módulos e autorização da pizzaria; CNPJ sozinho não autoriza o catálogo. Ver [requisitos e funcionamento](IMPORTACAO-IFOOD.md).

## Validação e limites

- **312 testes do aplicativo e typecheck aprovados** no checkout oficial. Build e empacotamento seguem o fluxo Sites; os resultados finais constam na PR. As verificações incluem cadastro, cobrança, preços, combos, WhatsApp, autorização e pedidos existentes.
- Testes novos de estruturas reais em SSR, contrato da IA, criação a partir da ideia, handoff/retomada em IndexedDB, CSV, ruído e preços promocionais.
- Rota nova executada em **workerd com D1 local**, com transporte iFood simulado: bloqueio, catálogo estruturado, limite de tentativas, cabeçalhos isolados e redirecionamento recusado.
- OCR Tesseract real da captura de hambúrguer enviada: **um produto, X tudo**, ingredientes preservados, tipo simples, R$ 0,90 apenas para revisão, não selecionado. Três modos de segmentação produziram o mesmo produto após o filtro. O modo automático descartou ruído da fotografia.
- OCR real também passou em tabela, duas colunas, foto inclinada e quatro cenários de recorte com fotos à esquerda/direita, produtos próximos e sem foto.
- Execução repetível da captura autorizada: `node --experimental-strip-types scripts/check-menu-detail-ocr.mjs /caminho/absoluto/captura.jpg`. A captura original e os relatórios privados não entram no GitHub.
- A renderização foi conferida em SSR; **hidratação, toque, câmera, acesso autenticado e aparência em celular não foram validados por navegador nesta execução**, pois o ambiente não disponibiliza o controle de navegador requerido pelo fluxo Sites.
- Respostas de modelos, identidade externa, Asaas e iFood dos testes são simuladas quando indicado. Não houve geração paga, compra de saldo ou cobrança real nesta etapa.

## Compatibilidade e reversão

Não há migração nova: `presentation` é opcional no JSON do cardápio. Dados publicados antigos sem o campo mantêm a composição anterior até uma edição do dono. Contas, sessões, D1/R2, preços, planos, cotas e fiscalização comercial permanecem preservados. A versão v39 é o ponto de reversão do aplicativo; o novo campo pode permanecer nos rascunhos sem alterar dados financeiros.

Próximas provas: revisar o visual e o fluxo com uma conta nova no celular; realizar um cardápio real com preços/tamanhos complexos; validar o conector oficial iFood quando as autorizações existirem. Este pacote não atribui uma porcentagem de conclusão ao produto.

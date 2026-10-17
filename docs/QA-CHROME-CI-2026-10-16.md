# Chrome no CI e correção de colunas — 16/10/2026

**Atualização de 17/10:** este documento registra a v45. A [v46 já foi publicada e passou em 46 cenários de Chrome](REVISAO-V46-2026-10-17.md). O [cadastro/Supabase real histórico passou nas seis verificações](QA-CADASTRO-REAL-2026-10-16.md); as menções a essa pendência abaixo refletem o momento anterior ao ensaio.

O computador Rodrigues não é necessário para continuar os testes automáticos. O workflow `browser-qa.yml` usa Chrome 155 instalado no runner Ubuntu, Node 24 e ferramentas Playwright separadas das dependências do aplicativo. Guarda capturas, relatórios e logs por 14 dias; não guarda perfis, cookies ou variáveis locais.

## Falha real encontrada

O OCR no navegador leu quatro itens de uma imagem com cinco produtos. Os títulos e produtos das duas colunas estavam em alturas diferentes; apenas uma linha tinha produtos dos dois lados. A categoria Bebidas passou para uma pizza, a descrição de uma pizza foi associada ao refrigerante e o suco ficou na linha do frango.

A candidata `edc0dfe23afa74958dbb3d74bccbf31cf3959b2e` verifica evidências repetidas de produtos com preço em cada lado, mesmo sem duas linhas alinhadas. Dois novos testes protegem esse caso e a recusa de divisões sem evidência suficiente. O teste novo falhou antes da correção e passou depois. Tabelas P/M/G continuam preservadas.

Passaram **354 testes**, sem falhas/ignorados, TypeScript e build oficial. O CI de domínio/build/OCR é `38975573687`. Os oito fixtures anteriores de Tesseract continuam cobertos; não confundir essas imagens reproduzíveis com cardápios de clientes.

## Fluxos de navegador

Na candidata, passaram **24 verificações**, sem erros de JavaScript:

- 14 do criador: entrada sem conta, texto longo, larguras 320/360/412, oito estilos em duas rodadas, rolagem horizontal, refinamentos sucessivos e pedido fora do motor local, TXT/CSV, logo/capa separados, foto separada, reabertura do Chrome, preservação ao atualizar as prévias, ida ao cadastro e armazenamento indisponível.
- Quatro da calculadora: gravação imediata, recuperação, aviso de falha de armazenamento e downloads.
- Quatro de handoff: nome e briefing recuperados, estilo/refinamento e arquivos transferidos para um rascunho privado vazio, envio de logo/capa ao R2 local, reabertura e novo login sem duplicar a loja.
- Dois de OCR pelo formulário real: tabela e colunas desalinhadas, nove produtos e 13 campos de preço corretos, com CPU desacelerada 4x.

As capturas dos oito estilos foram inspecionadas: capas dividida/compacta/integral, listas, cartões, vitrines e fontes diferem. Não é geração arbitrária de layouts. O viewport curto de 480 px não representa teclado Android físico.

O handoff usa o mock oficial Sites. Seu cookie termina ao fechar o Chrome, portanto o teste entra novamente nessa identidade antes de conferir os dados; não afirma persistência de sessão Supabase a partir desse mock. Cadastro Supabase completo na versão publicada continua uma homologação distinta.

## Produção

**v45 publicada às 22:28:23 UTC**, fonte `912223a732c851d8ca3c1be80ccd8c3d86b26f8c`, árvore `b3d998cdb80a70f2b904c045f24172b36585f740`, idêntica à candidata validada. Implantação `appgdep_6ad2a4f0a5a48191ae5f241d11c38a21`, ambiente 13, mesma audiência pública e mesmos bindings. Nenhuma migração, mudança de plano/configuração financeira, cobrança ou geração paga.

URL: https://forno-cardapios.waves4845.chatgpt.site/criar

A rodada pública exercita o mesmo criador, calculadora e OCR, impedindo POST/PUT/PATCH/DELETE da aplicação. A verificação normal de segurança Cloudflare na mesma origem permanece permitida. Não cadastra contas, cria pedidos, envia imagens ao servidor ou chama IA paga. Service workers ficam bloqueados nessa rodada para que não escapem à proteção de rede; PWA não é homologado por ela.

O CI `38975573660` inicialmente registrou o erro conhecido na v44, apesar de a candidata passar. A **tentativa 2**, após a v45, passou nos **24 cenários locais e 20 públicos**, sem falhas ou erros de JavaScript. Concluiu às 22:30 UTC. O OCR público conferiu nove produtos e 13 campos de preço em 1367/1364 ms com CPU desacelerada 4x; os tempos são dessa execução, não de Android físico. Artefato `12079376413` (`chrome-qa-38975573660-2`).

## Cardápio público real: limite confirmado

Foi obtido legitimamente, por HTTP 200, o PDF público [4 Estylo’s 2025](https://4estylos.com.br/public/archives/CARDAPIO_PIZZARIA_2025.pdf), SHA-256 `437c75008bda1d024215f2adcce0ce97fccbabb42e237a330219cc8f340816c1`. As páginas 11 e 19 foram inspecionadas e rasterizadas com altura de 2200 px; OCR Tesseract local, JPEG 92, mesmas regras de associação. Os arquivos originais e imagens ficam fora do Git.

O resultado atual é insuficiente: a página de pizzas devolveu dois candidatos, nenhum pronto; bebidas devolveu 19 candidatos, nenhum pronto. Os 21 alvos simples conferidos manualmente — oito pizzas e 13 bebidas — não resultaram em itens prontos. Títulos coloridos em fundo escuro, códigos M/G, linhas gráficas, adicionais e listas de sabores precisam de tratamento próprio. Isso é avaliação de um PDF público real pelo motor local, não teste Android nem aprovação do OCR comercial.

Próxima prioridade: melhorar contraste e estrutura nesses casos reais, medir nomes/preços/tipos contra a referência e reduzir candidatos espúrios sem preencher incertezas arbitrariamente. As demais pendências permanecem: Android físico, Supabase/Google e recuperação externa, Asaas financeiro, notificações/PWA e beta comercial.

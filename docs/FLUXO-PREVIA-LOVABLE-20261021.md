# Criador com prévia antes da conta — 21/10/2026

O criador aceita uma descrição, PDF/fotos ou texto. Uma descrição escolhe imediatamente a direção mais próxima entre 240 composições novas e 12 identidades anteriores. As composições combinam família, paleta, tipografia, densidade, proporção das fotos e textura. Madeira e nostalgia têm uma família própria. A seleção é local e determinística; não há chamada a modelo para escolher um preset.

Uma loja sem cardápio recebe uma prévia vazia. Produtos, endereço e horários podem ficar para depois. Produtos importados conservam preços e aguardam confirmação. O proprietário pode mudar de modelo e ver os mesmos dados preenchidos. O nome permanece editável.

## Compartilhar e salvar

`POST /api/guest-previews` guarda uma fotografia dos dados em R2 e metadados em D1. O link `/v/<token aleatório de 128 bits>` abre sem conta, vale sete dias, não é indexado e mostra que ainda não recebe pedidos. Fotos inline são limitadas a JPG/PNG/WebP com verificação de assinatura; SVG, scripts, URLs de rastreamento e caminhos relativos perigosos são rejeitados. Há limites de tamanho e de criação por visitante e IP.

Somente “Salvar minha pizzaria” apresenta dados finais, melhor e-mail e senha no mesmo formulário. O fluxo reutiliza os endpoints de autenticação existentes. Confirmações de preços e direito das fotos precedem o salvamento. A loja é criada em rascunho; o ID fica no checkpoint para retomar uma falha sem criar outra loja. Nenhuma senha entra no checkpoint ou em URLs.

A migração 0017 é aditiva: cria `guest_menu_previews`, um índice de expiração e uma view com dois triggers de WhatsApp. A normalização compara formatos brasileiros equivalentes. A verificação visual é antecipada e os triggers impedem duplicatas concorrentes em INSERT/UPDATE. Cadastros legados, inclusive eventuais duplicatas anteriores e JSON inválido, não são reescritos; editar outros campos conserva o número antigo. Isso verifica unicidade, não titularidade por SMS.

## Lovable

O repositório `pizzaria.on-chat` passa a compilar o criador real na raiz TanStack, em `/` e `/criar`, e reutiliza os componentes preservados em `legacy/pizzaria-on-source`. Prévia, painel, acesso por e-mail e cardápio de compradores usam as APIs existentes por um proxy de mesma origem no servidor. Não há iframe, cópia de banco ou transferência de cookies entre sites. Cada host recebe sua própria sessão de navegador, autenticada pelo mesmo backend e provedor.

O proxy aceita somente `/api/`, `/media/`, `/ocr/` e `/pdf/`, rejeita escritas de outra origem, conserva CSRF e cookies HttpOnly e mantém destinos fixos. Google OAuth continua configurado no host original, por isso a interface Lovable oferece acesso por e-mail. D1, R2, permissões e autorização de pedidos continuam no backend existente. Os limites de IP no backend também se aplicam ao tráfego intermediado.

## Extensão e captura assistida

“Baixar extensão e exportar meu cardápio” leva a `/extensao`, com ZIP beta 0.4.0 e instruções para computador. O TXT exportado entra no leitor existente; JSON é uma cópia da captura. Não há extensão instalada automaticamente ou publicação na Chrome Web Store.

A extensão lê o DOM já carregado pelo responsável. O fluxo de operação assistida da versão 80 permite entrega por código temporário de uso único, vínculo à loja e revisão do dono. Ter um servidor próprio com Chromium/Playwright é tecnicamente possível e pode reaproveitar o mesmo extrator; não garante que um link bloqueado carregue. Um serviço assim precisa fila, isolamento por trabalho, limites e uma etapa de revisão. Não foi provisionado servidor pago nem habilitado robô de captura nesta alteração. A API oficial exige credenciais e autorização da loja.

## Verificação

Testes cobrem as 252 identidades, preservação dos preços, escolha por madeira/nostalgia, execução real D1/R2 sem conta, expiração, CSRF, entradas inseguras, preservação de legados e concorrência de WhatsApp. A suíte Chrome nova substitui cenários da jornada antiga de cinco perguntas e cadastro antecipado. Os testes de calculadora, PDF/OCR, painel, pedidos, segurança de lojas e entrega assistida continuam.

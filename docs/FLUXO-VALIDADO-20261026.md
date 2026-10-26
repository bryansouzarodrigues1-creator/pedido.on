# Continuidade e fluxo do cliente — 26/10/2026

A base publicada anteriormente era v98. As PRs principais #126 e #127 haviam
corrigido o texto antigo do cadastro e criado a verificação pública, mas ainda
não tinham sido publicadas no backend. Esta entrega inclui a main atualizada,
preservando a oferta de dez dias e os vencimentos anteriormente concedidos.

No teste manual público, o criador reconheceu nome, três produtos e seus preços,
aplicou cores, permitiu buscar e escolher entre os oitenta modelos e conservou o
rascunho após atualizar o aplicativo. Pizzas sem tamanho ficaram pendentes de
conferência. Os dados usados eram fictícios e nenhuma conta foi criada no QA.

Foi identificado um erro de apresentação: a prévia completa anunciava a loja
aberta, o prazo e a entrega sem taxa herdados dos valores iniciais. Agora toda
prévia informa prazo, entrega e pagamento a confirmar. O carrinho e o checkout
simulado não somam uma taxa não confirmada nem a apresentam como gratuita.
As condições configuradas do cardápio publicado continuam sendo exibidas.

As regressões cobrem apresentação e checkout da prévia, além do cenário Chrome
que monta um carrinho de exemplo. Os fluxos de pedido, aprovação, fotos, PDF,
galeria, calculadora, administração, promoção e recuperação do rascunho permanecem
na bateria isolada. Identidade externa e serviços pagos são simulados nela.

As fiscalizações comerciais continuam desligadas; a franquia de IA respeita o
vencimento do teste. O primeiro pagamento externo, a recuperação forte da issue
#116 e a captura iFood real continuam pendentes. Nenhuma geração paga, cobrança,
mensagem externa, senha, chave de sessão ou exclusão foi executada nesta entrega.

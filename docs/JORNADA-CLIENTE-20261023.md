# Jornada do cliente — 23/10/2026

Continuação do criador visual v83, sem troca de contas, dados, infraestrutura ou plano comercial. PR principal [#95](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/95), espelho Lovable [#49](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/49).

## Correções

- A prévia compartilhada de uma loja sem produtos mostra as mesmas pizzas, fotos e preços de demonstração. O aviso informa que são exemplos; o objeto salvo no D1/R2 e o cadastro da loja continuam sem esses produtos. Produtos e preços reais sempre prevalecem.
- A prévia pode ser reaberta após falha de conexão, e não mantém um cardápio visível quando a resposta informa expiração ou erro.
- O salvamento verifica o status HTTP da configuração e da sessão, limita a preparação a 15 segundos e permite repetir a preparação sem perder os dados digitados. Falha de sessão não vira um cadastro anônimo por engano.
- Alterar o nome na prévia atualiza o formulário final enquanto o cliente ainda não o editou diretamente. Uma edição manual do formulário é preservada.
- Alterar produtos ou preços exige nova conferência; trocar apenas o visual preserva a conferência. Uma referência síncrona bloqueia dois envios no mesmo instante. Repetir depois de uma falha ao salvar reutiliza o rascunho já criado.
- A conversa do pedido recebe a chave que o acompanhamento já recuperou. Assim, o pedido reaberto pela sessão temporária continua com conversa quando o navegador bloqueia localStorage.

## Validação

Passaram 604 testes locais, TypeScript e compilação. O frontend Lovable passou 24 testes React, TypeScript e build TanStack. A fonte funcional do espelho é exatamente a árvore `e6282c821b474009f47390e713fb10b90a7b4728` da candidata principal.

| Jornada | Verificação |
| --- | --- |
| Criador | Descrição e nome, quatro sugestões, busca nos 80 modelos, fotos, preços, prévia sem cadastro e rascunho real |
| Recuperação | HTTP 503 na configuração e na sessão, nova tentativa, nome editado, WhatsApp duplicado, preços não conferidos, autenticação recusada e falha após criar rascunho |
| Compartilhamento | Visitante novo, exemplos sem cadastro de produtos, resposta 503, repetição e link expirado 410 |
| Carrinho | Busca vazia, categorias, pizza meio a meio, tamanho, borda, quantidade, observações e bebida; persistência após recarregar |
| Confirmação | Campos obrigatórios, telefone inválido, retirada sem taxa, cupom inválido e válido; reconfirmação após desconto e reajuste real no servidor |
| Pedido | Dois envios no mesmo instante criam um pedido; o total confirmado de R$164,40 é calculado no servidor |
| Privacidade | Mesmo navegador recupera o acompanhamento; navegador novo sem chave recebe 404 e não vê o cliente |
| Comprovante | Arquivo disfarçado é rejeitado; PNG marcado como fictício é armazenado no R2 local e exige conferência da pizzaria |
| Operação | Aceite, confirmação explícita do Pix, previsão, conversa nos dois sentidos, preparo, saída e conclusão; conversa encerra ao concluir |
| Dispositivos | Chrome real com Pixel 7 emulado e telas de 320, 412 e 1280 px; Windows executa a suíte própria |
| Outros fluxos | Calculadora, importação PDF/TXT/HTML, OCR, 12 estilos, painel, verificação/denúncia da loja e entrega assistida de cardápio |

Os dois novos scripts são `scripts/check-creator-recovery-browser.mjs` e `scripts/check-customer-journey-browser.mjs`. O workflow de Chrome os executa junto das oito suítes anteriores em cada PR aplicável e preserva relatórios e capturas por 14 dias.

A primeira execução de Chrome aprovou a compra completa e nove das dez suítes. A última asserção da recuperação falhou porque a página HTML simulada de destino não declarava UTF-8. A captura confirmou que o aplicativo havia chegado ao destino; o mock foi corrigido e a rodada completa repetida. Isso não era uma falha de produção.

## Publicação e evidências

A v84 foi publicada em 23/10/2026 às 20:24 de Brasília, ambiente revisão 13, deployment `appgdep_6adbecaa6500819194bc392c416d3170`, com fonte Sites `ad67d72939c45a2f218e14147b58d256e96ae5ba`; arquivo de implantação SHA256 `2cc4ec665d17976cd1baf0c105a73850a6e29dd1e1e2dbd36c5ce47822306c25`. A rodada final abaixo passou integralmente. PR #95 integrada em `dfe9dc8209a656fd25ed2c7c5df397ea440776cc` e espelho #49 em `dad76e89908b861b51f5f726360d8954301c1927`.

- Chrome: [40034886774](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40034886774).
- Windows: [40034886485](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40034886485).
- Autenticação e pedidos: [40034886736](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40034886736).
- Conversa: [40034886495](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40034886495).
- Frontend Lovable: [40034922409](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/40034922409).

## Limites e preservação

Todos os cadastros, pedidos, denúncias e comprovantes de teste usam D1/R2 descartáveis no GitHub Actions. O acesso por e-mail/Supabase e as falhas de cadastro são simulados; a gravação de um rascunho real no ambiente isolado usa a identidade local oficial. Nenhuma transferência bancária, mensagem WhatsApp, e-mail ou chamada paga de IA foi feita.

Sete registros completos de restaurantes foram lidos antes da publicação; somente um está publicado. O cardápio público e sua API responderam 200. Saúde, criar, entrar, calculadora, extensão, demonstração de pedidos e configuração de cadastro responderam 200; cadastro direto está ativo sem convite, e recuperação por e-mail permanece desativada. As verificações públicas são somente leitura.

A consulta real iFood permanece HTTP 403/zero produtos, sem nova tentativa. As respostas do robô usadas pelo criador são controladas; isso não homologa importação real. Não foi usado Android físico, impressão física ou banco real. O navegador interativo da prévia local continuou com conexão recusada; a inspeção visual foi feita nas capturas do Chrome do GitHub, sem modificar o aplicativo para contornar a infraestrutura.

# Atendimento Pro e divulgação — 28/10/2026

## Pedido e oferta

O proprietário pediu uma IA que entenda a loja, promoções mais chamativas, uma interface simples para o dono e um atendente que responda aos clientes. A nova oferta é **Essencial R$49/mês** e **Pro R$89/mês**. O atendente do cardápio é exclusivo do Pro ativo; a seleção de um plano no rascunho ou uma fatura pendente não concede esse recurso. O ID histórico `rede` e seus valores permanecem para faturas antigas, sem nova oferta pública.

São preservados os 10 dias de teste, as campanhas incluídas, a assinatura antecipada que soma o teste restante e as 20 novas imagens por conta/semana, de segunda a domingo em Brasília. Textos e artes compostas localmente continuam ilimitados. Nenhuma assinatura existente é trocada, cancelada ou cobrada por esta atualização.

## Atendimento

- **Painel → Atendimento**: nome, boas-vindas, estilo, ativação, até 12 perguntas frequentes, resumo do conhecimento da loja e histórico dos últimos 30 dias. O cliente experimenta uma prévia local sem chamar modelos.
- Tudo começa **desativado**. Salvar e publicar continuam explícitos e usam a revisão existente. A configuração do rascunho não muda o atendimento publicado.
- O atendente considera os produtos disponíveis e seus valores atuais, ingredientes descritos, ofertas válidas, horário informativo, disponibilidade atual, entrega/retirada, formas de pagamento e instruções para pedir. Perguntas simples são respondidas localmente. Questões abertas usam o serviço Lovable existente e selecionam fatos/produtos conhecidos, que o aplicativo apresenta com valores verificados.
- A IA não cria pedidos, não altera o carrinho automaticamente, não confirma pagamentos, não lê pedidos privados nem inventa descontos. Restrições alimentares, reclamações e dados ausentes oferecem contato com a loja. Não garante quantidade de pessoas por tamanho ou ausência de contaminação cruzada.
- Uma conversa é privada ao token aleatório daquele visitante e à loja correta. Tokens são armazenados somente como hash no D1, nunca em URLs. O dono e a administração autorizada veem o histórico; outras contas não. E-mail, telefone, CPF e links comuns são omitidos das perguntas enviadas ao modelo. O visitante é avisado para não enviar documentos, senhas ou comprovantes.
- Até 30 perguntas por conversa, limites por visitante e 60 interpretações de IA/dia por dono. Reserva de texto e orçamento estimado usam a proteção transacional existente, sem elevar o teto da plataforma. Não há retry pago automático: mesma tentativa reutiliza o resultado; falha anterior ao claim devolve a reserva, falha ambígua posterior permanece contada.
- O Pro é confirmado no servidor por acesso administrativo vigente ou pagamento confirmado. Liberações antigas de Pro, que usavam o ID Essencial, continuam reconhecidas pelo `tier`. Expiração, suspensão e downgrade bloqueiam novas chamadas. A interface pública não exibe o botão para o Essencial.
- **Admin → Pizzaria → Atendimento IA** permite acompanhar as conversas, sem gerar respostas nem consumir créditos. O histórico de atendimento fica separado das criações de marketing.

## Contexto e promoções

O Estúdio recebe fatos da loja, categorias e produtos relevantes para a mensagem, em vez de usar apenas os primeiros 12 itens. Pix privado, conta, sessões e pedidos de clientes não entram no contexto de criação. Orientações privadas da equipe continuam no Estúdio, sem aparecer no atendimento público.

As ideias diárias passam a oferecer chamadas mais marcantes e legendas diferentes para WhatsApp, Status, Instagram e Facebook. Os preços são do catálogo publicado e a modalidade de entrega/retirada é respeitada. Novos PNGs de 1080×1080 e 1080×1920 usam as fotos existentes, fundo com cores da marca, preço em destaque e chamada para o cardápio. Não criam desconto ou foto paga automaticamente. Alteração de preços, loja ou entrega invalida a divulgação antiga; combos exigem conferência e publicação.

## Implementação e verificação

Migração **0025** aditiva, com `assistant_conversations` e `assistant_turns`, índices e relação de exclusão em cascata. A base passa de 41 a 43 tabelas. Os novos campos do cardápio têm valores padrão compatíveis com lojas antigas. Nenhuma conta, sessão, imagem ou preço é reconstruído.

Testes de política e backend cobrem fatos reais, busca de itens além dos primeiros 12, omissão de contato, acesso Pro, token privado, separação entre lojas, histórico de dono/admin, idempotência, reserva de orçamento e falhas do provedor. A cobrança simulada verifica Pro de R$89, ausência de direito antes do pagamento e revogação após estorno. O serviço de IA tem teste específico do propósito autorizado, mantendo modelo, claim de uso único e limite de saída.

O novo ensaio do Chrome usa D1/R2 descartáveis do GitHub e identidade local oficial simulada: configurar, prévia gratuita, salvar, publicar, cliente anônimo, perguntas frequentes, alergias, retomada, histórico, seleção de Pro e downgrade. As artes continuam com downloads PNG reais e revisão dos preços. Nenhuma geração de IA, pedido, pagamento ou WhatsApp real faz parte do ensaio.

**Preparado na [PR #144](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/144), ainda sem publicação. A produção confirmada permanece v105.** O serviço Lovable precisa receber a atualização do handler antes de oferecer as interpretações novas; a fonte atual foi conferida igual à base local. Nenhum crédito de construção ou geração foi consumido nesta programação.

### Provas e continuação

- O commit `6239d5ed570ac2b93346dbb0acec283f0a4dd51b` passou **771 testes**, tipos, schema de 43 tabelas e build no [workflow principal](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40729240586). [Windows](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40729240548), [chat](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40729240668), [cadastro somente leitura](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40729240571) e os dois grupos do [Chrome](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40729240588) passaram. O fluxo novo registra sete verificações, incluindo retomada, histórico privado, 320/412/768/1280 px e bloqueio do Essencial. As imagens do dono, conversa e histórico foram inspecionadas.
- A revisão posterior refinou respostas locais para horário, perguntas frequentes exatas, combos cadastrados e instruções de cupom sem divulgar seu código. Os **771 testes locais e tipos** também passaram com essas alterações. A PR guarda o resultado da rodada final no commit subsequente; não confundir o Chrome anterior com uma prova externa do modelo.
- O serviço tem **10 testes simulados** aprovados. A montagem nativa inicial foi compilada e salva no commit Sites `d62516ed721ba430a51d70028ecfa0c5df6f84f3`, árvore `724d19551f04cc8a8d170b203bcd86a3fbdc1033`, igual ao GitHub `6239d5e`. Não foi implantada. O pacote final posterior deve registrar sua fonte/árvore na PR.
- A fonte ativa do serviço é `8e15d2829f80231f145abdf5f83c1fc8507ddfc1`, projeto Lovable `aa27093c-2768-41f2-8274-923fdfe2b5ff`. Aplicar somente `services/image-service/src/lib/pedido-studio.server.ts` no caminho `src/lib/pedido-studio.server.ts` do serviço; preservar modelo, segredos, endpoint, claim e limite de saída. Não conectar este monorepositório ao projeto. O repositório `pizzaria.on-chat` é outro aplicativo e não contém esse serviço.
- A entrada no editor privado não foi concluída. O conector disponível edita pela construção da Lovable, que pode consumir créditos; a regra de `AGENTS.md` exige aviso e autorização antes desse uso. Não chamar o construtor nem executar consulta real paga até essa autorização. O patch está pronto para uma única edição delimitada; nenhum aumento de limite, compra de saldo ou troca de provedor é necessário.
- Após autorizado: aplicar e conferir o diff do serviço, executar seus checks, publicar o serviço e verificar a capacidade de atendimento sem modelos; integrar a PR após os checks finais; salvar/publicar o pacote nativo oficial com a migração aditiva, mantendo ambiente/sessão/audiência; verificar páginas e rotas públicas sem dados de clientes. Uma consulta semântica real, se autorizada, deve usar loja isolada e não criar pedido/pagamento/mensagem. Registrar IDs de fonte/publicação e resultado real; não prometer publicação antes do retorno do serviço.

Android físico, recuperação com novo e-mail real e o primeiro ciclo financeiro externo continuam sem homologação. Testes com provedores simulados não substituem essas verificações.

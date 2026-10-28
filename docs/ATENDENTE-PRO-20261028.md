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

**Estado inicial desta implementação: preparado, ainda sem publicação. A produção confirmada permanece v105.** Registrar aqui os resultados finais, a PR e o pacote antes de publicar. O serviço Lovable precisa receber a atualização do handler antes de oferecer as interpretações novas; a fonte atual foi conferida igual à base local. Nenhum crédito de construção ou geração foi consumido nesta programação.

Android físico, recuperação com novo e-mail real e o primeiro ciclo financeiro externo continuam sem homologação. Testes com provedores simulados não substituem essas verificações.

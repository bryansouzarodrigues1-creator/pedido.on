# Calculadora e administração de cardápios — 25/10/2026 UTC

Candidato ainda em validação; a produção permanece v89 até a implantação confirmada.

## Fluxos entregues no código

- `/calculadora`: sem conta ou assinatura; custo pronto ou ficha por ingrediente (kg/g, L/ml, unidade), perdas, embalagem, gás/energia e outros custos. Dois métodos explícitos: acréscimo sobre custo ou margem sobre venda. Taxas sobre a venda incluídas, comparação com preço praticado, duplicação, salvamento local, CSV, cópia JSON, restauração e impressão/PDF. A tabela v1 e os cálculos mensais anteriores continuam legíveis.
- Reserva de despesas é percentual do custo; evite repetir a mesma despesa na ficha e na reserva. Perdas usam rendimento `custo / (1 - perdas)`. Preço por margem é `(custo + reserva) / (1 - taxas - margem)`, arredondado para cima em centavos. Acréscimo preserva a conta antiga quando não há taxa; com taxas, divide o preço-base por `1 - taxas`. Não é garantia de resultado financeiro.
- Convite de aplicativo compacto; fechar mantém a posição no rodapé neste navegador, sem voltar ao topo automaticamente.
- Compartilhamento da prévia visível no criador; copiar ou abrir WhatsApp depende de ação do usuário. Nenhuma mensagem é enviada automaticamente.
- `/admin`: navegação de operação, pendências, verificação/denúncias, relatório de uso e registros de faturas separados entre produção e sandbox. Configuração não significa entrega homologada nem saldo bancário.
- `/admin/cardapios/novo`: compositor existente com PDF, fotos, textos, nome e 80 modelos. Rascunho administrativo separado do projeto público; revisão explícita antes de gerar link.
- `/admin/cardapios`: busca, paginação, situação, copiar/conferir, enviar pelo WhatsApp, renovar 30 dias, pausar e restaurar.
- `/c/<id>`: apresentação funcional sem cadastro, produtos e preços conferidos, carrinho de simulação, botão vermelho **Criar meu cardápio** no topo e rodapé. Não recebe pedidos nem Pix; credenciais Pix são removidas do snapshot. Modelos sem produtos usam exemplos rotulados.
- `/v/<id>`: compartilhamento público de 7 dias preservado, agora com apresentação adaptada e a mesma chamada para criar cardápio.

## Segurança e persistência

Migração 0018 aditiva cria somente `admin_shared_menus` e seus índices. Contas, restaurantes, pedidos, pagamentos e publicações existentes permanecem nas mesmas tabelas. Administração é conferida no servidor; mutações exigem mesma origem e CSRF. Criação tem chave de idempotência, confirmação e limite; alterações usam versão para conflito entre abas. Link pausado/expirado retorna 410 sem conteúdo. Respostas não incluem IDs de conta, chaves ou metadados internos. Nenhuma cobrança ou geração paga foi executada.

## Validação

639 testes locais passaram, incluindo workerd/D1/R2 reais em ambiente descartável e cálculo em centavos. TypeScript passou. Chrome isolado, build, sincronização e publicação: pendentes nesta revisão; atualizar com evidências após concluir.

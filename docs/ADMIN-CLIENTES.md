# Admin e clientes profissionais

O painel em `/admin` reúne visão geral, pizzarias e uso do produto. A conta administradora fixada no ambiente continua sendo a única com acesso, conferido no servidor antes de ler os relatórios. `/configuracao` preserva o mesmo acesso; integrações e saúde ficam recolhidas ao final.

## O que os números significam

- Períodos de 7, 30 ou 90 dias por data de criação do pedido, no horário de Brasília, incluindo hoje até a consulta. A comparação é com os dias anteriores completos; o dia parcial pode afetá-la.
- Recebidos incluem pendentes e cancelados. Valor e ticket confirmados usam somente `confirmed`, `preparing`, `out_for_delivery` e `delivered`, incluindo a taxa de entrega. Não são receita de assinatura ou extrato bancário. Status atuais podem mudar números de períodos anteriores.
- Contas conhecidas são a união distinta de perfis, proprietários de pizzarias e registros de trial. As etapas mostram quantas criaram loja, têm loja publicada ou já receberam pedido; não são uma sequência garantida nem uma contagem de todos os usuários do provedor Auth.
- Por pizzaria: quantidade e valor no período, ticket, concluídos, cancelados, pendentes, último pedido histórico, última alteração do cardápio, produtos no rascunho/publicado e alterações não publicadas. Pizzarias e aparelhos de uma mesma conta são identificados como métricas da conta.
- Uso: configurações dos cardápios publicados agora, promoções dentro da validade, fotos, Pix, regras de bairros e inscrições em alertas; imagens/textos concluídos, tentativas devolvidas e falhas registrados no período. Inscrição de push não comprova instalação de PWA ou recebimento no aparelho. Não há telemetria de OCR local, visitas ou cliques.
- Rascunho, publicação sem pedidos ou poucas vendas são sinais para acompanhamento. Não provam abandono ou insatisfação. Nenhuma ação administrativa modifica pedidos, preços ou pagamentos.

## Consulta e privacidade

`GET /api/admin/analytics` valida período, busca de até 80 caracteres, filtros, ordenação e página. Retorna até 25 pizzarias por página, incluindo filtros sem pedidos/rascunhos e ordenação por pedidos, valor ou atualização. SQL parametrizado; caracteres `%`, `_` e barra invertida na busca são literais. Agregados são obtidos em lote no D1, sem carregar pedidos completos. Atualização manual, sem polling, novas tabelas ou gravações de métricas.

O relatório não retorna e-mail/nome pessoal do dono, identidade dos compradores, endereço, telefone, chat, comprovante, Pix, prompt, sessão ou credencial. Nomes/links das pizzarias são usados como identificação comercial. API privada com `no-store`; service worker não armazena admin/API. Nenhuma chamada Lovable/OpenAI ao abrir o admin. Receita SaaS permanece pendente da integração Asaas.

## Verificação

Testes cobrem autorização antes dos filtros, valores confirmados, exclusão de cancelados/futuros, limites de datas em Brasília, contas distintas, seleção de dados, ausência de chamadas externas, busca literal, paginação e menus legados inválidos. Renderização SSR real do relatório; Auth/bindings dos testes de rota são simulados. Um teste adicional executa o lote SQL e JSON em workerd com D1 local real, sem serviços externos. Navegação visual autenticada no celular continua sendo uma conferência manual.

# Retomada do aplicativo e comparação com InstaDelivery

Consulta em 26/10/2026. Base: Sites v100 e GitHub PR #129, sem commits posteriores no início da revisão. A entrega anterior seguiu o escopo das duas calculadoras, painel administrativo, avisos e continuidade de sessão. A validação em Android físico continuava pendente; não havia evidência suficiente para declarar resolvida a retomada depois do WhatsApp.

## Projeto existente

Pizzaria.on tem aplicação React/Next executada por vinext em Cloudflare Workers no mesmo projeto Sites. A Netlify atua como domínio público e gateway; não é outro banco ou aplicativo. Supabase autentica, D1 guarda cadastros, sessões, pedidos e operações; R2 guarda arquivos. O serviço de imagens Lovable é separado, com uso pago condicionado à autorização. O plano atual permanece R$49/mês, com dez dias de teste e sem cobrança automática do teste.

Há criador de cardápio com prévia, edição e publicação separadas, galeria, leitura de arquivos, solicitação assistida por link, calculadoras Fácil/Profissional, carrinho, meio a meio, bordas, combos, promoções, cupons, entrega por região, pedidos com aprovação, acompanhamento privado, comprovante Pix, conversa no pedido, impressão manual e administração de contas. A importação automática real do iFood continua sem homologação; o último bloqueio e zero produtos não são um recurso concluído.

## Falha e correções desta retomada

O print “This page couldn’t load” não contém URL nem identifica qual navegador/aplicativo falhou. Logs recentes consultados não mostraram exceções ou HTTP 5xx. Isso não reproduz nem exclui uma falha no aparelho. Não se pode atribuir uma causa única ao print.

Lacunas confirmadas no código e tratadas:

- A abertura de WhatsApp no checkout substituía a página. Agora reserva uma janela separada durante o toque; se o navegador bloquear a janela, mantém um link explícito, sem trocar a página do cardápio. Falhas fecham a janela reservada. Não envia mensagens automaticamente.
- Pedidos, acompanhamento, conversa e avisos passam a atualizar em retorno, `pageshow`, reconexão e descongelamento. Leituras pausam em segundo plano, têm prazo e não se sobrepõem. Comandos e pagamentos não são repetidos automaticamente.
- O service worker agora oferece um documento autossuficiente para falha de rede, prazo excedido e HTTP 500/502/503/504. Mantém caminho, consulta e fragmento privado do acompanhamento. HTTP 401/403/404/429 não são substituídos.
- A reconexão consulta apenas um endpoint público sem sessão/banco. Há limite de uma retomada automática por minuto e botão manual, evitando recarga contínua. O cache só contém a tela pública e ícones; nunca painel, API, sessão, comprovante ou pedido.
- O cardápio válido e o produto em edição ganham cópia local por pizzaria, por até sete dias, com gravação ao editar/sair/congelar. Recuperação exige ação do dono e nunca publica. Se a revisão do servidor mudou, há aviso. Armazenamento indisponível ou formulário inválido é informado. Arquivos de leitura, geração em andamento e formulários de criação não estão cobertos por essa cópia.
- Limites de erro da aplicação exibem orientação e tentativa de recuperação em português. Não conseguem interceptar uma tela nativa de falha do navegador fora da aplicação.

As contas, chaves, ambiente, regras de aprovação e dados de produção não foram recriados. Não há nova migração nem alteração no gateway Netlify.

## Comparação dos recursos

O site oficial da InstaDelivery foi aberto com JavaScript nesta data; os recursos abaixo são anunciados pelo fornecedor, não ensaiados em seu painel privado. A demonstração e os prints do proprietário complementam a observação do checkout; nenhum pedido foi enviado.

| Área | InstaDelivery anuncia/demonstra | Pizzaria.on na revisão | Próxima entrega necessária |
|---|---|---|---|
| Cardápio e pedido | Catálogo, carrinho e atendimento digital | Implementado, com publicação explícita e acompanhamento privado | Homologar uma pizzaria no turno real |
| Aplicativo | Gestores web, Android e iOS | PWA instalável; retomada reforçada nesta alteração | Ensaio em Android físico e troca para WhatsApp |
| Pagamento do pedido | Pix automatizado e pagamento online opcional | Pix/comprovante conferido pelo dono; cartão na entrega/retirada | Integração de recebimento por loja, webhook, conciliação, cancelamento e reembolso |
| WhatsApp | Disparos e automação por parceiro | Links de mensagem e conversa interna do pedido; sem robô externo | Canal oficial autorizado, consentimento, modelos, fila e custos conhecidos |
| iFood | Integração | Solicitação assistida; captura real ainda bloqueada | Acesso autorizado e homologação, sem contornar bloqueios |
| Cozinha | Impressão automática e por setor | Comanda com impressão manual | Agente/serviço de impressão, confirmação e prevenção de duplicatas |
| Operação de salão | PDV, caixa, mesas e autoatendimento | Painel de pedidos; sem operação completa de salão/caixa | Lançamento no balcão, abertura/fechamento, sangria e mesas |
| Clientes | Cadastro, fidelidade e cashback | Dados necessários associados ao pedido; sem CRM/fidelidade | Perfil e histórico com regras de acesso, depois pontos/créditos |
| Entregadores | Cadastro e rastreamento | Status de entrega e regiões; sem rastreamento de motoboy | Atribuição, aceite e operação de entrega |
| Marketing | Cupons, postagens e campanhas | Cupons, promoções e sugestões/artes para compartilhar | Agendamento/publicação com integração autorizada |
| Gestão | Relatórios e contas a pagar/receber | Resumo diário de vendas e ticket médio; projeção na calculadora | Histórico por período, exportação e conciliação; depois financeiro |
| Agendamento do pedido | Visível na demonstração enviada | Não implementado | Horários, capacidade, corte e fila de produção |

Asaas para a mensalidade da plataforma não equivale ao pagamento online dos clientes das pizzarias. Nenhuma nova cobrança, conta financeira, integração Meta ou geração paga foi ativada nesta revisão.

## Sequência recomendada

1. **Confiabilidade em um turno real:** celular instalado, troca com WhatsApp, rede móvel instável, sessão expirada, rascunho recuperado e pedido sem duplicação. Medir tempo de atualização e falhas. Esta alteração fornece a base; o aparelho físico continua necessário para homologação.
2. **Operação central:** pagamento do pedido com confirmação automática e impressão confiável, antes de expandir marketing. Aprovação técnica/comercial do provedor e credenciais da loja são dependências reais.
3. **Recompra e gestão:** histórico de clientes, relatórios por período, agendamento e fidelidade com regras claras.
4. **Expansão:** WhatsApp/Instagram oficiais, iFood autorizado, entregadores e PDV/salão conforme a demanda das pizzarias piloto.

Não é possível dar uma porcentagem honesta de paridade contando botões. A Pizzaria.on já cobre criação, preço e pedido direto; as diferenças maiores estão na automação financeira e na operação diária integrada.

## Fontes e evidências

- [InstaDelivery — site oficial](https://instadelivery.com.br/), observado no navegador em 26/10/2026: anuncia gratuidade abaixo de R$2.000/mês, R$69,90 e R$129,90 nas faixas seguintes. Pagamento online aparece como opcional com taxa de 2,99%; condições e adicionais exigem confirmação comercial. O site fala em oito mil negócios, enquanto a mensagem enviada ao proprietário fala em quinze mil; não usar esses números como quantidade auditada.
- [Automação de WhatsApp](https://blog.instadelivery.com.br/automacao-mensagens-no-whatsapp/), 14/02/2024: documenta parceiro e mensagens de status. O preço citado no artigo é histórico, não orçamento atual.
- [Gestor web e impressão](https://blog.instadelivery.com.br/versao-web-sistema-instadelivery/), 23/10/2021: descreve software para impressão automática. Não usar sua tabela de preços antiga.
- [Demonstração](https://instadelivery.com.br/zpizza), prints enviados pelo proprietário: agendamento, retirada, pagamentos e endereço; não houve transação.
- [Chrome — Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): eventos de suspensão, descarte e retomada. Referência técnica; emulação não substitui Android físico.

## Validação

19 cenários focados passaram; suíte geral: 695 testes aprovados, sem falhas ou testes ignorados. TypeScript e build inicial aprovados. Foram adicionados cenários de Chrome com service worker real e congelamento controlado, executados apenas no D1 isolado do GitHub Actions. A prévia gerenciada local informou endereço ativo, mas o navegador respondeu `ERR_CONNECTION_REFUSED` em duas tentativas; foi encerrada. Não se abriu servidor alternativo para contornar essa limitação. Publicação e resultado final de CI serão registrados após conclusão.

# Admin, uso real e datas — 26/10/2026

O administrador passa a começar por clientes e uso, com busca, filtros e próximos passos claros. O modelo anterior destacava serviços e relatórios, mas não respondia diretamente quem voltou, quem calculou e quem está perto do primeiro pedido.

Cada cadastro mostra última atividade identificada, última entrada com login, pedidos pelo site nos últimos 30 dias e no total, último pedido, uso efetivo da calculadora e pizzarias publicadas/rascunho. Os grupos separam quem está ativo, quem ainda não criou a pizzaria, quem prepara o cardápio, quem publicou e quem recebeu pedidos. O filtro de calculadora exige interação e ausência de cardápio publicado/pedidos; não infere que abrir a página significa calcular.

Contas antigas com pizzaria e sem perfil aparecem a partir dos registros existentes. Um contato ausente é identificado como ausente, sem fabricar e-mail. Datas de login antigas ainda disponíveis nas sessões são aproveitadas; novos logins ficam registrados mesmo após sair da conta. Não há reconstrução de histórico anterior à implantação.

## Medição

A migração aditiva 0021 cria `account_activity`. O servidor determina o titular pela sessão e aceita somente área e tipo fixos. O navegador não informa outro titular. São armazenados dia, área, última atividade e contadores; não são enviados custo, preço, nome de sabor, senha, conteúdo de conversa ou dados de compradores. Presença atualiza a atividade uma vez por minuto enquanto a página está visível; não conta como novo cálculo ou login.

Sem entrar na conta, a pessoa continua podendo usar a calculadora. Essas visitas permanecem anônimas e não são atribuídas posteriormente a uma pessoa. Pedidos da lista são registros do próprio site; mensagens e vendas externas no WhatsApp não viram pedidos automaticamente. O admin indica desde quando há medição, e atividade ausente não é apresentada como prova de abandono.

O registro de acesso é secundário: se falhar, não impede login, pedido ou edição. A regra de autorização administrativa permanece no servidor. O novo registro foi incluído no inventário de manutenção excepcional para manter o teste de cobertura do esquema; nenhum reset ou limpeza de produção foi armado/executado.

## Datas

Foi centralizada a apresentação das datas relevantes de administração, assinatura e teste. Datas de calendário, como vencimento, mantêm o dia informado. Instantes aparecem em Brasília; registros SQLite antigos sem indicação de fuso são tratados como UTC. Segundos Unix exigem conversão explícita. Valores inválidos ou dias impossíveis não derrubam a página nem inventam prazo.

O histórico recuperado não trouxe a tela e o valor exatos do “erro da data” mencionado pelo proprietário. Estes casos foram reproduzidos e testados no código; não constituem comprovação de que um relato ainda não identificado teve a mesma causa. Os prazos já concedidos continuam intactos.

## Por que ter um cardápio digital

A primeira tela agora explica o resultado para o pizzaiolo: sabores e preços em um link, pedido montado pelo cliente e menos repetição de informações em conversas. Há exemplos concretos de atualização de preços, tamanhos/quantidades/observações e calculadora gratuita, além de acesso à demonstração antes do cadastro. Recebimento pelo painel continua condicionado à verificação da loja; não há promessa de pagamento automático, faturamento ou lucro garantido.

## Validação

Foram incluídos testes de atribuição da atividade, visitante anônimo, tentativa de forjar titular, presença sem inflar uso, métricas por conta, isolamento dos compradores, contas antigas, login após saída, datas e proposta de valor. O ensaio de Chrome também passa a usar a calculadora autenticada e conferir a atividade no admin pela API real do ambiente isolado, preservando os restaurantes completos antes/depois. Não utiliza respostas simuladas para as métricas do admin.

A jornada de autenticação no Chrome usa respostas controladas e é identificada como tal. As rotas reais com SQLite testam cadastro, login, recuperação, restrição da sessão, senha antiga rejeitada, novo login e revogação de sessões; o provedor externo é simulado. O proprietário confirmou o recebimento de e-mails; a recuperação pelo site será liberada junto da correção. A abertura do novo link, entrada posterior e Android físico continuam exigindo a confirmação final do fluxo. O envio de recuperação ao cliente atendido não foi repetido.

Publicado na versão Sites 101 em 26/10/2026 às 16h51 UTC (13h51 em Brasília), com a migração aditiva 0021 e ambiente revisão 20. A alteração de ambiente foi somente `PEDIDO_EMAIL_DELIVERY_READY=true`; SMTP, remetente, chaves e sessão foram preservados. Não houve implantação do gateway Netlify.

Validação final: 713 testes aprovados, TypeScript e build aprovados. Os cinco workflows do commit de aplicação `2e02749c4ff0a3cca4917e0691f132445e6c7b27` concluíram com sucesso: Chrome, Windows, autenticação/pedidos, conversa do pedido e disponibilidade de cadastro. No Chrome, os cenários de autenticação móvel, horários do dono, calculadora/admin, PWA/reconexão e navegação pública passaram. Os resultados e limites estão detalhados na [auditoria de acesso](AUDITORIA-ACESSO-20261026.md#publicação-e-verificação-final).

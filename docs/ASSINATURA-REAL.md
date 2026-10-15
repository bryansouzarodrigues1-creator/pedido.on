# Contratação real da pizzaria.on

Os planos públicos levam a `/assinatura?plan=<id>`. Entrar ou criar uma conta preserva o plano escolhido. A página reúne contratação, faturas, verificação do pagamento e cancelamento da renovação. Minha conta e o painel têm atalhos para ela.

## Uso pelo proprietário

1. Escolher Essencial (R$49/mês), Pro (R$89/mês) ou Divulgação (R$149/mês).
2. Entrar na própria conta e conferir plano, benefícios e preço mensal.
3. Informar CPF/CNPJ do pagador e clicar em **Assinar por R$…/mês**. Isso cria a assinatura mensal e abre a fatura do Asaas.
4. Pagar na página do Asaas. Voltar à página Assinatura para consultar a fatura; **Já paguei · verificar** consulta o provedor. O webhook também atualiza a confirmação.

Abrir uma fatura não significa pagamento. A fatura mensal não ativa débito automático. A mensalidade da plataforma permanece separada do Pix das pizzas, recebido e conferido pela pizzaria.

**Cancelar renovação** exige confirmação e preserva o período pago. Uma nova contratação após cancelamento inicia outra mensalidade hoje; o aviso continua visível na página.

## Garantias e limites da atualização

- Valores calculados no servidor e catálogo/limites preservados. Não há plano fictício ou cobrança de teste em produção.
- Checkout, sincronização, portal e cancelamento exigem origem válida, sessão do proprietário e token CSRF. O cliente não repete POST automaticamente após falha de rede.
- Uma contratação interrompida reutiliza o identificador persistido; as proteções contra duplicidade continuam no servidor. Não armazenar documento no navegador nem em logs.
- Página autenticada, sem indexação; APIs financeiras continuam privadas e sem cache.
- O cadastro público, contas e sessões, banco, Pix dos pedidos e configurações existentes foram preservados. Não há nova migração.

Na consulta somente de leitura de 15/10/2026, o ambiente estava em produção com Asaas habilitado e sem assinatura/fatura/pedido registrado. Fiscalização de assinatura e trial continuam desligadas. Não anunciar pagamento real validado até existir uma operação externa confirmada. A recuperação por e-mail depende de configurar e validar um domínio de envio; não foi ativada apenas pela publicação do código.

Verificações automatizadas cobrem os três planos, preservação na autenticação, rejeição de CSRF antes de acessar o Asaas e ausência de repetição automática. A suíte financeira usa provedor Asaas simulado; não movimenta dinheiro. A publicação, os resultados finais e a leitura HTTPS são registrados na PR desta atualização. A navegação autenticada em celular e o primeiro pagamento externo continuam exigindo execução real.

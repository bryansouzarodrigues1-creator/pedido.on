# Asaas no pedido.on — pacote de integração

A candidata da PR #13 incorpora a base da PR #1 e implementa assinatura mensal, fatura hospedada, webhook autenticado, conciliação, histórico e cancelamento. Produção segue v28 enquanto o ambiente de execução está indisponível. Nenhuma cobrança foi criada no Asaas real.

## Comportamento

Planos preservados: Essencial R$49/mês, Profissional R$89/mês e Rede R$149/mês. O servidor decide o valor. O Pix das pizzas continua direto na pizzaria; não existe split nesta integração.

O documento do pagador é conferido em formato e validado pelo provedor. O pedido.on guarda uma impressão vinculada à conta/chave interna, não CPF/CNPJ puro ou cartão. Clientes, intenções, assinaturas, faturas e eventos Asaas têm tabelas próprias e ambientes separados. Não usar chaves do JurisAuto nem reativar Stripe simultaneamente.

A criação usa billingType UNDEFINED e ciclo MONTHLY. Pagamento na fatura não implica débito automático de cartão ou Pix Automático; esses fluxos dependem de autorização/tokenização próprias. Notificações do cadastro criado ficam desabilitadas, sem envio de e-mail por esta integração.

Intenção e fases duráveis impedem dois POSTs de criação concorrentes. Timeout ambíguo é conciliado pela referência, sem repetir a criação. O webhook valida asaas-access-token antes do JSON, consulta o estado atual e grava faturas/projeção/evento atomicamente. Travas compartilhadas impedem conflito entre conciliação e cancelamento.

Somente CONFIRMED/RECEIVED do cliente/assinatura corretos e valor mensal exato concedem período. Estorno/chargeback retira a respectiva mensalidade, preservando uma posterior já paga. O período de uso da plataforma termina um mês civil após o vencimento, à meia-noite de Brasília; não é o saldo bancário do Asaas.

Cancelar exige confirmação explícita e remove novas cobranças/pêndencias no provedor, preservando período pago e histórico. Faturas anteriores permanecem consultáveis após nova contratação. Uma nova assinatura após cancelamento inicia outra mensalidade, sem prorrateio automático.

## Configuração e rotas

- PEDIDO_BILLING_PROVIDER=asaas
- PEDIDO_BILLING_ENABLED=false até credenciais e webhook estarem prontos
- ASAAS_ENV=sandbox inicialmente
- ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN: segredos distintos, específicos do pedido.on e do ambiente
- PEDIDO_BILLING_ENFORCED=false e PEDIDO_TRIAL_ENFORCED=false durante configuração
- Webhook final: https://forno-cardapios.waves4845.chatgpt.site/api/billing/asaas/webhook
- Rotas checkout/status/sync/cancel em /api/billing; webhook Stripe legado isolado e selecionado por provedor

Sandbox não concede plano comercial pago. Ativação de cobrança e fiscalização são decisões diferentes; conferir contas existentes, cortesias, trial e recuperação antes de fiscalizar. Cadastro público, chaves de sessão, Supabase, R2, cotas de IA e preços atuais permanecem preservados.

## Esquema, testes e recuperação

A migração 0013_perfect_korath cria cinco tabelas Asaas, sem alterar tabelas legadas. A 0012 do admin também precede o novo código. Sites aplica migrações antes de enviar o Worker, através do fluxo oficial.

Antes da desconexão passaram nove testes financeiros com identidade/Asaas simulados, typecheck, build, Netlify e a prova em workerd/D1 real: preservação das 21 tabelas anteriores, leases concorrentes, pagamento, refund, cancelamento, foreign_key_check e rollback da projeção quando o evento falha. O teste antigo de 0012 foi limitado às migrações anteriores para conservar a prova original das 19 tabelas.

A indisponibilidade do executor interrompeu o fechamento local. A candidata foi recuperada do histórico de alterações por APIs GitHub, com uma verificação adicional da correspondência entre snapshot e o gerador Drizzle fixado. O CI desta candidata precisa passar antes da implantação; não tratar os testes de uma árvore anterior como aprovação da recuperação.

Cópia privada de 16 tabelas de negócio salva antes da publicação: 30.514 bytes, SHA-256 07b9a002728e1ec68c02a0870b3d5751454599ec5740e4790c17f698bba783aa. Não inclui sessões, rate buckets, assinaturas push, segredos runtime ou binários R2; não é backup integral. Não enviar essa cópia ao GitHub. Reversão de combos/preços livres exige código compatível ou a adaptação documentada no fechamento do MVP.

Pendentes: restabelecer executor para empacotamento/publicação; chave própria e webhook Asaas; pagamento/renovação/atraso/estorno/cancelamento no Sandbox; recuperação de senha e QA em dois celulares. Não anunciar assinaturas completas com base apenas em mocks. Qualquer compra controlada real exige pagador, valor e autorização específicos.

## Referências oficiais consultadas em 13/10/2026

- https://docs.asaas.com/reference/criar-novo-cliente
- https://docs.asaas.com/reference/listar-clientes
- https://docs.asaas.com/reference/criar-nova-assinatura
- https://docs.asaas.com/reference/listar-assinaturas
- https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura
- https://docs.asaas.com/reference/recuperar-uma-unica-cobranca
- https://docs.asaas.com/reference/remover-assinatura
- https://docs.asaas.com/docs/retries-e-idempot%C3%AAncia
- https://docs.asaas.com/docs/eventos-para-assinaturas

# Asaas na pizzaria.on — pacote de integração

**Marca — 15/10/2026:** pedido.on passa a se chamar **pizzaria.on** nas telas, no PWA e na descrição das novas assinaturas. Referências técnicas `pedido-on:` de clientes/assinaturas ficam intactas para preservar conciliação e evitar duplicidade. O endereço público e o webhook também permanecem iguais. O nome administrativo do webhook existente registra a marca anterior; não é necessário recriar a integração.

**Produção confirmada — v30:** publicada em 15/10/2026, fonte `5c8a73ddd2f9ba349582b319bf223f9ac9fcd6c1`, ambiente revisão 12. PR #14 integrada. Webhook habilitado, não interrompido, com 19 eventos e envio sequencial. Sem token e com token errado: HTTP 401; com token correto e ID composto sem recurso financeiro: HTTP 200. Repetição aceita. Esses testes não criaram fatura nem comprovaram entrega de pagamento real. A etapa da nova marca simplifica as ações de pagamento e corrige mensagens antigas que diziam que o Asaas estava desligado.


A PR #13 foi integrada e publicada na v29 em 14/10/2026. Ela implementa assinatura mensal, fatura hospedada, webhook autenticado, conciliação, histórico e cancelamento.

Em 15/10/2026, a chave própria de produção foi aceita pela API real e armazenada como segredo no Sites. O webhook exclusivo `pedido.on - Assinaturas (producao)`, ID `0f42a7a4-4308-4837-ae11-a51dfadf88e6`, foi cadastrado com token distinto, 19 eventos e envio sequencial, inicialmente desativado para a publicação segura do receptor. As duas integrações anteriores da conta permaneceram iguais. Não registrar os valores dos segredos neste documento.

O receptor aceita IDs oficiais de evento com `&`, mantendo a validação restrita de IDs de cobrança/assinatura. O teste de regressão reproduziu HTTP 400 antes da correção; após o ajuste passaram 251 testes e typecheck, incluindo idempotência com esse formato em D1/workerd real. Identidade e transporte financeiro dos testes continuam simulados. A validação autenticada da chave é real e não gerou cobrança.

## Comportamento

Planos preservados: Essencial R$49/mês, Profissional R$89/mês e Rede R$149/mês. O servidor decide o valor. O Pix das pizzas continua direto na pizzaria; não existe split nesta integração.

O documento do pagador é conferido em formato e validado pelo provedor. A pizzaria.on guarda uma impressão vinculada à conta/chave interna, não CPF/CNPJ puro ou cartão. Clientes, intenções, assinaturas, faturas e eventos Asaas têm tabelas próprias e ambientes separados. Não usar chaves do JurisAuto nem reativar Stripe simultaneamente.

A criação usa billingType UNDEFINED e ciclo MONTHLY. Pagamento na fatura não implica débito automático de cartão ou Pix Automático; esses fluxos dependem de autorização/tokenização próprias. Notificações do cadastro criado ficam desabilitadas, sem envio de e-mail por esta integração.

Intenção e fases duráveis impedem dois POSTs de criação concorrentes. Timeout ambíguo é conciliado pela referência, sem repetir a criação. O webhook valida asaas-access-token antes do JSON, consulta o estado atual e grava faturas/projeção/evento atomicamente. Travas compartilhadas impedem conflito entre conciliação e cancelamento.

Somente CONFIRMED/RECEIVED do cliente/assinatura corretos e valor mensal exato concedem período. Estorno/chargeback retira a respectiva mensalidade, preservando uma posterior já paga. O período de uso da plataforma termina um mês civil após o vencimento, à meia-noite de Brasília; não é o saldo bancário do Asaas.

Cancelar exige confirmação explícita e remove novas cobranças/pendências no provedor, preservando período pago e histórico. Faturas anteriores permanecem consultáveis após nova contratação. Uma nova assinatura após cancelamento inicia outra mensalidade, sem prorrateio automático.

## Configuração e rotas

- PEDIDO_BILLING_PROVIDER=asaas
- PEDIDO_BILLING_ENABLED=true somente após preparar credenciais, receptor e webhook; false desliga novas operações
- ASAAS_ENV=production para a chave de produção fornecida pelo proprietário; homologação usa conta/chave Sandbox separadas
- ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN: segredos distintos, específicos da pizzaria.on e do ambiente
- PEDIDO_BILLING_ENFORCED=false e PEDIDO_TRIAL_ENFORCED=false durante configuração
- Webhook final: https://forno-cardapios.waves4845.chatgpt.site/api/billing/asaas/webhook
- Rotas checkout/status/sync/cancel em /api/billing; webhook Stripe legado isolado e selecionado por provedor

Sandbox não concede plano comercial pago. Ativação de cobrança e fiscalização são decisões diferentes; conferir contas existentes, cortesias, trial e recuperação antes de fiscalizar. Cadastro público, chaves de sessão, Supabase, R2, cotas de IA e preços atuais permanecem preservados.

## Esquema, testes e recuperação

A migração 0013_perfect_korath cria cinco tabelas Asaas, sem alterar tabelas legadas. A 0012 do admin também precede o novo código. Sites aplica migrações antes de enviar o Worker, através do fluxo oficial.

Antes da desconexão passaram nove testes financeiros com identidade/Asaas simulados, typecheck, build, Netlify e a prova em workerd/D1 real: preservação das 21 tabelas anteriores, leases concorrentes, pagamento, refund, cancelamento, foreign_key_check e rollback da projeção quando o evento falha. O teste antigo de 0012 foi limitado às migrações anteriores para conservar a prova original das 19 tabelas.

A indisponibilidade do executor interrompeu o fechamento local. A candidata foi recuperada do histórico de alterações por APIs GitHub, com uma verificação adicional da correspondência entre snapshot e o gerador Drizzle fixado. O CI desta candidata precisa passar antes da implantação; não tratar os testes de uma árvore anterior como aprovação da recuperação.

Cópia privada de 16 tabelas de negócio salva antes da publicação: 30.514 bytes, SHA-256 07b9a002728e1ec68c02a0870b3d5751454599ec5740e4790c17f698bba783aa. Não inclui sessões, rate buckets, assinaturas push, segredos runtime ou binários R2; não é backup integral. Não enviar essa cópia ao GitHub. Reversão de combos/preços livres exige código compatível ou a adaptação documentada no fechamento do MVP.

Na ativação, publicar a versão com os segredos, verificar HTTP 401 sem token, HTTP 200 com token e ID composto sem recurso financeiro, habilitar o webhook e conferir a configuração novamente pela API. Essa prova de recepção não substitui entrega financeira real do Asaas.

Pendentes: pagamento/renovação/atraso/estorno/cancelamento no Sandbox; primeira contratação real pelo fluxo normal; recuperação de senha e QA em dois celulares. Não anunciar o ciclo financeiro integral como validado com base apenas em mocks. Qualquer compra controlada real exige pagador, valor e autorização específicos.

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

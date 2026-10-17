# Configuração e homologação comercial — 16/10/2026

Leitura da configuração efetiva do Site na revisão 13, preservada pela v45. Cadastro/handoff real concluído posteriormente na v45, pelo Chrome do GitHub. Nenhum segredo foi copiado para este documento; não houve alteração de ambiente ou plano de infraestrutura.

## O que foi confirmado

| Área | Estado observado | Limite da prova |
| --- | --- | --- |
| Cadastro | `PEDIDO_AUTH_MODE=open`; fluxo completo Supabase/D1/R2 confirmado na v45, CI `38977586275`, seis verificações | Chrome com Pixel 7 emulado; Android físico, Google e recuperação continuam distintos |
| Google | Flag de ativação do site ausente; o código exige `PEDIDO_GOOGLE_ENABLED=true` | Não foi confirmado o ciclo OAuth do provedor nem ativado o botão |
| Recuperação | `PEDIDO_EMAIL_DELIVERY_READY=false` | Entrega do e-mail, retorno e troca de senha ainda precisam de homologação |
| Asaas | Provedor Asaas, habilitado, ambiente `production` | Não foi criada cobrança nem executado pagamento/renovação/cancelamento bancário real |
| Corte da assinatura | `PEDIDO_BILLING_ENFORCED=false` | Cobrança obrigatória não está fiscalizada em produção |
| Teste grátis | Sete dias no código e em conta de QA; `PEDIDO_TRIAL_ENFORCED=false` | Vencimento ainda não bloqueia comercialmente a operação |
| Cotas de IA | `PEDIDO_AI_PLAN_QUOTAS=true`, imagens e Estúdio habilitados | Reservas concorrentes, cotas e estornos cobertos por testes; geração real não executada |
| PWA/pedidos | Testes anteriores de navegador, demo e Workers/D1 locais registrados no QA Desktop | Instalação, push e operação com dois celulares reais continuam pendentes |

O modo antigo de importação por IA continua separado do OCR local e das rotas de imagens/Estúdio. Não interpretar `PEDIDO_AI_ENABLED` como chave global dessas três experiências.

## Planos e cotas preservados

Valores e franquias vêm de `lib/plan-catalog.ts`; são os mesmos consumidos pela implementação de autorização/cotas.

| Plano | Mensalidade | Imagens | Textos |
| --- | ---: | ---: | ---: |
| Essencial | R$ 49 | 4 | 80 |
| Pro | R$ 89 | 30 | 200 |
| Divulgação | R$ 149 | 60 | 400 |
| Teste de sete dias | Sem cobrança nesta janela | 7 | 100 |

Não foi criado plano Free permanente nem diferenciação por número de lojas. IDs históricos dos planos e permissões de contas anteriores foram preservados. Cotas são do dono no D1, com reservas atômicas e orçamento estimado da plataforma; a Lovable não passa a ser fonte de verdade do saldo. As estimativas não comprovam custo ou qualidade de uma geração real.

## Aviso de segurança real do Supabase

O projeto **Pedido.on**, identificado no conector como ativo/saudável, retornou um aviso de segurança: `auth_leaked_password_protection`, nível `WARN`, título “Leaked Password Protection Disabled”. É um aviso de configuração, não evidência de vazamento de dados.

A configuração não foi ativada. O conector permite consultar os avisos, mas não expõe a alteração dessa configuração do provedor Auth. A documentação oficial confirma que a proteção exige Pro ou superior: https://supabase.com/docs/guides/auth/password-security. O plano atual da organização não foi confirmado e nenhuma assinatura de infraestrutura foi alterada. A exigência de senha com 12 caracteres no aplicativo não substitui esse controle. Isso não impede continuar os testes da aplicação no Chrome do GitHub.

## Próxima homologação que muda a prontidão comercial

1. Corrigir a extração insuficiente do cardápio público real; a entrada completa por e-mail na v45 já foi exercitada sem depender do Rodrigues. [Cadastro e retomada](QA-CADASTRO-REAL-2026-10-16.md).
2. Conferir Google OAuth, proteção de senhas e recuperação com e-mail realmente entregue.
3. Executar o ciclo Asaas em ambiente de teste apropriado; cobranças financeiras reais continuam exigindo instrução financeira explícita. Ativar corte do trial/assinatura apenas depois de validar o ciclo e os efeitos nas contas existentes.
4. Validar catálogo público acessível no iFood; a PR #25 revisada permanece separada da produção.
5. Homologar com dois celulares físicos: cliente, pizzaria, cozinha, entrega, perda/retorno de conexão, PWA e push. Só então fechar a preparação do beta de cinco a dez pizzarias.

Não houve migração irreversível, alteração de preços, consumo pago de geração, pedido real, mensagem enviada a cliente ou cobrança emitida nesta continuação.

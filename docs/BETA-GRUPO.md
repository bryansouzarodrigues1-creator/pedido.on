# pedido.on — beta com pizzaiolos convidados

## Acordos confirmados (outubro/2026)

- **Pizzaiolos** criam conta, recebem um convite e terão período gratuito de **7 dias, sem cartão**. Ainda não cobrar ou iniciar renovação sem autorização e testes.
- **Clientes da pizzaria** fazem pedidos sem login. O rastreamento usa token privado do pedido, salvo no armazenamento do próprio navegador; nada de identificar aparelhos com fingerprint. Troca de celular, navegação anônima ou limpeza dos dados exigem recuperar o link privado.
- O envio de e-mails será com **Resend + Supabase Auth**: recuperação de senha por SMTP do projeto Supabase existente. Não mover contas ou senhas.
- **Sem CAPTCHA na fase do grupo**. Preservar limite de tentativas de login/cadastro já existente, validação de convite e cadastro direto sem confirmação de e-mail. Se houver abuso, ativar desafio adaptativo posteriormente.
- Manter visual compacto/característico de pizzaria e o painel **Pedidos, Cardápio, Pizzaria, Criar com IA**.

## Fase 1: código preparado nesta branch, não publicado

### Convite controlado

Em `lib/platform.ts`, `PEDIDO_AUTH_MODE=invite` habilita somente o cadastro por convite, condicionado a `PEDIDO_AUTH_INVITE_CODE` no servidor (16 a 128 caracteres, sem espaços). A variável NUNCA deve ir ao GitHub, ao browser ou aos logs. Cadastrados antigos continuam podendo entrar com o e-mail existente. Modo `prototype` existente é preservado até ativação planejada.

A página de registro solicita o convite. A API verifica o código após rate limit, e o modo convite rejeita o cadastro se o Supabase não estiver com **cadastro direto sem confirmação de e-mail ligada**. O cadastro direto não depende de SMTP. A recuperação de senha deve ser testada separadamente. Configurar **site URL** e os redirecionamentos de `/confirmar-email` e `/redefinir-senha` no Supabase. Testar confirmação real em e-mail externo e recuperação no mesmo navegador.

### Resend: bloqueio externo pendente

A conta Resend conectada foi inspecionada: **nenhum domínio de envio cadastrado**. Para usar Resend com usuários reais, é necessário saber qual domínio próprio será utilizado, cadastrá-lo e verificar os registros DNS (SPF/DKIM conforme Resend). Só então ligar a integração Resend–Supabase Auth / SMTP e validar entrega. Não inventar endereço remetente, não usar chave em variável do cliente, e não alterar o SMTP do Supabase sem domínio verificado.

Documentação: https://resend.com/supabase

### Histórico de pedido sem conta

`lib/device-orders.ts` valida links e lembra tokens privados por pedido no `localStorage` local. O último pedido permanece acessível pelo cardápio da loja; mantemos até 10 links locais por pizzaria para futura tela de histórico. O pedido do servidor já exige token de acompanhamento; persistir o link no dispositivo não torna o endpoint público. Links do pedido expiram conforme a política atual do servidor. **Não guardar dados pessoais do pedido na chave de armazenamento.**

### IA — não gastar crédito sem diagnóstico

O retorno `enabled:true/connected:true` da saúde comprova apenas GET. A imagem da falha mostra `attempt: cancelled`, que no código pode ocorrer antes do serviço confirmar o claim, sem custo de geração.

`POST /api/platform/ai-connection` é uma verificação administrativa de baixo custo, com CSRF e rate limiting: envia **jobId deliberadamente inválido** às rotas Lovable. Código 400 confirma POST até validação; outro status distingue rede, proxy ou contrato. Essa rota **não gera imagem, não resgata token e não chama modelo**. Depois do deploy, executar uma vez pelo painel administrativo (não pelo navegador anônimo). Sem resultado e logs da conta, não afirmar que a falha da IA foi resolvida.

Escopo atual do estúdio: tema, cor, frase, texto da loja, até dois textos de produtos por resposta e briefings de imagens. Quatro imagens opcionais: logo, capa, perfil e foto de produto. O usuário sempre revisa a prévia e publica manualmente. Melhorias seguintes: assistente conversacional persistente, perguntas guiadas, variantes de layout, recomendações de cardápio e aplicação seletiva com versionamento.

Cota de teste da branch: **12 imagens por proprietário/mês, máximo global 4 novas imagens/dia**, além de throttling por conta e token de uso único. O contador numérico deixa de aparecer na interface, mas geração **não é ilimitada** e está sujeita ao orçamento real da Lovable. **Não publicar essa alteração antes de estimar custos do gateway e autorizar o novo teto.** Mensagens de indisponibilidade devem ser claras; não dizer ao cliente que o serviço é ilimitado.

## Fase 2: cobrança com teste de 7 dias (planejada, não ativada)

`lib/trial-policy.ts` fornece regra pura de 7 dias. Falta integrá-la a um registro durável por conta no D1 e ao gateway Asaas, sem alterar contas existentes. Recomenda-se:

1. Começar o trial no primeiro acesso validado ou na criação da primeira pizzaria, uma única vez por `ownerId`. Registrar `startedAt`/`endsAt` no D1 e impedir repetição por logout/relogin. Por simplicidade comercial, uma loja publicada no teste do plano Essencial; expansão requer cobrança.
2. Mostrar `Teste grátis — X dias restantes` na **Minha conta**, com data final, CTA `Assinar` e nenhuma cobrança automática se o usuário não forneceu pagamento.
3. No dia 8, bloquear novas ações comerciais/pedidos conforme política clara, mas preservar dados e permitir login, editar, consultar e contratar. Evitar exclusão de fotos ou cardápios; avisar antes do vencimento via e-mail autorizado.
4. Após 7 dias, checkout Asaas com cobrança mensal, atualização somente por eventos autenticados e pagamento confirmado. Idempotência, faturamento, cancelamento e estorno seguem `docs/ASAAS.md` na PR específica.
5. Pessoas com conta existente antes do lançamento terão regra explícita de transição (não deduzir ou reiniciar teste sem decisão).

## Plano de evolução da IA

| Ação pedida ao assistente | Resposta do sistema | Requer revisão |
| --- | --- | --- |
| “Deixe minha pizzaria com identidade forte, carvão e vermelho” | Proposta de cores, tipografia, espaçamentos, banner e componentes pré-definidos | Sim |
| “Monte os textos do meu cardápio” | Descrições com base exclusivamente nos produtos cadastrados | Sim |
| “Crie minha identidade” | Logo quadrado, imagem de perfil e capa horizontal, chamadas separadas por aprovação | Sim |
| “Faça uma foto da minha pizza quatro queijos” | Imagem ilustrativa baseada nos ingredientes cadastrados, rotulada como ilustrativa | Sim |
| “Como vendo mais?” | Sugestões de combos, bebidas, categorias e descrições com aprovação explícita | Sim |
| “Qual foi o pedido do cliente?” | Resumo consultado apenas com autenticação e propriedade da pizzaria; sem enviar PII a IA desnecessariamente | Sim |

**Não prometer criação arbitrária de código ou layout customizado em tempo real.** O assistente modifica componentes parametrizados, nunca executa JavaScript enviado no prompt. Não deve alterar preço, Pix, horários, status de pedido ou publicar sem aprovação.

## Ativação segura

- Todas as mudanças estão em `feature/group-onboarding-and-order-recovery`. O site publicado e a `main` continuam intocados.
- Primeiro revisar CI e diff; depois configurar domínio Resend, Supabase e convite; finalmente publicar com rollout para o grupo, um teste real de criação/recuperação e somente uma geração de IA autorizada.
- Manter programa de clientes beta restrito até existir pagamento Asaas aprovado e políticas de suporte.

## Correção solicitada em 11/10 — cadastro sem confirmação
No modo invite, Supabase precisa ter `mailer_autoconfirm=true` (Confirm email desativado). Não envie e-mail no cadastro. Resend fica apenas para recuperação de senha; sem domínio verificado, usar temporariamente somente envio de teste disponibilizado pelo provedor, respeitando limites, e não fingir produção. O beta não exige domínio próprio comprado agora.

## Pré-aprovação de entrega e PWA — 11/10/2026

A verificação de local é opcional por configuração e **permanece desligada** enquanto a migração D1 e publicação não forem validadas:
`PEDIDO_DELIVERY_APPROVAL_ENABLED=false`.

Ao ativar:
1. Cliente do delivery informa número e endereço, podendo autorizar coordenadas pelo navegador. Sem geocodificação automática e sem custos de mapas. Solicitação criptografada pelo token de posse (hash no D1) com expiração em 2 horas.
2. O dono autenticado vê a fila **Verificar locais de entrega** e aceita ou rejeita. A ação exige CSRF e propriedade da pizzaria; decisão é atômica e não pode ser repetida.
3. Cliente consulta o status pelo token, a cada ~6 segundos. Só após aprovação abre o cardápio e pode finalizar. Pedido PIX/delivery criado por API é recusado se endereço ou telefone não corresponderem ao registro aprovado.
4. Retirada (quando disponível) pula essa etapa.
5. Nada disso movimenta ou retém dinheiro. Pix do pedido continua direto ao dono da pizzaria, com conferência humana de recebimento.

### Instalação PWA e notificações

Manifest em `app/manifest.ts`, service worker em `public/sw.js` e convite de instalação no painel. O SW guarda **somente** favicon e ícone em cache, nunca sessões, páginas administrativas, pedidos, API ou comprovantes. A interface avisa sobre falta de internet. O painel já tem alertas de novos pedidos; agora há alerta para novo pedido de análise de endereço quando o navegador mantém o painel aberto e a permissão é concedida.

**Não confundir com push em segundo plano**: avisar com o app inteiramente fechado requer cadastro de subscription Web Push no servidor, chaves VAPID, revogação, eventos e teste real Android/iOS. Isso NÃO está instalado; não prometer recebimento quando a PWA está encerrada.

### Email e domínio

O beta será sem domínio novo e sem confirmação de cadastro. `Confirm email` do Supabase precisa estar desligado para o modo `invite`. O envio de e-mail será SOMENTE para `Esqueci minha senha`. Resend foi escolhido, mas sem domínio de remetente verificado não pode enviar para destinatários arbitrários em produção. Não gastar comprando domínio sem nova decisão. Para testes limitados pode-se validar o provedor padrão do Supabase respeitando seus limites; não marcar `PEDIDO_EMAIL_DELIVERY_READY=true` sem entrega real.

### Release seguro

Antes de mesclar/publicar: CI + testagem no navegador, migrar D1 `0007`, verificar URLs HTTPS e scope PWA, instalar num Android e testar atendimento entre duas contas/lojas. Só então definir a flag `PEDIDO_DELIVERY_APPROVAL_ENABLED=true` e o modo `invite` no ambiente existente.

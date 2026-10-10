# pedido.on — guia de ativação

> Este guia detalha a ativação de integrações externas. Para o estado consolidado do protótipo e do serviço de imagens Lovable, consulte [docs/CONTINUAR.md](docs/CONTINUAR.md). As cotas de importação por OpenAI descritas aqui são diferentes dos limites de imagens, documentados em [docs/IMAGENS.md](docs/IMAGENS.md).

O acesso dos clientes oferece **Google como opção principal** e e-mail/senha como alternativa. O código está preparado para esses dois métodos, mensalidades e importação de cardápio por IA. Cada integração começa desligada e só opera depois da configuração e dos testes abaixo. O editor e os pedidos com Pix/comprovante continuam disponíveis no acesso administrativo interno. O cliente acompanha a compra pelo link privado, sem criar conta. A tela pública não oferece login por ChatGPT.

## Estado verificado em 10 de outubro de 2026

O projeto **Pedido.on**, referência `lxavrmzafumqmbswtfbe`, está conectado à hospedagem em `https://lxavrmzafumqmbswtfbe.supabase.co`. A chamada real de login no site publicado retorna `401` para credenciais inválidas. A entrada bem-sucedida com uma conta real ainda precisa ser verificada.

O SMTP personalizado do Gmail foi desativado pelo proprietário. O e-mail mostrado em 10/10 chegou pelo Supabase Auth, mas era uma confirmação de cadastro em inglês: isso não valida a recuperação nem demonstra que o template da marca esteja aplicado. A política atual é **cadastro direto, sem e-mail de confirmação**, e e-mail exclusivamente em **Esqueci minha senha**.

O código verifica `mailer_autoconfirm=true` antes de cadastrar, para impedir envio acidental de confirmação quando a opção do provedor estiver desatualizada. No Supabase, desative **Confirm email** em Authentication → Sign In / Providers. O cadastro recebe a sessão nativa e abre o painel. Uma conta anteriormente pendente pode repetir o cadastro com o mesmo e-mail e senha, preservando seu UUID e suas pizzarias; não é necessário excluir usuários.

`PEDIDO_AUTH_MODE=prototype` e `PEDIDO_AUTH_TEST_EMAILS` mantêm o acesso restrito às contas autorizadas. `PEDIDO_EMAIL_DELIVERY_READY=false` bloqueia somente recuperação pública fora desse modo, sem impedir cadastro e login. Importação de cardápio por OpenAI e cobrança permanecem desligadas. O serviço de imagens Lovable tem ativação independente. O envio padrão atende e-mails da equipe Supabase no protótipo; não exige compra de domínio. A entrega e o uso de um link real de recuperação ainda precisam ser testados pelo proprietário.

### Onde os dados ficam

Supabase Auth é o único provedor de identificação dos clientes, no projeto `lxavrmzafumqmbswtfbe`. Cardápios, pedidos, perfis de exibição, registros de uso e sessões protegidas do site ficam no D1 da hospedagem, definido por `db/index.ts` e pelo binding `DB` de `.openai/hosting.json`. Os comprovantes privados e imagens ficam no R2 pelo binding `BUCKET`. Por isso não há tabelas públicas ou migrações de pizzarias no Postgres do Supabase: não é sinal de perda de dados nem exige criar outro banco ou outro login.

O D1 não mantém senhas: os tokens Supabase ficam criptografados no servidor, ligados a uma sessão de cookie HttpOnly. A autorização das lojas usa `owner_id = supabase:<UUID>` e é conferida em cada rota. Na consulta de 10/10, o projeto Supabase estava `ACTIVE_HEALTHY`, com uma conta pendente de cadastro e sem avisos do verificador de segurança.

O Google aguarda o cliente OAuth e a ativação no Supabase. A tela só oferece esse botão quando a integração está habilitada. Quando o cadastro por e-mail está indisponível, informa a situação antes de solicitar dados e oferece acesso à demonstração.

## Configuração protegida

Cadastre as variáveis da `.env.example` no ambiente da hospedagem e publique uma versão para aplicar a alteração. Nunca coloque chaves em `.openai/hosting.json`, no Git, no navegador ou em mensagens de suporte.

`AUTH_SESSION_KEY` é uma chave interna de 32 bytes, em hexadecimal. Ela protege os tokens das sessões no banco. A hospedagem já recebeu uma chave gerada para esta implementação. Rotacionar essa chave encerra as sessões locais existentes. `PLATFORM_ADMIN_EMAIL` permite que a conta proprietária, autenticada por ChatGPT, abra `/configuracao`. Uma conta Supabase com o mesmo e-mail não recebe esse privilégio automaticamente.

O acesso nativo antigo fica reservado à operação interna e preserva as lojas existentes; não aparece nas telas de cadastro ou entrada dos clientes. A conta administrativa deve usar seu método original. Entrar com Google não concede privilégios administrativos por igualdade de e-mail.

## 1. Acesso com Google

Use um projeto Supabase próprio da pedido.on e configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e a chave interna já existente. No Google Cloud, configure a tela de consentimento, nome e identidade da plataforma; crie um cliente OAuth do tipo **Aplicativo Web**. Para o domínio público atual:

| Configuração | Valor |
|---|---|
| Origem autorizada no Google | `https://forno-cardapios.waves4845.chatgpt.site` |
| Retorno autorizado no Google | `https://lxavrmzafumqmbswtfbe.supabase.co/auth/v1/callback` |
| Site URL no Supabase | `https://forno-cardapios.waves4845.chatgpt.site` |
| URL de retorno permitida no Supabase | `https://forno-cardapios.waves4845.chatgpt.site/api/auth/google/callback/*` |

Substitua a referência pelo projeto realmente criado. O retorno configurado no Google é o do **Supabase**; o retorno permitido no Supabase é o do **pedido.on**. Atualize as duas configurações quando mudar de domínio. Restrinja as URLs aos domínios que você controla.

Ative o provedor Google em Supabase Auth e coloque o ID e o segredo do cliente OAuth **nesse provedor**, sem copiar o segredo para o Git, o formulário ou o navegador. O fluxo usa os dados básicos necessários ao acesso e os escopos padrão do provedor. Complete a publicação do consentimento no Google; em modo de testes, somente usuários autorizados nesse aplicativo conseguem entrar.

No ambiente de testes, ative `PEDIDO_GOOGLE_ENABLED=true`. Confira cadastro por Google, escolha de conta, cancelamento, retorno ao painel, acesso a uma loja própria, logout e renovação da sessão. Depois dos testes, libere a mesma configuração no ambiente público. O indicador em `/configuracao` consulta o provedor, mas não substitui executar esse ciclo completo. **Google não depende do SMTP**; o acesso por e-mail tem sua ativação separada.

O servidor cria um desafio PKCE S256 e guarda o verificador em um cookie temporário criptografado, HttpOnly, Secure e vinculado à origem. O retorno só é aceito com o estado correspondente e em até dez minutos. O código de autorização é trocado no servidor; os tokens do provedor não vão para o JavaScript do navegador. A conta usa a sessão protegida de sete dias já implementada. A senha de uma conta acessada por Google é gerenciada no Google.

### Instagram e TikTok

O Google é o método social implementado nesta versão. TikTok possui Login Kit para Web, mas precisa de aplicativo, credenciais e aprovação para uso em produção. Sua integração exigiria um fluxo próprio de identificação e recuperação de conta; ela ainda não está implementada. A integração atual Instagram API with Instagram Login atende contas profissionais (Business e Creator) e operações da presença da empresa. Não é a alternativa geral de login escolhida para todos os donos de pizzaria. Essas opções não são exibidas como botões de login sem uma integração real.

Documentação oficial: [Google no Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [TikTok Login Kit Web](https://developers.tiktok.com/docs/en/login-kit-web), [cadastro e aprovação do aplicativo TikTok](https://developers.tiktok.com/docs/en/getting-started-create-an-app), [Instagram Login para contas profissionais](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login).

## 2. Acesso por e-mail

O projeto Supabase já está conectado. Esta aplicação usa Auth por HTTPS, sem precisar acessar o Postgres ou usar `service_role`. Confira:

A conexão e a chave existentes devem ser preservadas. O plugin permite consultar o projeto e os logs, mas as ferramentas atualmente disponíveis não editam os parâmetros de SMTP. Para este projeto, essa configuração fica em Authentication → Emails → SMTP Settings, com os dados descritos no guia de e-mails.

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL HTTPS base do projeto, sem `/auth/v1` |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável do projeto, `sb_publishable_...` |
| `PEDIDO_EMAIL_DELIVERY_READY` | `true` depois de configurar e testar o SMTP |
| `TURNSTILE_SITE_KEY` | Opcional; deve corresponder ao CAPTCHA configurado em Supabase Auth |

Em Auth, habilite e-mail/senha e desative **Confirm email**. A aplicação exige senha entre 12 e 128 caracteres. Configure **Site URL** com a origem pública atual, sem barra final. Inclua `https://forno-cardapios.waves4845.chatgpt.site/redefinir-senha` nas Redirect URLs. Mantenha essas URLs atualizadas se mudar o domínio.

O cadastro dá acesso direto, independentemente do SMTP. A API usa a sessão devolvida pelo Supabase e valida o usuário no provedor antes de criar o cookie protegido do site. A rota de reenvio de confirmação está desativada. As páginas antigas de confirmação são mantidas apenas para compatibilidade com links já emitidos.

O e-mail padrão **Reset password** funciona com o fluxo de recuperação. O modelo com a marca está em `email-templates/recuperacao.html` e em `/configuracao`. Ele usa o link seguro nativo:

```html
<h2>Uma nova senha para sua pedido.on</h2>
<p>Você solicitou a recuperação do acesso. Se foi você, continue abaixo.</p>
<a href="{{ .ConfirmationURL }}">Escolher nova senha</a>
```

A solicitação gera um desafio PKCE S256; o verificador permanece em cookie temporário criptografado, HttpOnly e vinculado à origem. Abra o e-mail no mesmo navegador que solicitou a recuperação. O código de uso único é trocado no servidor somente após o botão **Validar link de recuperação**, com origem correta e CSRF. Tokens do Supabase não são enviados ao JavaScript. Se o provedor retornar à raiz do site, essa página encaminha o código para a recuperação. Links antigos com token hash continuam aceitos via POST.

A sessão de recuperação dura 15 minutos e só permite alterar a senha. Não abre lojas, pedidos nem cobrança. A alteração encerra todas as sessões locais e solicita revogação global no provedor. O login normal dura até sete dias, com renovação protegida.

Para o protótipo, use o SMTP padrão com o e-mail da equipe Supabase. Somente a recuperação consome seu limite atual de duas mensagens por hora. Para enviar recuperação aos clientes externos, configure Resend ou Brevo e teste esse ciclo antes de ativar `PEDIDO_EMAIL_DELIVERY_READY=true`. Os detalhes estão em [EMAIL_SUPABASE.md](EMAIL_SUPABASE.md). Não é necessário trocar banco, hospedagem ou provedor de login.

Teste cadastro sem confirmação nem mensagem, acesso imediato ao painel, login, credenciais erradas, sessão persistente, logout, recuperação, link vencido/reutilizado, alteração de senha e isolamento entre duas pizzarias. Os testes automatizados usam o SQL real e o provedor simulado; não substituem receber o e-mail e executar o ciclo externo.

## 3. Mensalidades

Conclua os dados comerciais, bancários e os documentos solicitados pela Stripe. Comece em **sandbox**. Crie três preços ativos recorrentes, mensais, em BRL, com quantidade 1 e os valores abaixo. O servidor consulta e confere o preço antes de criar o checkout.

| Plano | Mensalidade | Lojas publicadas | Créditos de IA / mês calendário |
|---|---:|---:|---:|
| Essencial | R$ 49 | 1 | 20 |
| Profissional | R$ 89 | 3 | 60 |
| Rede | R$ 149 | 10 | 200 |

Configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ESSENCIAL`, `STRIPE_PRICE_PROFISSIONAL`, `STRIPE_PRICE_REDE` e `STRIPE_WEBHOOK_SECRET`. A chave do servidor pode ser restrita, desde que permita preços, clientes, sessões de Checkout, leitura de assinaturas/faturas e sessões do portal. Não use uma chave publicável nesse campo.

Cadastre a URL pública `/api/billing/webhook` para estes eventos:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Configure o Customer Portal para gerenciar dados de pagamento, cancelar e mudar entre os três planos. Para alterações de plano, configure pagamento/prorrata e confirme o comportamento em sandbox. O site registra o plano efetivamente pago; uma alteração com fatura aberta não libera o limite de um plano maior. Um pagamento atrasado conserva apenas o período já pago. Cancelamento imediato interrompe o acesso; cancelamento ao fim do período segue o estado fornecido pelo Stripe.

Teste pagamento aprovado/recusado, primeira fatura pendente, entrega duplicada e atrasada de webhooks, renovação, mudança de plano com fatura pendente, downgrade e cancelamento. Valide também a capacidade das lojas depois do downgrade. Reembolso e disputa exigem sua política comercial e procedimento de revisão; não habilitam uma decisão automática de reembolso nesta versão.

Depois dos testes, configure as chaves e preços **live** e `PEDIDO_BILLING_ENABLED=true`. Chaves live, preços live e segredo do webhook live devem pertencer à mesma conta. A partir da ativação, publicar e servir os cardápios exige um período pago. Planeje a transição dos clientes do pré-lançamento antes de mudar essa configuração.

Antes da ativação, a plataforma permite montar e publicar sem cobrança; o plano escolhido registra interesse. O retorno do checkout não libera acesso sozinho. O webhook assinado consulta o estado atual da assinatura, confere o cliente da conta e a linha paga da fatura.

## 4. Importação por IA

Configure `OPENAI_API_KEY` no servidor e o faturamento da conta da API. Em seguida, defina `PEDIDO_AI_ENABLED=true`. A aplicação usa Responses, `gpt-6-luna`, entrada de texto ou imagem, saída com schema e `store:false`. O modelo não tem ferramentas nem permissão para publicar ou executar instruções do cardápio.

Uma leitura de texto usa 1 crédito; uma foto, 3. Créditos são limites da aplicação, não dólares nem tokens. A reserva é atômica e identifica cada solicitação para evitar débito duplicado. Erros devolvem o crédito; tentativas interrompidas são reconciliadas após 2 minutos. Os resultados temporários são removidos após 30 dias quando a conta volta a consultar o serviço. O registro agregado de créditos/tokens permanece para acompanhamento.

O pré-lançamento oferece 5 créditos por conta quando a IA é ativada. Com cobrança ativa, os créditos seguem o plano pago. O padrão `PEDIDO_AI_DAILY_LIMIT=100` limita leituras da plataforma; há ainda limite diário de 15 tentativas por proprietário. O teto de saída por chamada é 5.500 tokens; texto de entrada tem até 12.000 caracteres. A foto deve ser JPG, PNG ou WebP, até 3 MB, enviada diretamente: URLs arbitrárias não são aceitas.

Teste texto, imagem, preço ausente, preço único de pizza sem tamanho, conteúdo ilegível, entrada maliciosa, erro do provedor, solicitação repetida e limite de créditos. Os preços ausentes permanecem vazios. Um preço único de pizza precisa ser aplicado a um tamanho pelo proprietário. Os itens revisados entram apenas no rascunho; o proprietário salva e publica. A mensalidade entra na sua empresa; a conta da API é paga separadamente.

## 5. WhatsApp e documentos

Cada loja informa seu número, endereço, entrega/retirada e formas de pagamento. O servidor recalcula o pedido e registra os produtos e preços usados na compra. O pedido chega diretamente ao painel; enviar uma mensagem no WhatsApp não é requisito para iniciar o atendimento.

Em **Minha loja → Entrega e pagamento**, ative **Receber Pix antes do preparo**, cadastre tipo da chave, chave registrada no banco e titular. Salve e publique. Os tipos aceitos são CPF, CNPJ (incluindo formato alfanumérico), e-mail em minúsculo, celular em E.164 e chave aleatória. A validação local confere o formato, não consulta o DICT nem comprova titularidade. O cliente deve conferir o titular no próprio banco.

O pedido com Pix antecipado começa em **Aguardando Pix**. A chave e o titular são copiados para aquele pedido: mudar a configuração da pizzaria não muda o destino mostrado para uma compra já enviada. O cliente usa seu link privado para copiar a chave e anexar JPG, PNG, WebP ou PDF de até 5 MB. O envio muda o estado para **Aguardando aprovação** e avisa o painel.

O comprovante fica em R2 privado, fora das imagens públicas do cardápio. Somente o dono da pizzaria correspondente pode visualizá-lo ou baixá-lo. PDF é entregue como download, com sandbox e bloqueio de execução. Arquivos passam por conferência de assinatura e limite de tamanho. Cada pedido aceita até cinco comprovantes; reenvios preservam os anteriores para auditoria.

Para aprovar, o dono confere a conta bancária, marca que recebeu o valor e informa de 5 a 240 minutos para entrega/retirada. A decisão fica registrada com o dono, a versão e o horário. Duas telas não conseguem aprovar versões diferentes do mesmo comprovante por engano: as decisões exigem a versão atual. A loja pode recusar o comprovante com um motivo, permitindo novo envio, ou cancelar o pedido com uma explicação.

O cliente acompanha **Confirmado → Em preparo → Saiu para entrega → Concluído** (na retirada, não há saída para entrega). A previsão e as mensagens da loja aparecem na mesma página. Uma previsão ultrapassada não conclui o pedido automaticamente. Alterações de prazo são relativas ao momento em que a loja atualiza.

O link usa um segredo aleatório de 256 bits no fragmento `#`, que não é enviado no endereço HTTP. A consulta usa cabeçalho protegido por esse segredo; o banco guarda apenas o hash. O acompanhamento fica disponível por 30 dias. O token não aparece nos registros do painel, no histórico de decisões ou nas URLs do comprovante. Comprovantes e histórico ficam armazenados para a operação; não há expurgo automático de recibos nesta versão.

O painel e o acompanhamento consultam mudanças a cada oito segundos. Em **Ativar alertas**, o dono habilita som e pode permitir notificações do navegador. Os avisos funcionam com o painel aberto, sujeitos às restrições do navegador/dispositivo; não é push com o site fechado. Falha de conexão é sinalizada para evitar que a loja trate uma fila desatualizada como atual.

A pizza é paga diretamente à pizzaria; a plataforma não recebe ou divide esses Pix. Comprovante enviado não é confirmação bancária automática. Cancelar um pedido não devolve dinheiro: eventual devolução deve ser combinada e executada pela pizzaria. Pedidos antigos e lojas que mantiverem Pix na entrega preservam o modo de pagamento original.

Uma integração futura de atendimento automático pelo WhatsApp precisa da API oficial, consentimentos, verificação da empresa e credenciais. Jurisauto não está conectado; nenhum documento de identidade é coletado nesta implementação.

A demonstração em `/demo/pedidos` permite testar cliente e dono juntos. Ela não envia pedidos, não armazena arquivos e não realiza pagamento. Use uma loja real controlada por você para testar recebimento bancário, upload em um celular e notificações antes de liberar aos clientes.

Antes de vender os planos, publique termos de uso, política de privacidade, dados da empresa e contato de suporte, revisados para a sua operação. Defina retenção, atendimento de solicitações de dados, cancelamento, reembolso e backup. Teste restauração e confirme a infraestrutura de e-mails e cobrança antes do lançamento comercial.

## Verificação do projeto

Em `/configuracao`, o proprietário no acesso administrativo interno pode usar **Verificar conexões**. A consulta lê as configurações públicas de Supabase Auth com a chave publicável no servidor, confere cadastro, provedores de Google e e-mail e cadastro direto sem confirmação, e consulta o modelo da IA. Ela não executa OAuth, não envia mensagens, não gera conteúdo, não altera as contas e não ativa serviços. As respostas mostram estados e orientações; não expõem chaves ou mensagens brutas dos provedores. O endpoint `/api/platform/check` exige proprietário, origem correta, CSRF e limite de chamadas.

O teste de IA consulta apenas a disponibilidade do modelo para a chave. Uma resposta positiva não comprova saldo nem permissão de escrita no endpoint Responses. Faça uma importação real de teste antes de liberar o serviço. O indicador de SMTP corresponde à configuração declarada na hospedagem: a recuperação com um destinatário externo precisa ser verificada separadamente.

```bash
node node_modules/typescript/bin/tsc --noEmit
node --test scripts/check-*.test.mjs
npm run build
```

As migrações novas são aditivas e preservam as lojas e seus IDs existentes. A publicação aplica as migrações incluídas no pacote. Os testes verificam cálculos de pedidos, segurança dos links/cookies, criptografia, limites de corpo, permissões da recuperação, períodos pagos, migrações, SQL real de reserva/devolução de créditos e rotas de pedido com SQLite e adaptadores de D1/R2. O fluxo de Pix cobre upload, aprovação manual, ETA, entrega, acesso entre lojas, recusa, reenvio e concorrência.

`scripts/check-auth-routes.test.mjs` executa as rotas de cadastro direto, login, sessão persistente, renovação concorrente, recuperação, alteração de senha e logout. Duas identidades Supabase simuladas tentam listar pedidos/clientes, alterar cardápios, publicar, enviar imagens, abrir comprovantes e aprovar pedidos de outra loja. Uma sessão de recuperação também tenta operações do painel e é recusada. Esses testes usam o SQL real e um provedor simulado: entrega de e-mail, links externos e OAuth reais ainda exigem as integrações externas. Os ciclos externos completos devem ser testados após conectar as contas.

Referências oficiais: [Supabase e-mail templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [sessões](https://supabase.com/docs/guides/auth/sessions), [Stripe Billing e webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

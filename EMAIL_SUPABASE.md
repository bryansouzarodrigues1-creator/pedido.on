# E-mails da pedido.on

Supabase Auth continua sendo o único provedor de contas e senhas. A regra atual é **cadastro com acesso imediato, sem confirmação por e-mail**. O site envia e-mail exclusivamente quando o usuário escolhe **Esqueci minha senha**.

## Protótipo sem contratação

O proprietário informou que desativou **Enable custom SMTP**, retirando o Gmail que retornava `535`. A imagem recebida em 10/10 mostra entrega pelo Supabase Auth de uma confirmação padrão em inglês. Isso comprova aquele recebimento; não comprova recuperação nem aplicação dos templates da marca.

No [acesso do projeto Pedido.on](https://supabase.com/dashboard/project/lxavrmzafumqmbswtfbe/auth/providers), desative **Confirm email** e salve. O servidor confere `mailer_autoconfirm=true` antes de chamar signup, impedindo outra mensagem de confirmação enquanto a configuração estiver desatualizada. O cadastro cria uma sessão validada e abre o painel. Uma conta pendente pode repetir o cadastro com o mesmo e-mail e senha, preservando o identificador e os dados existentes.

Mantenha `PEDIDO_AUTH_MODE=prototype` e os endereços autorizados em `PEDIDO_AUTH_TEST_EMAILS`, com até dez e-mails separados por vírgula. A lista fica apenas no servidor. Ausência ou erro na lista bloqueia o acesso; tokens e sessões de contas fora dela também são recusados.

O SMTP padrão do Supabase envia somente aos e-mails da equipe da organização; confira o limite vigente no painel antes do teste. Apenas a recuperação usa esse envio: cadastro e login não enviam mensagem. No protótipo restrito, `PEDIDO_EMAIL_DELIVERY_READY=false` pode continuar. Importação por OpenAI e cobrança permanecem desligadas; imagens Lovable usam configuração separada, descrita em `docs/IMAGENS.md`.

## Link de recuperação

| Configuração | Valor |
| --- | --- |
| Projeto | `lxavrmzafumqmbswtfbe` |
| Site URL | `https://forno-cardapios.waves4845.chatgpt.site` |
| Redirect URL | `https://forno-cardapios.waves4845.chatgpt.site/redefinir-senha` |
| Confirm email | Desativado |
| Modelo em uso | Reset password |

O e-mail padrão usa `{{ .ConfirmationURL }}` e funciona com a recuperação via PKCE. A solicitação cria um verificador criptografado em cookie HttpOnly. Abra o e-mail no **mesmo navegador** que pediu a recuperação. A página valida o código de uso único via POST e cria uma sessão de 15 minutos que só permite alterar a senha. Tokens do provedor ficam no servidor. Alterar a senha revoga todas as sessões locais e solicita revogação global no Supabase.

Se o Supabase retornar o código à raiz, o site o encaminha à página de recuperação. Links antigos com token hash continuam aceitos via POST. O template em português está preparado em `email-templates/recuperacao.html` e `/configuracao`; preparar o arquivo não comprova que ele foi salvo no painel. A troca de template é opcional para testar o fluxo padrão.

## Envio a clientes externos quando for necessário

O cadastro direto não exige SMTP próprio. Para recuperar senhas de contas fora da equipe Supabase, configure um remetente autenticado no serviço escolhido e teste o recebimento e o link antes de marcar `PEDIDO_EMAIL_DELIVERY_READY=true`.

| Campo do Supabase | Resend | Brevo |
| --- | --- | --- |
| Enable custom SMTP | Habilitado | Habilitado |
| Host | `smtp.resend.com` | `smtp-relay.brevo.com` |
| Port | `465` | `587` |
| Username | `resend` | Login SMTP indicado pela Brevo |
| Password | Chave de API de envio Resend | Chave SMTP Brevo |
| Sender email address | Remetente autenticado | Remetente autenticado |
| Sender name | `pedido.on` | `pedido.on` |

Configure os registros de autenticação fornecidos pelo próprio serviço. A credencial fica apenas no campo Password do Supabase. Não é preciso outra chave no navegador ou outro cadastro por pizzaria. Mantenha **Confirm email desativado** também ao trocar o remetente. O domínio de teste Resend permite enviar apenas ao e-mail da conta Resend; não habilita recuperação geral.

## Validação

1. Cadastrar e entrar imediatamente no painel sem receber mensagem.
2. Criar uma pizzaria, recarregar, sair e entrar novamente.
3. Solicitar Esqueci minha senha, receber e abrir o link no mesmo navegador.
4. Validar o link, alterar a senha e entrar com a nova senha. O link reutilizado, a senha anterior e as sessões antigas devem falhar.
5. Com uma segunda conta autorizada, conferir que não acessa pedidos, clientes, comprovantes ou configurações da primeira pizzaria.

A consulta em `/configuracao` lê configurações públicas; não envia mensagens nem comprova recebimento. Os testes de rotas usam SQL real e um provedor simulado. A confirmação antiga é mantida somente para links já emitidos; o site não solicita nem reenvia confirmação no cadastro atual.

```bash
node --experimental-strip-types --experimental-vm-modules --test scripts/check-*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Os dados das pizzarias e as sessões continuam no D1; usuários e senhas pertencem ao Supabase Auth. Não transfira cardápios nem crie tabelas públicas para resolver o envio.

Referências: [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp), [Brevo SMTP](https://developers.brevo.com/docs/supabase-smtp-integration).

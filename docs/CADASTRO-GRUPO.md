# Cadastro real por convite

O acesso inicial do grupo usa `PEDIDO_AUTH_MODE=invite` e um `PEDIDO_AUTH_INVITE_CODE` secreto, com 16 a 128 caracteres e sem espaços. Não publicar o código em arquivo, API, logs ou GitHub. O convite é informado pelo pizzaiolo no cadastro.

Cadastro por e-mail exige o provedor habilitado, novos usuários permitidos e **Confirm email desativado** no Supabase. A página consulta essas configurações reais antes de oferecer o formulário. A rota de cadastro confere novamente antes de signup e valida o usuário no provedor antes de emitir a sessão protegida. Cadastro não envia mensagem nem exige cartão.

Contas existentes, sessões e proprietários antigos permanecem válidos. Não apagar usuários, recriar lojas ou trocar `AUTH_SESSION_KEY`. Em modo convite, uma conta criada diretamente no Supabase só entra no aplicativo se já possuir perfil/pizzaria ou passar pelo cadastro autorizado. Metadados editáveis do usuário não liberam o acesso.

O convite não controla a calculadora nem os clientes que compram pizza: esses fluxos continuam sem cadastro. Não há CAPTCHA nesta etapa; limites de tentativas, CSRF, verificação de origem e autorização de loja continuam ativos.

`PEDIDO_EMAIL_DELIVERY_READY=false` permanece até receber e usar um link real de recuperação pelo Resend/Supabase. O trial de sete dias ainda não tem fiscalização completa e Asaas permanece separado. Não apresentar essas etapas como prontas por ativar o cadastro.

## Validação

129 testes do aplicativo e typecheck passaram. As novas verificações cobrem o convite antes de signup, sessão validada, ausência de confirmação, configuração do provedor, bloqueio de inscrição externa, recuperação e preservação das sessões/perfis/lojas anteriores. Provedor e bindings são adaptados nos testes locais; o cadastro de uma conta nova e a entrega de recuperação exigem prova no ambiente real.

Após a publicação, abrir `/cadastro`, informar convite/nome/e-mail/senha e conferir acesso direto ao painel. Sair e entrar novamente. Conferir também o acesso da conta antiga e isolamento entre pizzarias. `/api/auth/config?registration=1` deve retornar `prototype:false`, `inviteRequired:true`, `directSignup:true` e `recoveryEnabled:false`, sem devolver convite ou segredos. Esse GET verifica configuração; não substitui cadastrar uma conta.

## Publicação e bloqueio externo confirmado

Sites v19 foi publicada em 12/10/2026 às 02:18:30 UTC, ambiente revisão 6, modo `invite` e convite secreto configurados. O GET real do aplicativo devolveu 200, `prototype:false`, `inviteRequired:true`, `directSignup:false`, recuperação/Google/CAPTCHA desativados. O GET real de configurações do Supabase confirmou e-mail habilitado e signup permitido, mas `mailer_autoconfirm:false`. **Confirm email deve ser desativado** no projeto `lxavrmzafumqmbswtfbe` antes de liberar o formulário. Nenhuma confirmação foi enviada durante o diagnóstico. O acesso seguro ao painel foi concluído pelo proprietário. A alteração está preparada no formulário, sem salvar e sem modificar outras opções. Falta confirmação no momento de salvar, exigida pela política do navegador para desativar uma verificação de acesso; essa configuração não está disponível nos métodos do plugin Supabase instalado.

Depois de salvar no Supabase, repetir o GET do aplicativo para comprovar `directSignup:true`, sem publicar outra versão nem trocar chaves. Ainda é necessário criar uma conta real pelo formulário e validar login/isolamento. Recuperação por Resend e fiscalização de trial continuam pendentes.

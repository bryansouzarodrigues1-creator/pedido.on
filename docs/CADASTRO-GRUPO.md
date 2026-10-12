# Cadastro real por convite

O acesso inicial do grupo usa `PEDIDO_AUTH_MODE=invite` e um `PEDIDO_AUTH_INVITE_CODE` secreto, com 16 a 128 caracteres e sem espaços. Não publicar o código em arquivo, API, logs ou GitHub. O convite é informado pelo pizzaiolo no cadastro.

Cadastro por e-mail exige o provedor habilitado, novos usuários permitidos e **Confirm email desativado** no Supabase. A página consulta essas configurações reais antes de oferecer o formulário. A rota de cadastro confere novamente antes de signup e valida o usuário no provedor antes de emitir a sessão protegida. Cadastro não envia mensagem nem exige cartão.

Contas existentes, sessões e proprietários antigos permanecem válidos. Não apagar usuários, recriar lojas ou trocar `AUTH_SESSION_KEY`. Em modo convite, uma conta criada diretamente no Supabase só entra no aplicativo se já possuir perfil/pizzaria ou passar pelo cadastro autorizado. Metadados editáveis do usuário não liberam o acesso.

O convite não controla a calculadora nem os clientes que compram pizza: esses fluxos continuam sem cadastro. Não há CAPTCHA nesta etapa; limites de tentativas, CSRF, verificação de origem e autorização de loja continuam ativos.

`PEDIDO_EMAIL_DELIVERY_READY=false` permanece até receber e usar um link real de recuperação pelo Resend/Supabase. O trial de sete dias ainda não tem fiscalização completa e Asaas permanece separado. Não apresentar essas etapas como prontas por ativar o cadastro.

## Validação

134 testes do aplicativo, typecheck e build passaram. As verificações cobrem o convite antes de signup, sessão validada, ausência de confirmação, configuração do provedor, bloqueio de inscrição externa, recuperação e preservação das sessões/perfis/lojas anteriores. Provedor e bindings são adaptados nos testes locais. Cadastro e login normais foram também comprovados em produção, conforme abaixo; a entrega de recuperação permanece pendente.

Após a publicação, abrir `/cadastro`, informar convite/nome/e-mail/senha e conferir acesso direto ao painel. Sair e entrar novamente. Conferir também o acesso da conta antiga e isolamento entre pizzarias. `/api/auth/config?registration=1` deve retornar `prototype:false`, `inviteRequired:true`, `directSignup:true` e `recoveryEnabled:false`, sem devolver convite ou segredos. Esse GET verifica configuração; não substitui cadastrar uma conta.

## Publicação e configuração externa confirmadas

Sites v19 foi publicada em 12/10/2026 às 02:18:30 UTC, ambiente revisão 6, modo `invite` e convite secreto configurados. A verificação inicial encontrou `directSignup:false`, causado por Confirm email ainda ativado no Supabase. O proprietário autorizou explicitamente salvar a desativação; a opção foi salva no projeto `lxavrmzafumqmbswtfbe`, sem alterar as demais opções de acesso.

Após salvar, o GET real do aplicativo retornou 200 às **02:57:06.934 UTC**, `enabled:true`, `registrationEnabled:true`, `directSignup:true`, `prototype:false`, `inviteRequired:true`, recuperação/Google/CAPTCHA desativados. A interface Supabase mostrou Confirm email desmarcado e Save changes desabilitado após salvar. Não foi necessário publicar outra versão, trocar chaves, enviar confirmação ou recriar usuários.

Na verificação da v19, ainda faltava cadastrar uma conta e validar login/isolamento. O GET comprovava a configuração, sem comprovar uma nova conta. A validação posterior da v20 está registrada abaixo; recuperação por Resend e fiscalização de trial continuam pendentes.

**Validação posterior — v20, 12/10/2026:** uma conta isolada foi criada com convite pelo POST normal `/api/auth/register`, **200** às **10:57:31.309 UTC**, request `1fa1bab459b415764cf2697a2fa6e1d8`. O aplicativo emitiu `__Host-pedido-session`, confirmou a sessão Supabase e permitiu acesso direto. A conta inicialmente não via pizzarias. Após sair, `/api/auth/login` recebeu **200** às **10:58:11.712 UTC**, request `0fc1cd79e23e54ee9a8af970cfe7079f`. Uma pizzaria privada de teste foi criada e apareceu somente nesse painel; as duas pizzarias e o perfil existentes permaneceram iguais na comparação posterior. O teste terminou com logout e sessão nula. Isso comprova cadastro/login do backend real por APIs normais, sem confirmação nem sessão fabricada; ainda falta conferir o formulário no celular do dono. Recuperação de e-mail e fiscalização de trial não foram ativadas ou declaradas prontas.

A proteção de convite foi exercitada na produção após a liberação: POST `/api/auth/register` sem convite recebeu **403**, sem cookie `__Host-pedido-session`; o perfil existente permaneceu único e as três sessões existentes têm criação anterior ao teste. O cookie retornado pelo perímetro não é uma sessão do aplicativo; não inferir login apenas por existir Set-Cookie. A página `/cadastro` foi consultada anonimamente e retornou 200, sem o aviso antigo de protótipo. O teste negativo não criou conta nem comprovou um cadastro válido completo.

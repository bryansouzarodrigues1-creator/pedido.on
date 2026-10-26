# Auditoria de acesso e continuidade — 26/10/2026

## Continuidade recuperada

Foram recuperadas as mensagens relevantes e as últimas decisões do chat “Verificar recuperação de conta”, também chamado de recuperação de senha. Não há uma transcrição integral disponível nesta integração; não declarar leitura literal de mensagens ou anexos não retornados.

O atendimento registrou que o link anterior abria a página normal, configuração de SMTP Gmail/modelo de recuperação no Supabase e confirmação de envio às 12h20 de Brasília. Não foi encontrada confirmação de recebimento seguida de troca de senha e novo login. A conversa comercial posterior não constitui ensaio do produto. O último pedido é aprofundar cadastro, login, recuperação, uso, publicação, pedido, WhatsApp, Pix e administração, preservando as contas e sem pedidos/cobranças reais.

As PRs #131 (atalho administrativo para o provedor) e #132 (horários no cardápio e configuração) foram integradas à main enquanto a correção de retomada era preparada. Ambas foram conservadas no conjunto atual. Ainda não havia nova publicação Sites: versão 100 na consulta.

## Evidência atual

- Projeto Supabase consultado: `ACTIVE_HEALTHY`. Logs foram consultados somente em agregados por ação/status, sem expor identificadores, tokens, mensagens, IPs ou e-mails de clientes. Os registros confirmam solicitações de recuperação no período, sem demonstrar que o cliente completou a troca e entrou.
- A página pública `/esqueci-senha` foi aberta no navegador: continua informando que a recuperação por e-mail está indisponível e oferece atendimento por WhatsApp. Configurar SMTP no provedor não liga automaticamente essa opção no aplicativo.
- O código já aceita token hash na rota `/redefinir-senha` e código PKCE com cookie do navegador que iniciou a solicitação. A sessão de recuperação tem finalidade restrita e não abre o painel, publica, altera cardápio, lê clientes ou aprova pedidos.
- O modelo de recuperação versionado ainda usava `ConfirmationURL`, que no envio manual do painel pode não indicar a rota de nova senha. O modelo foi alinhado ao endereço explícito `SiteURL/redefinir-senha?token_hash=TokenHash`. Isso também atende abertura em outro navegador. Não foram alterados SMTP, remetente ou credenciais de produção nesta revisão.

## Correções

O formulário de acesso agora permite repetir a consulta de configuração sem recarregar a página, limita o tempo das requisições e impede envios simultâneos. Uma queda durante cadastro ou troca de senha apresenta resultado incerto com orientação para conferir antes de reenviar; não há repetição automática. Respostas HTML/inválidas do gateway viram mensagens compreensíveis. A senha sai do estado do formulário após confirmação da alteração e não vai para armazenamento do navegador.

Foi mantida a regra: cadastro direto sem confirmação de e-mail; autenticação real no servidor; senha atual exigida para alteração em sessão comum; recuperação validada pelo provedor para quem perdeu o acesso. O administrador não visualiza senhas. O atalho Supabase existente exige a conta administradora do provedor e não concede acesso novo.

## Matriz de validação

| Jornada | Cobertura nesta revisão | Limite |
|---|---|---|
| Cadastro | Rotas com SQLite/migrações reais, identidade externa simulada; cartão de cadastro no Chrome | Não cria conta real nem dispara confirmação |
| Login e logout | Erro, retorno seguro, persistência, renovação concorrente, sessão revogada e saída nas rotas; erro/sucesso do formulário no Chrome | Provedor e credenciais de ensaio são controlados |
| Recuperação | Token inválido/expirado/reutilizado, PKCE, outro navegador para token hash, sessão restrita, revogação das sessões antigas e login com senha nova nas rotas | Entrega SMTP e caixa postal real pendentes |
| Nova senha | Link removido da URL, validação antes do editor, confirmação de senha, falha de rede, não persistência e um envio explícito | Respostas de API do ensaio de interface são simuladas |
| Cardápio | Edição, revisão, publicação, propriedade e recuperação local em ambiente isolado | Teste de turno em pizzaria real pendente |
| Pedidos/WhatsApp | Fluxo cliente/dono, loja sem verificação, mensagem interceptada, conversa e retomada | Sem mensagem externa ou cliente real |
| Pix | Comprovante, aprovação, isolamento, versões e comanda | Não houve Pix bancário; pagamento online automático ainda não implementado |
| Administração | Rotas com função de administrador e separação de titulares, UI no Chrome | Não ensaiar bloqueio ou alteração de senha de cliente real para provar o teste |
| Android/PWA | Service worker real no Chrome, rede cortada, congelamento/retomada e rascunho | Emulação, não Android físico nem reprodução conclusiva do print nativo |

## Pendências concretas

1. Com uma conta de teste controlada pelo proprietário, comprovar chegada do e-mail, abrir o link, escolher senha e entrar novamente. Só então liberar o envio de recuperação no aplicativo. A conta do cliente atendido não foi usada nos novos ensaios.
2. Validar a PWA no Android físico alternando com WhatsApp e rede móvel. O print sem URL/aplicativo identificado não prova a origem da tela nativa de falha.
3. Primeiro recebimento externo de assinatura e homologação operacional de pedidos/impressora permanecem separados das verificações simuladas.

Nenhum e-mail externo, redefinição de senha de cliente, pagamento, mensagem de WhatsApp ou geração de IA paga foi executado nesta auditoria. A configuração SMTP relatada pertence ao atendimento anterior.

Fontes técnicas: [Supabase — senhas](https://supabase.com/docs/guides/auth/passwords), [modelos e TokenHash](https://supabase.com/docs/guides/auth/auth-email-templates), [Chrome — ciclo da página](https://developer.chrome.com/docs/web-platform/page-lifecycle-api).

# Cadastro e handoff reais na v45 — 16/10/2026

Complementa os [24 cenários locais e 20 públicos](QA-CHROME-CI-2026-10-16.md). Usa Chrome no GitHub Actions, Supabase Auth, D1 e R2 reais da aplicação publicada, pelos formulários normais. Não usa mock de identidade, sessão forjada, acesso administrativo ou chave Supabase.

Cada slot de QA possui endereço reservado `example.test` e slug fixos, com nome de conta identificado como QA. A senha aleatória fica somente na memória do processo. O teste permite um cadastro, um rascunho privado, duas imagens de marca próprias e uma gravação por slot. Todos os outros métodos de gravação da aplicação são bloqueados; publicação, pedidos, cobrança e geração paga não são permitidos. A verificação normal da Cloudflare permanece ativa.

Perfis, cookies, senhas e variáveis não são incluídos nos artefatos. As capturas ocorrem depois do acesso ao painel. Service workers são bloqueados para manter a interceptação de rede; avisos de PWA decorrentes desse bloqueio não são uma homologação de instalação ou falha observada no uso normal.

## Primeiro slot

PR #31, código `5c07d0c7fad792df55154fecac8d286d1acdefba`, execução `38976852732`, artefato `12079431205`. Passaram quatro verificações: configuração direta/Google condicional, cadastro Supabase sem confirmação por e-mail, nome/briefing/visual recebidos no rascunho privado e transferência de texto/logo/capa com gravação no D1/R2 real.

O teste parou antes da retomada porque exigia também o espaço final do briefing. `CreateRestaurant` usa `vision.trim()` ao compor a mensagem do Estúdio. A captura mostrou a mensagem longa preservada e o botão de geração bloqueado pelo limite de texto. A expectativa foi corrigida para comparar o conteúdo sem espaços externos; isso não exigiu alteração do aplicativo.

A conta e o rascunho desse slot continuam privados. Não houve tentativa de recuperar sua senha, reutilizar sessão por meio administrativo ou repetir esse cadastro.

## Segundo slot e resultado final

Uma tentativa intermediária, código `a66eae1a4196f409969fa88ee0d2c1c1d3225442`, execução `38977219865`, parou na espera de inatividade de rede da primeira navegação. A página estava interativa e os outros 13 cenários passaram; nenhum cadastro novo foi enviado. O teste passou a aguardar o campo habilitado após `DOMContentLoaded`, mantendo a verificação de hidratação e evitando confundir tráfego de fundo com indisponibilidade.

Código final de teste `0e31838df8c20ed18eb0850b2355b1cdd64d9270`, execução `38977586275`, artefato `12079596998`. **Seis verificações aprovadas, zero falhas, erros de JavaScript ou solicitações proibidas.** Concluído às 22:45 UTC. Os 14 cenários anteriores de preparação sem conta também passaram nessa execução.

1. Projeto, arquivos e configuração de cadastro recuperados; Google oculto de acordo com a configuração.
2. Cadastro Supabase por e-mail abre diretamente o painel, sem confirmação, preservando o nome e o briefing.
3. Um rascunho privado recebe estilo e refinamento, com zero produtos de exemplo e Pix sem configuração.
4. Texto, logo e capa transferidos; imagens próprias enviadas ao R2 e rascunho guardado no D1 real.
5. Briefing longo e refinamento completos chegam ao Estúdio; nenhum botão de geração foi acionado.
6. Fechar e reabrir o Chrome mantém a sessão Supabase por e-mail e o mesmo rascunho, sem novo login ou duplicação.

Na continuação foram criadas **duas contas de QA, dois rascunhos privados e quatro imagens próprias de teste**. A tentativa intermediária de espera de rede não enviou cadastro. A v45 e a revisão 13 do ambiente permanecem; os novos arquivos são testes/documentação, sem nova publicação Sites. Após a comprovação, o gatilho de atualizações foi retirado desse workflow: novos commits não repetem o cadastro. O CI regular de domínio e navegador continua ativo.

## Limites que permanecem

Este fluxo não valida Google OAuth: a configuração retornou Google desativado e o botão não foi exibido, como previsto. Recuperação de senha, proteção contra senhas comprometidas, Asaas financeiro, trial fiscalizado, notificações, instalação PWA e Android físico continuam pendentes.

Os registros de QA são cadastros reais e entram nas métricas e no teste normal de sete dias; não devem ser contados como pizzarias do beta comercial. Nenhum plano Free permanente, cobrança, nova cota especial ou ativação de corte foi criado. A correção profunda do OCR continua aberta após o resultado insuficiente do cardápio público real.

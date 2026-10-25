# Publicação do acesso e continuidade — 25/10/2026

A v91 foi publicada em 25/10/2026 às 07:58 de Brasília (10:58 UTC). Inclui o código da main até `a0dcfa91bed308bdebff48cd0cda442bc265e622`: cartão de cadastro, WhatsApp de suporte condicionado à configuração e política de recuperação controlada pelo titular. Preserva a calculadora gratuita, 80 layouts e admin de cardápios compartilhados da v90.

## Evidências

- Site principal: https://pizzaria-on.netlify.app
- Backend preservado: https://forno-cardapios.waves4845.chatgpt.site
- Fonte Sites: `777a03fc11493464c1f66874e3b40f3aef9278fe`; árvore idêntica à main: `9b278d6013d4341ce94fa8a63e3c89e381ce82eb`.
- Versão salva: `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_3a8aa3357548819186d241a652a841dd`.
- Implantação `appgdep_6adde0a474ec8191beefe382e7bdf5b0`: `succeeded`; configuração revisão 14.
- 652 testes locais, TypeScript e build aprovados. CIs Chrome, Windows e autenticação/pedidos das PRs [#115](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/115) e [#117](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/117) confirmados como sucesso pelas ferramentas GitHub.
- A página pública `/esqueci-senha` foi aberta no navegador e informa corretamente que e-mail e contato de recuperação estão indisponíveis. Nenhuma senha ou conta real foi alterada; não houve geração paga.

## O que ainda bloqueia a recuperação

`PEDIDO_SUPPORT_WHATSAPP` não está configurado no Sites. O contato oficial com DDD não foi encontrado no histórico; a pergunta de configuração não recebeu resposta. É necessário informar esse número para habilitar o caminho de suporte. A configuração deve permanecer no servidor, sem gravar contato real no GitHub.

SMTP continua desativado. O WhatsApp abre atendimento, mas não autentica nem redefine senha. A [issue #116](https://github.com/bryansouzarodrigues1-creator/pedido.on/issues/116) permanece aberta: exige MFA no administrador, fator forte do titular previamente verificado, desafio vinculado ao navegador, expiração curta, uso único, auditoria sem segredos e revogação de sessões.

A documentação oficial do Supabase foi consultada em 25/10/2026. Passkeys continuam experimentais e dependem de configuração do RP ID/origens e credencial previamente cadastrada. TOTP do usuário da aplicação é diferente de MFA da conta do painel Supabase; nenhum dos dois foi declarado ativo sem comprovação. Referências: [passkeys](https://supabase.com/docs/guides/auth/passkeys), [MFA da aplicação](https://supabase.com/docs/guides/auth/auth-mfa), [MFA do painel](https://supabase.com/docs/guides/platform/multi-factor-authentication).

## Espelho Lovable

O código funcional até a PR #66 está integrado. Foram identificados 12 arquivos de documentação/QA ainda divergentes da fonte canônica; a sincronização nesta entrega corrige essas divergências sem reconstruir o frontend TanStack ou o backend. A publicação do frontend é conferida separadamente; o CI histórico do espelho não substitui essa conferência.

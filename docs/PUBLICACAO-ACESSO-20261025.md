# Publicação do acesso e continuidade — 25/10/2026

A **v92** foi publicada em 25/10/2026 às **08:24 de Brasília** (11:24 UTC). O WhatsApp oficial foi informado pelo proprietário e configurado somente no runtime. O contato tem oito dígitos depois do DDD; a aplicação preserva exatamente esse formato, sem acrescentar um nono dígito.

## Publicação conferida

- Site principal: https://pizzaria-on.netlify.app/esqueci-senha
- Frontend Lovable: https://pizzaria-on-estilos.lovable.app/esqueci-senha
- Backend preservado: https://forno-cardapios.waves4845.chatgpt.site
- Fonte Sites: `c4a8e1c11f38ea4ec0346f85ff864f1bb5593301`, árvore `ff78d222bdec0c3f3e75d06daa76e9435962168a`, idêntica à candidata de runtime `ced7eea5f9c3ab968608ffbb482f5a4792b1a3fa`.
- Versão salva: `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_1891b5b225f881918ca78c22bb1ce537`.
- Implantação `appgdep_6adde6ee4a4c8191b5e04688e43ac322`: `succeeded`, configuração revisão **15**.
- No navegador, as duas páginas exibiram **Solicitar recuperação pelo WhatsApp** com o destino exato configurado. Nenhuma mensagem foi enviada. Não consultar ou publicar o telefone real em fixtures, exemplos ou documentação.
- 655 testes locais, TypeScript e build aprovados. A primeira rodada Chrome aprovou todas as 13 suítes locais; a etapa pública revelou uma expectativa antiga de cadastro. O teste foi corrigido para exigir o alerta e recusar o cartão quando o mock não confirma a criação da conta. O comportamento seguro do produto não foi alterado.

A rodada final do head `59e1c29e9c9d95d3e43e59be3865a6d1c679be12` passou em **Chrome** (`40189211413`), **Windows** (`40189211364`) e **autenticação/pedidos** (`40189211416`).

O ajuste de QA posterior ao runtime está na candidata `59e1c29e9c9d95d3e43e59be3865a6d1c679be12`; só muda `scripts/check-menu-documents-browser.mjs`. Não altera o aplicativo compilado da v92. Os resultados finais estão na [PR #119](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/119) e no [registro estruturado](evidence/acesso-publicacao-20261025.json).

## Atendimento e recuperação

`PEDIDO_SUPPORT_WHATSAPP` está configurado como segredo no servidor e foi aplicado pela publicação. Não pedir novamente esse número nem substituí-lo por números de testes ou de outros projetos.

O WhatsApp abre atendimento; não autentica o cliente, cria sessão ou redefine senha. SMTP permanece desativado. A [issue #116](https://github.com/bryansouzarodrigues1-creator/pedido.on/issues/116) continua exigindo MFA do administrador, fator forte do titular previamente verificado, desafio vinculado ao navegador, expiração curta, uso único, auditoria sem segredos e revogação de sessões. Nenhuma conta ou senha real foi alterada.

A consulta oficial anterior registrou passkeys experimentais, dependentes de RP ID/origens e credencial previamente cadastrada. Não declarar passkey ou MFA ativos sem implementação e comprovação. Referências: [passkeys](https://supabase.com/docs/guides/auth/passkeys), [MFA da aplicação](https://supabase.com/docs/guides/auth/auth-mfa), [MFA do painel](https://supabase.com/docs/guides/platform/multi-factor-authentication).

## Espelho Lovable

A PR #67 sincronizou o corretivo e os 16 arquivos de documentação/QA atrasados. A árvore completa do espelho foi confirmada igual à candidata de runtime. A PR #68 leva apenas a correção da expectativa do teste público, mantendo a fonte completa sincronizada. O frontend v92 foi publicado e conferido no navegador, preservando TanStack, ponte de backend, contas, calculadora gratuita, 80 layouts e admin. O CI próprio do espelho voltou a falhar antes das etapas (run `40188920208`); não é apresentado como aprovado. Não houve geração paga.

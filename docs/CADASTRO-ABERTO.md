# Cadastro aberto — 12/10/2026

Autorizado pelo proprietário: novos cadastros sem convite. Sites v27, fonte bce270d4dc6b2353c17f10cd328fe498bef727eb, implantação appgdep_6acd716aa9008191a27aabe5fb58e9a3 concluída em 2026-10-12T23:47:14.073975Z; ambiente revisão 9 com PEDIDO_AUTH_MODE=open. Público preservado.

Produção: GET /api/auth/config?registration=1 retornou 200, enabled=true, registrationEnabled=true, directSignup=true, inviteRequired=false, prototype=false, googleEnabled=false, captchaSiteKey vazio. GET /cadastro retornou 200 sem aviso de protótipo. Não foi criada uma nova conta em produção nesta alteração. No teste automatizado, Auth externo simulado confirmou cadastro sem convite, sessão direta, trial único e negação do admin. Passaram 176 testes, typecheck e build.

Chave de sessão, contas, D1/R2, administrador fixado e cotas IA preservados; nenhuma migração, geração paga ou e-mail enviado. Recuperação continua desativada até validar entrega real; cobrança/trial enforcement permanecem desativados. O modo invite continua no código para uso futuro explícito, mas não deve ser reativado em publicações comuns.

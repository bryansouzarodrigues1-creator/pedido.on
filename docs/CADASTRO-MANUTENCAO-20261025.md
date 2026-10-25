# Cadastro bloqueado após limpeza concluída

Em 25/10, uma tentativa real de cadastro na Netlify recebeu HTTP 503 com a
mensagem de preparação da plataforma. A limpeza já estava concluída no D1 desde
16:12:56 de Brasília. A configuração Sites revisão 17 não listava mais as três
variáveis de manutenção, mas a execução ainda bloqueava o POST de cadastro.

A revisão 18 substitui explicitamente as variáveis antigas por valores inertes:
`PEDIDO_RESET_ID=disabled`, `PEDIDO_RESET_UNTIL=0` e
`PEDIDO_RESET_CUTOFF=disabled`. Não basta presumir que remover uma variável do
plano de configuração tenha apagado um segredo retido pelo provedor.

A guarda de autenticação agora consulta o marcador de conclusão quando há uma
janela antiga armada. Uma execução `done` nunca bloqueia login ou cadastro; uma
limpeza pendente continua protegida. O reset permanece de uso único e não é
executado novamente. Nenhuma conta, senha ou pizzaria é apagada nesta correção.

As regressões isoladas cobrem bloqueio antes da conclusão, liberação imediata
após a conclusão e cadastro com provedor simulado. O diagnóstico público envia
somente `{}` com CSRF válido ao cadastro e exige HTTP 400, demonstrando que a
requisição chegou à validação. Ele nunca envia e-mail ou senha e não cria conta.
Esse teste verifica disponibilidade, não comprova cadastro real de um titular.

Preservar o convite privado de administrador e a política de 12 caracteres para
ele. Cadastro comum segue com seis caracteres, sem composição obrigatória.

# Trabalhar no pedido.on

- O aplicativo principal está na raiz; o serviço Lovable está em `services/image-service`, com configuração, dependências e instruções próprias.
- Leia `README.md` e `docs/CONTINUAR.md`. Preserve o protótipo e as funcionalidades; não reconstrua contas ou transfira banco sem tarefa específica.
- Contas usam Supabase Auth. Dados e sessões ficam no D1; imagens e comprovantes no R2. Toda rota administrativa confirma propriedade no servidor.
- Para este protótipo, cadastro é direto e não envia confirmação. E-mail somente na recuperação. Preserve lista de teste e projeto Supabase.
- Nunca envie chaves, tokens, comprovantes, dumps ou dados pessoais ao GitHub. Não altere a chave interna de sessão durante exportações ou publicações comuns.
- Preserve migrações aplicadas; gere uma migração nova para mudanças de esquema.
- Não force push nem reescreva histórico publicado. Não conecte a raiz deste monorepositório ao projeto Lovable do serviço.
- Execute `pnpm test` e `pnpm typecheck` para mudanças do aplicativo. Use os comandos da pasta do serviço para suas alterações. Descreva testes externos simulados como simulados.
- Não gastar créditos Lovable, comprar saldo, aumentar limites nem executar geração real sem aviso de custo e autorização do proprietário. Leituras, mocks e consultas de saúde podem prosseguir.
- Publicações Sites preservam o projeto de `.openai/hosting.json` e seguem o fluxo oficial. Este repositório não possui implantação automática de produção configurada.

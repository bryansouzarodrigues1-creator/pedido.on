# Trabalhar no pedido.on

- O aplicativo principal está na raiz; o serviço Lovable está em `services/image-service`, com configuração, dependências e instruções próprias.
- Leia `README.md` e `docs/CONTINUAR.md`. Preserve o aplicativo e as funcionalidades; não reconstrua contas ou transfira banco sem tarefa específica.
- Contas usam Supabase Auth. Dados e sessões ficam no D1; imagens e comprovantes no R2. Toda rota administrativa confirma propriedade no servidor.
- O cadastro está aberto sem convite por decisão do proprietário em 12/10/2026; é direto e não envia confirmação. O modo por convite permanece disponível no código, sem reativá-lo nas publicações comuns. E-mail somente na recuperação, após entrega validada. Preserve contas existentes, sessões, a antiga lista de teste e o projeto Supabase; não reative o modo de protótipo.
- Nunca envie chaves, tokens, comprovantes, dumps ou dados pessoais ao GitHub. Não altere a chave interna de sessão durante exportações ou publicações comuns.
- Preserve migrações aplicadas; gere uma migração nova para mudanças de esquema.
- Não force push nem reescreva histórico publicado. Não conecte a raiz deste monorepositório ao projeto Lovable do serviço.
- Execute `pnpm test` e `pnpm typecheck` para mudanças do aplicativo. Use os comandos da pasta do serviço para suas alterações. Descreva testes externos simulados como simulados.
- Não gastar créditos Lovable, comprar saldo, aumentar limites nem executar geração real sem aviso de custo e autorização do proprietário. Leituras, mocks e consultas de saúde podem prosseguir.
- Publicações Sites preservam o projeto de `.openai/hosting.json` e seguem o fluxo oficial. Este repositório não possui implantação automática de produção configurada.

# pedido.on — servidor de imagens

Serviço TanStack Start exportado do projeto [Pedido On Imagens na Lovable](https://lovable.dev/projects/c1919edd-8b5e-40f8-b646-9ccd9c69e01f), commit `4578d1cc508cfc850946fcf882bab3032288ab18`.

A rota `/api/pedido-on/image` gera logo, capa ou imagem de perfil após resgatar uma autorização de uso único no aplicativo principal. Não aceita prompt, modelo nem URL de retorno enviados pelo navegador. O fluxo do proprietário acontece no painel do pedido.on.

```sh
cd services/image-service
bun install --frozen-lockfile
bun run test
bunx tsc --noEmit
bun run build
```

`bun run dev` inicia o ambiente local. Sem credenciais e autorização válida, o servidor não gera imagem. Preserve o `bun.lock` e a configuração de `@lovable.dev/vite-tanstack-config`; esse pacote já inclui os plugins de TanStack, React, Tailwind e Nitro.

Use `.env.example` como referência para variáveis do servidor. Preserve a chave gerenciada na Lovable; nunca use prefixo `VITE_` para a chave. O GitHub não contém a chave e a exportação não configura sincronização automática do projeto Lovable.

Leia [o protocolo e os limites](../../docs/IMAGENS.md), [a arquitetura](../../docs/ARQUITETURA.md) e `AGENTS.md` antes de editar. Mudar o domínio principal exige revisar `CLAIM_URL`. Os testes usam respostas simuladas e não consomem saldo.

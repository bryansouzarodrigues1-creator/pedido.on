# pedido.on — servidor de imagens

Serviço TanStack Start do projeto ativo [Pedido On Estudio na Lovable](https://lovable.dev/projects/aa27093c-2768-41f2-8274-923fdfe2b5ff), publicado em https://pedido-on-estudio.lovable.app. A última fonte remota conferida é `81b09ac97be1ddfa62ec5ff60fb63fe6094a5221`.

As rotas `/api/pedido-on/studio` e `/api/pedido-on/image` geram sugestões e imagens após resgatar uma autorização de uso único no aplicativo principal. Não aceitam prompt, modelo nem URL de retorno enviados pelo navegador. O fluxo do proprietário acontece no painel do pedido.on.

O destino padrão de produção é Cloudflare, via Nitro. O `fetch` injetado precisa estar ligado a `globalThis`, e as chamadas usam `redirect: "manual"`, rejeitando respostas 3xx sem encaminhar autorização. Na raiz, `pnpm test` inclui os dois handlers no workerd com respostas externas simuladas. Ver [diagnóstico de produção](../../docs/IA-PRODUCAO.md). A correção neste checkout ainda precisa ser sincronizada e publicada na Lovable; o GitHub não faz essa publicação.

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

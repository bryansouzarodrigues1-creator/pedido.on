import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "pedido.on · Serviço de imagens" },
      { name: "description", content: "Serviço interno de imagens do pedido.on. Disponível apenas pelo painel do app principal." },
      { property: "og:title", content: "pedido.on · Serviço de imagens" },
      { property: "og:description", content: "Serviço interno de imagens do pedido.on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">pedido.on · Serviço de imagens</h1>
        <p className="text-muted-foreground">
          Este serviço gera logos, capas e fotos de perfil apenas a partir de pedidos autorizados no
          painel do pedido.on. Não há gerador aberto nesta página.
        </p>
        <a
          href="https://forno-cardapios.waves4845.chatgpt.site"
          className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Ir para o pedido.on
        </a>
      </div>
    </main>
  );
}

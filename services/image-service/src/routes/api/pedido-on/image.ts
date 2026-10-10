import { createFileRoute } from "@tanstack/react-router";
import { handleGenerate, healthResponse } from "@/lib/pedido-image.server";

export const Route = createFileRoute("/api/pedido-on/image")({
  server: {
    handlers: {
      GET: async () => healthResponse(process.env["LOVABLE_API_KEY"]),
      POST: async ({ request }) =>
        handleGenerate(request, { fetch, apiKey: process.env["LOVABLE_API_KEY"] }),
    },
  },
});

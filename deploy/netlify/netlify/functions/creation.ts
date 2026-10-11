import {forwardToBackend} from "../../../../lib/netlify-proxy.ts";

export default async function creation(request: Request, context: {ip: string}) {
  return forwardToBackend(request, {
    PEDIDO_BACKEND_ORIGIN: process.env.PEDIDO_BACKEND_ORIGIN,
    PEDIDO_PUBLIC_ORIGIN: process.env.PEDIDO_PUBLIC_ORIGIN,
    PEDIDO_PROXY_SECRET: process.env.PEDIDO_PROXY_SECRET,
  }, context.ip, fetch, 55_000);
}
export const config = {
  path: ["/api/restaurants/:id/studio", "/api/restaurants/:id/ai/images"],
};

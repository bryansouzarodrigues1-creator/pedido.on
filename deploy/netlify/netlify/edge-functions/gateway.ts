import {forwardToBackend} from "../../../../lib/netlify-proxy.ts";

declare const Netlify: {env: {get(name: string): string | undefined}};
export default async function gateway(request: Request, context: {ip: string}) {
  return forwardToBackend(request, {
    PEDIDO_BACKEND_ORIGIN: Netlify.env.get("PEDIDO_BACKEND_ORIGIN"),
    PEDIDO_PUBLIC_ORIGIN: Netlify.env.get("PEDIDO_PUBLIC_ORIGIN"),
    PEDIDO_PROXY_SECRET: Netlify.env.get("PEDIDO_PROXY_SECRET"),
  }, context.ip);
}
export const config = {
  path: "/*",
  excludedPath: ["/api/restaurants/*/studio", "/api/restaurants/*/ai/images", "/.netlify/*"],
};

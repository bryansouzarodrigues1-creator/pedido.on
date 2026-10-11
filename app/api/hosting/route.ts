import {env} from "cloudflare:workers";
import {httpsOrigin, proxyHeaders, type HostingProxyConfig} from "@/lib/hosting-proxy-policy";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const expected = httpsOrigin((env as typeof env & HostingProxyConfig).PEDIDO_PUBLIC_ORIGIN);
  return Response.json({service: "pedido.on", origin, dataReady: !!env.DB && !!env.BUCKET,
    viaNetlify: !!expected && origin === expected && request.headers.get(proxyHeaders.verified) === expected,
  }, {headers: {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}});
}

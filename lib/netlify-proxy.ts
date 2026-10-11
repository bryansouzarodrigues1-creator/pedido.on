import {
  cleanProxyHeaders, HostingProxyError, httpsOrigin, proxyBody,
  signProxyRequest, validProxySecret, type HostingProxyConfig,
} from "./hosting-proxy-policy.ts";

export type NetlifyProxyConfig = HostingProxyConfig & {PEDIDO_BACKEND_ORIGIN?: string};
export function isCreationPath(path: string) {
  return /^\/api\/restaurants\/[^/]+\/(?:studio|ai\/images)$/.test(path);
}
function unavailable(status: number, message: string, pending = false) {
  return Response.json({error: message, ...(pending ? {attempt: "pending"} : {})}, {
    status, headers: {"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"},
  });
}
export async function forwardToBackend(request: Request, config: NetlifyProxyConfig, clientIp: string,
  fetcher: typeof fetch = fetch, timeout = 25_000) {
  const incoming = new URL(request.url), publicOrigin = httpsOrigin(config.PEDIDO_PUBLIC_ORIGIN);
  const backend = httpsOrigin(config.PEDIDO_BACKEND_ORIGIN);
  const pending = request.method === "POST" && isCreationPath(incoming.pathname);
  if (!publicOrigin || !backend || publicOrigin === backend || !validProxySecret(config.PEDIDO_PROXY_SECRET)) {
    return unavailable(503, "Este endereço ainda está sendo preparado.");
  }
  if (incoming.protocol === "http:" && incoming.host === new URL(publicOrigin).host) {
    const secure = new URL(incoming); secure.protocol = "https:";
    return Response.redirect(secure, 308);
  }
  if (incoming.origin !== publicOrigin) return unavailable(503, "Use o endereço principal do pedido.on.");
  if (/^\/(?:signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(incoming.pathname)) {
    return Response.redirect(publicOrigin + "/entrar", 303);
  }
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) {
    return unavailable(405, "Solicitação não permitida.");
  }
  try {
    const body = await proxyBody(request), target = new URL(backend);
    // Assign the path: a path beginning with // must never select another host.
    target.pathname = incoming.pathname;
    target.search = incoming.search;
    const headers = cleanProxyHeaders(request.headers);
    const unsigned = new Request(target, {method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : body.buffer as ArrayBuffer});
    for (const [name, value] of Object.entries(await signProxyRequest(unsigned, body, config, clientIp))) headers.set(name, value);
    const upstream = await fetcher(target, {
      method: request.method, headers, redirect: "manual", signal: AbortSignal.timeout(timeout),
      body: ["GET", "HEAD"].includes(request.method) ? undefined : body.buffer as ArrayBuffer,
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    const location = responseHeaders.get("location");
    if (location) {
      const redirect = new URL(location, target);
      if (redirect.origin === backend) {
        responseHeaders.set("location", publicOrigin + redirect.pathname + redirect.search + redirect.hash);
      }
    }
    // Keep all Set-Cookie values, response bytes, status and private cache policy.
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status, statusText: upstream.statusText, headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof HostingProxyError) return unavailable(error.status, error.message);
    return unavailable(504, pending ? "Sua criação pode estar em andamento. Use Ver resultado para conferir." :
      "Não foi possível concluir. Confira o resultado antes de tentar novamente.", pending);
  }
}

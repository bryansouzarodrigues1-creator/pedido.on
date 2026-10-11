import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import {HostingProxyError, normalizeHostingRequest, type HostingProxyConfig} from "../lib/hosting-proxy-policy";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let normalized;
    try { normalized = await normalizeHostingRequest(request, env as typeof env & HostingProxyConfig); }
    catch (error) {
      return Response.json({error: error instanceof HostingProxyError ? error.message : "Não foi possível validar a solicitação."}, {
        status: error instanceof HostingProxyError ? error.status : 500,
        headers: {"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"},
      });
    }
    request = normalized.request;
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    // Preserve a single already-authorized creation when the public gateway times out.
    // Checking its requestId later retrieves that job; it never starts a paid retry.
    if (normalized.proxied && request.method === "POST" && /^\/api\/restaurants\/[^/]+\/(?:studio|ai\/images)$/.test(new URL(request.url).pathname)) {
      ctx.waitUntil(Promise.resolve(response).then(() => undefined).catch(() => undefined));
    }
    return response;
  },
};

import handler from "vinext/server/fetch-handler";
import {normalizeHostingRequest,HostingProxyError, type HostingProxyConfig} from "../lib/hosting-proxy-policy";
import {stripSitesIdentity} from "../lib/self-host-policy";

/**
 * Standalone application origin, outside ChatGPT Sites.
 * Uses the same Vinext pages, D1 tables, R2 media, Supabase login and business routes.
 * The new account's D1/R2 data MUST be restored separately before enabling users.
 */
export default {
  async fetch(incoming: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    let normalized;
    try {
      normalized=await normalizeHostingRequest(stripSitesIdentity(incoming),env as typeof env&HostingProxyConfig);
    } catch (error) {
      return Response.json({error:error instanceof HostingProxyError?error.message:"Não foi possível validar a solicitação."},{
        status:error instanceof HostingProxyError?error.status:500,
        headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"},
      });
    }
    const {request}=normalized;
    const response=await handler.fetch(request,env,ctx);
    const pathname=new URL(request.url).pathname;
    if (/^\/(?:sw\.js|pwa-release\.js|manifest\.webmanifest)$/.test(pathname)) {
      const result=new Response(response.body,response);
      result.headers.set("Cache-Control","no-cache, max-age=0, must-revalidate");
      if(pathname==="/sw.js")result.headers.set("Service-Worker-Allowed","/");
      return result;
    }
    return response;
  },
};

import {httpsOrigin,type HostingProxyConfig} from "./hosting-proxy-policy.ts";

// Cookies and browser-saved previews/prices belong to one origin. Enter the
// public gateway before composing or authenticating, so handoffs keep the draft.
export function canonicalAccountLocation(request:Request,config:HostingProxyConfig,proxied:boolean){
 const origin=httpsOrigin(config.PEDIDO_PUBLIC_ORIGIN),url=new URL(request.url);
 if(proxied||!origin||url.origin===origin||!['GET','HEAD'].includes(request.method)||!(url.pathname==="/"||/^\/(?:app|admin|configuracao|conta|assinatura|entrar|cadastro|sair|esqueci-senha|redefinir-senha|criar|calculadora)(?:\/|$)/.test(url.pathname)))return null;
 return origin+url.pathname+url.search;
}

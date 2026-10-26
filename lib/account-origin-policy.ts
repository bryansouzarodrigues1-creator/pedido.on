import {httpsOrigin,type HostingProxyConfig} from "./hosting-proxy-policy.ts";

// Account cookies belong to one origin. Direct backend links must enter through
// the public gateway before authentication, not switch hosts after sign-in.
export function canonicalAccountLocation(request:Request,config:HostingProxyConfig,proxied:boolean){
 const origin=httpsOrigin(config.PEDIDO_PUBLIC_ORIGIN),url=new URL(request.url);
 if(proxied||!origin||url.origin===origin||!['GET','HEAD'].includes(request.method)||!/^\/(?:app|admin|configuracao|conta|assinatura|entrar|cadastro|sair|esqueci-senha|redefinir-senha)(?:\/|$)/.test(url.pathname))return null;
 return origin+url.pathname+url.search;
}

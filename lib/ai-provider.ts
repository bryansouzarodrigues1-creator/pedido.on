// Workers supports manual redirects. Never forward the one-use capability to a redirect.
export function requestAiProvider(endpoint:string,body?:{jobId:string;token:string},timeout=10000){
 return fetch(endpoint,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,redirect:"manual",signal:AbortSignal.timeout(timeout)});
}

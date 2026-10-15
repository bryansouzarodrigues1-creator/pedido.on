/** Financial mutations use the same session-bound CSRF protection as account changes.
 * Never retry a POST here: an interrupted checkout must reconcile its request ID.
 */
export async function billingPost(path:"/api/billing/checkout"|"/api/billing/portal"|"/api/billing/sync"|"/api/billing/cancel",body:unknown):Promise<Response>{
 const config=await fetch("/api/auth/config",{cache:"no-store",credentials:"same-origin"});
 if(!config.ok)throw new Error("Entre novamente para continuar com a assinatura.");
 const value=await config.json() as {csrf?:unknown};
 if(typeof value.csrf!=="string"||!/^[a-f0-9]{64}$/.test(value.csrf))throw new Error("Atualize a página e tente novamente.");
 return fetch(path,{method:"POST",cache:"no-store",credentials:"same-origin",headers:{"Content-Type":"application/json","x-pedido-csrf":value.csrf},body:JSON.stringify(body)});
}

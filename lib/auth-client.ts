/** Commands are sent once. A timeout is ambiguous: never retry a password change automatically. */
export async function sendAuthCommand(action:string,payload:unknown,csrf:string,fetcher:typeof fetch=fetch){
 let response:Response;
 try{response=await fetcher("/api/auth/"+action,{method:"POST",headers:{"Content-Type":"application/json","x-pedido-csrf":csrf},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});}
 catch{throw Error("A conexão foi interrompida. Confira se a ação foi concluída antes de tentar novamente.");}
 let result:{ok?:boolean;error?:string;message?:string;next?:string;chatgpt?:boolean;url?:string};
 try{result=await response.json();if(!result||typeof result!=="object"||Array.isArray(result))throw Error();}catch{throw Error("O serviço não respondeu como esperado. Confira sua conexão e tente novamente.");}
 if(!response.ok)throw Error(typeof result.error==="string"?result.error:"Não foi possível continuar.");return result;
}

export class HttpError extends Error{status:number;attempt?:"cancelled"|"failed"|"pending";constructor(status:number,message:string,attempt?:"cancelled"|"failed"|"pending"){super(message);this.status=status;this.attempt=attempt;}}
export const privateHeaders={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
export function sameOrigin(request:Request){if(request.headers.get("origin")!==new URL(request.url).origin||request.headers.get("sec-fetch-site")==="cross-site")throw new HttpError(403,"Origem da solicitação não permitida.");}
export async function readBytes(request:Pick<Request,"headers"|"body">,max=16000){
 if(Number(request.headers.get("content-length")||0)>max)throw new HttpError(413,"Arquivo ou solicitação muito grande.");
 const reader=request.body?.getReader();if(!reader)return new Uint8Array(0);const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,"Arquivo ou solicitação muito grande.");}chunks.push(value);}
 const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return bytes;
}
export async function readBody(request:Request,max=16000){return new TextDecoder().decode(await readBytes(request,max));}
export async function readJson(request:Request,max=16000):Promise<unknown>{
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))throw new HttpError(415,"Envie os dados do formulário.");
 try{return JSON.parse(await readBody(request,max));}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,"Confira os dados enviados.");}
}

import {z} from "zod";
export const brandImage=z.object({name:z.string().min(1).max(100),type:z.enum(["image/jpeg","image/png","image/webp"]),data:z.string().max(3000000).regex(/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+=*$/)}).strict();
export type BrandImage=z.infer<typeof brandImage>;
const record=z.object({key:z.string().min(1).max(100),logo:brandImage.optional(),cover:brandImage.optional()}).strict();
export type BrandAssets=z.infer<typeof record>;
const writes=new Map<string,Promise<void>>();
function queue(key:string,task:()=>Promise<void>){const pending=(writes.get(key)?.catch(()=>{})||Promise.resolve()).then(task);writes.set(key,pending);void pending.finally(()=>{if(writes.get(key)===pending)writes.delete(key);}).catch(()=>{});return pending;}
function open(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open("pedido-brand-assets",1);request.onupgradeneeded=()=>request.result.createObjectStore("assets",{keyPath:"key"});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export function saveBrandAssets(value:BrandAssets){const parsed=record.parse(value);return queue(parsed.key,async()=>{const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("assets","readwrite");tx.objectStore("assets").put(parsed);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error("Não foi possível salvar as imagens da marca."));});}finally{db.close();}});}
export async function loadBrandAssets(key:string):Promise<BrandAssets|null>{await writes.get(key)?.catch(()=>{});const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction("assets","readonly"),req=tx.objectStore("assets").get(key);req.onsuccess=()=>{const value=record.safeParse(req.result);resolve(value.success&&value.data.key===key?value.data:null);};req.onerror=()=>reject(req.error);});}finally{db.close();}}
export function removeBrandAssets(key:string){return queue(key,async()=>{const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("assets","readwrite");tx.objectStore("assets").delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}});}
export async function imageFromFile(file:File):Promise<BrandImage>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size<=0||file.size>2000000)throw Error("Use JPG, PNG ou WebP de até 2 MB.");
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const jpeg=file.type==="image/jpeg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=file.type==="image/png"&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 const webp=file.type==="image/webp"&&new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
 if(!jpeg&&!png&&!webp)throw Error("O arquivo não parece ser uma imagem válida.");
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error("Não foi possível abrir a imagem."));reader.onload=()=>resolve(String(reader.result||""));reader.readAsDataURL(file);});
 return brandImage.parse({name:file.name.slice(0,100),type:file.type,data});
}

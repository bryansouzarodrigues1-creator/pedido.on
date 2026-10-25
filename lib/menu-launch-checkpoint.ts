import {launchKey,launchSchema,readMenuLaunch,saveMenuLaunch,type MenuLaunch} from "./menu-launch.ts";

export const adminLaunchKey="pizzaria-admin-menu-idea-v1";
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
type Entry={key:string;launch?:MenuLaunch;clearedId?:string;at:number};
let pending=Promise.resolve();
function queue<T>(task:()=>Promise<T>):Promise<T>{const result=pending.then(task);pending=result.then(()=>{},()=>{});return result;}
function local(store?:StorageLike|null){if(store!==undefined)return store;try{return globalThis.localStorage||null;}catch{return null;}}
function scopedStorage(storage:StorageLike|null,key:string):StorageLike|null{return storage?{getItem:()=>storage.getItem(key),setItem:(_,value)=>storage.setItem(key,value),removeItem:()=>storage.removeItem(key)}:null;}
function open(){return new Promise<IDBDatabase>((resolve,reject)=>{
 if(typeof indexedDB==="undefined"){reject(Error("Armazenamento indisponível."));return;}
 let settled=false;const request=indexedDB.open("pedido-menu-launches",1);
 const timer=setTimeout(()=>{settled=true;reject(Error("O armazenamento não respondeu."));},2000);
 const fail=()=>{clearTimeout(timer);settled=true;reject(request.error||Error("O armazenamento está bloqueado."));};
 request.onupgradeneeded=()=>request.result.createObjectStore("checkpoints",{keyPath:"key"});
 request.onerror=fail;request.onblocked=()=>{clearTimeout(timer);settled=true;reject(Error("O armazenamento está bloqueado."));};
 request.onsuccess=()=>{clearTimeout(timer);if(settled){request.result.close();return;}request.result.onversionchange=()=>request.result.close();resolve(request.result);};
});}
async function readEntry(key=launchKey):Promise<Entry|null>{const db=await open();try{return await new Promise((resolve,reject)=>{const request=db.transaction("checkpoints","readonly").objectStore("checkpoints").get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}finally{db.close();}}
async function writeEntry(entry:Entry){const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("checkpoints","readwrite");tx.objectStore("checkpoints").put(entry);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error("Não foi possível guardar sua ideia."));});}finally{db.close();}}
function valid(value:unknown){return readMenuLaunch({getItem:()=>JSON.stringify(value)??"null",setItem(){},removeItem(){}});}

/** Two independent browser stores: a blocked localStorage must not lose the guest project. */
export function saveLaunchCheckpoint(value:MenuLaunch,store?:StorageLike|null,key=launchKey){const parsed=launchSchema.parse(value);return queue(async()=>{
 let saved=false;const storage=scopedStorage(local(store),key);try{if(storage){saveMenuLaunch(storage,parsed);saved=true;}}catch{}
 try{await writeEntry({key,launch:parsed,at:parsed.savedAt});saved=true;}catch{}
 if(!saved)throw Error("Este navegador não permite guardar o projeto. Mantenha esta página aberta e libere o armazenamento antes de continuar.");
});}
export async function loadLaunchCheckpoint(store?:StorageLike|null,key=launchKey):Promise<MenuLaunch|null>{await pending;let saved:MenuLaunch|null=null;const storage=scopedStorage(local(store),key);try{if(storage)saved=readMenuLaunch(storage);}catch{}
 const entry=await readEntry(key).catch(()=>null);
 if(entry?.clearedId===saved?.id&&entry&&saved&&entry.at>=saved.savedAt)return null;
 const backup=valid(entry?.launch);
 return backup&&(!saved||backup.savedAt>=saved.savedAt)?backup:saved;
}
/** Tombstones prevent a failed local cleanup from resurrecting an already-adopted project. */
export function clearLaunchCheckpoint(id:string,store?:StorageLike|null,key=launchKey){return queue(async()=>{
 let cleared=false;const storage=scopedStorage(local(store),key);try{if(storage){if(readMenuLaunch(storage)?.id===id)storage.removeItem(launchKey);cleared=true;}}catch{}
 try{const entry=await readEntry(key);if(!entry?.launch||entry.launch.id===id)await writeEntry({key,clearedId:id,at:Date.now()});cleared=true;}catch{}
 if(!cleared)throw Error("O projeto foi transferido, mas o navegador não confirmou a limpeza da sessão inicial.");
});}

import {pushPreferences} from "./push-policy";
import {z} from "zod";
export const pushResponse=z.object({enabled:z.boolean().default(false),publicKey:z.string().default(""),device:z.object({preferences:pushPreferences,lastStatus:z.number().nullable(),lastSentAt:z.string().nullable(),expiresAt:z.number()}).nullable().default(null),message:z.string().default(""),testCode:z.string().default(""),accepted:z.boolean().optional(),error:z.string().optional()});
export type DevicePreferences={orders:boolean;messages:boolean;delivery:boolean};
export const defaultPushPreferences:DevicePreferences={orders:true,messages:true,delivery:true};
export async function endpointHash(endpoint:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(endpoint)))].map(v=>v.toString(16).padStart(2,"0")).join("");}
async function csrf(){const r=await fetch("/api/auth/config",{cache:"no-store"});if(!r.ok)throw Error("Entre novamente para continuar.");return z.object({csrf:z.string()}).parse(await r.json()).csrf;}
export async function pushApi(method:string,body?:unknown,query=""){const token=method!=="GET"?await csrf():"",r=await fetch("/api/notifications"+query,{method,cache:"no-store",headers:body?{"Content-Type":"application/json","x-pedido-csrf":token}:{},body:body?JSON.stringify(body):undefined}),v=pushResponse.parse(await r.json());if(!r.ok)throw Error(v.error||"Não foi possível configurar as notificações.");return v;}
export function pushSupported(){return window.isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;}
export async function currentPush(){if(!pushSupported())return null;const reg=await navigator.serviceWorker.getRegistration("/");return reg?await reg.pushManager.getSubscription():null;}
function publicKeyBytes(value:string){return Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));}
export async function activatePush(preferences:DevicePreferences){if(!pushSupported())throw Error("No iPhone, instale na tela inicial. No Android, abra em um navegador compatível.");
 const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();if(permission!=="granted")throw Error("Permita notificações nas configurações do navegador.");
 const config=await pushApi("GET");if(!config.enabled)throw Error("As notificações estão sendo configuradas.");
 await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});let timeout:ReturnType<typeof setTimeout>|undefined;
 const ready=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error("Atualize o aplicativo e tente novamente.")),15000);})]).finally(()=>clearTimeout(timeout));
 let sub=await ready.pushManager.getSubscription();if(sub?.options.applicationServerKey){const current=new Uint8Array(sub.options.applicationServerKey),expected=publicKeyBytes(config.publicKey);if(current.length!==expected.length||current.some((byte,i)=>byte!==expected[i])){await sub.unsubscribe();sub=null;}}
 sub||=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(config.publicKey)});await pushApi("POST",{subscription:sub.toJSON(),publicKey:config.publicKey,preferences:pushPreferences.parse(preferences)});window.dispatchEvent(new CustomEvent("pedido-push-change",{detail:{active:true}}));return sub;
}
export async function deactivatePush(){const sub=await currentPush();if(!sub)return;await pushApi("DELETE",{endpointHash:await endpointHash(sub.endpoint)});await sub.unsubscribe();await clearLocalNotifications();window.dispatchEvent(new CustomEvent("pedido-push-change",{detail:{active:false}}));}
export async function clearLocalNotifications(){if(!("serviceWorker" in navigator))return;const reg=await navigator.serviceWorker.getRegistration("/");if(!reg)return;const sub=await reg.pushManager.getSubscription();await sub?.unsubscribe().catch(()=>false);for(const n of await reg.getNotifications())n.close();}

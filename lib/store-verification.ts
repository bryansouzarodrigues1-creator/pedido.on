import {env} from "cloudflare:workers";
import {sha256} from "./auth-policy";
import {HttpError} from "./http";
import {verificationIdentity,type StoreVerificationStatus} from "./store-verification-policy";
import type {RestaurantData} from "./domain";

export type VerificationStore={id:string;publishedData:string|null;published:boolean;data:string;liveRevision:number};
export type VerificationRow={status:string;identityHash:string;identityJson:string;requestNote:string;requestedAt:string;reviewedAt:string|null;reason:string;version:number};
export async function storeIdentityHash(data:RestaurantData){return sha256(JSON.stringify(verificationIdentity(data)));}
export async function storeVerification(store:VerificationStore){
 const record=await env.DB!.prepare("SELECT status,identity_hash AS identityHash,identity_json AS identityJson,request_note AS requestNote,requested_at AS requestedAt,reviewed_at AS reviewedAt,reason,version FROM store_verifications WHERE restaurant_id=?").bind(store.id).first<VerificationRow>();
 const identityHash=await storeIdentityHash(JSON.parse(store.publishedData||store.data) as RestaurantData);
 const changed=!!record&&record.identityHash!==identityHash;
 const status:StoreVerificationStatus=!record?"unverified":changed&&["approved","pending"].includes(record.status)?"changed":["pending","approved","rejected","revoked"].includes(record.status)?record.status as StoreVerificationStatus:"unverified";
 const siteOrderingAllowed=store.published&&!!store.publishedData&&status==="approved";
 return {status,siteOrderingAllowed,version:record?.version||0,identityHash,liveRevision:store.liveRevision,reason:record?.reason||"",requestNote:record?.requestNote||"",requestedAt:record?.requestedAt||null,reviewedAt:record?.reviewedAt||null};
}
export async function assertStoreVerified(store:VerificationStore){const state=await storeVerification(store);if(!state.siteOrderingAllowed)throw new HttpError(403,"Esta loja ainda não está liberada para pedidos e pagamentos pelo site. Envie seu carrinho pelo WhatsApp.");return {restaurantId:store.id,version:state.version,identityHash:state.identityHash,publishedData:store.publishedData!};}
export async function verifiedRestaurant(id:string){const row=await env.DB!.prepare("SELECT id,published_data AS publishedData,published,data,live_revision AS liveRevision FROM restaurants WHERE id=?").bind(id).first<VerificationStore>();if(!row)throw new HttpError(404,"Pizzaria não encontrada.");return assertStoreVerified(row);}
// Re-check the same approval and publication inside the write transaction. A stale
// request cannot slip an order/proof through a concurrent revocation or republish.
export const verificationWriteGuard="EXISTS (SELECT 1 FROM store_verifications sv JOIN restaurants sr ON sr.id=sv.restaurant_id WHERE sr.id=? AND sr.published=1 AND sr.published_data=? AND sv.status='approved' AND sv.version=? AND sv.identity_hash=?)";
export function verificationGuardArgs(lock:Awaited<ReturnType<typeof assertStoreVerified>>){return [lock.restaurantId,lock.publishedData,lock.version,lock.identityHash] as const;}

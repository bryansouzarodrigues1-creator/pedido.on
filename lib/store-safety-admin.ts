import {env} from "cloudflare:workers";
import {owner,HttpError} from "./server";
import {platformAdmin} from "./platform";
import {storeIdentityHash} from "./store-verification";
import {verificationIdentity} from "./store-verification-policy";
import type {RestaurantData} from "./domain";
export async function safetyAdministrator(){const user=await owner();if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");return user;}
export async function storeSafetyQueue(){
 const review=await env.DB!.prepare(`SELECT v.restaurant_id AS restaurantId,v.status,v.identity_hash AS identityHash,v.identity_json AS identityJson,v.request_note AS requestNote,v.requested_at AS requestedAt,v.reviewed_at AS reviewedAt,v.reason,v.version,r.slug,r.published,r.published_data AS publishedData,r.data FROM store_verifications v JOIN restaurants r ON r.id=v.restaurant_id ORDER BY CASE v.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,v.updated_at DESC LIMIT 100`).all<{restaurantId:string;status:string;identityHash:string;identityJson:string;requestNote:string;requestedAt:string;reviewedAt:string|null;reason:string;version:number;slug:string;published:number;publishedData:string|null;data:string}>();
 const stores=await Promise.all(review.results.map(async row=>{const data=JSON.parse(row.publishedData||row.data) as RestaurantData,currentHash=await storeIdentityHash(data);const {publishedData,data:raw,identityJson,...safe}=row;return {...safe,status:currentHash!==row.identityHash&&["pending","approved"].includes(row.status)?"changed":row.status,identityHash:currentHash,identity:verificationIdentity(data),requestedIdentity:JSON.parse(identityJson)};}));
 const reports=await env.DB!.prepare(`SELECT s.id,s.restaurant_id AS restaurantId,r.name,r.slug,s.category,s.detail,s.contact,s.order_reference AS orderReference,s.status,s.created_at AS createdAt,s.resolution,s.version FROM store_reports s JOIN restaurants r ON r.id=s.restaurant_id ORDER BY CASE s.status WHEN 'open' THEN 0 ELSE 1 END,s.created_at DESC LIMIT 100`).all<{id:string;restaurantId:string;name:string;slug:string;category:string;detail:string;contact:string;orderReference:string;status:string;createdAt:string;resolution:string;version:number}>();
 return {stores,reports:reports.results};
}
export type StoreSafetyQueue=Awaited<ReturnType<typeof storeSafetyQueue>>;

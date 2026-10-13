import {env} from "cloudflare:workers";
import {effectiveAccess,type AccountAccessRecord} from "./account-access-policy";
export async function accountAccess(ownerId:string){
 const row=await env.DB!.prepare("SELECT mode,plan,expires_at AS expiresAt FROM account_access WHERE owner_id=?").bind(ownerId).first<AccountAccessRecord>();
 return effectiveAccess(row);
}

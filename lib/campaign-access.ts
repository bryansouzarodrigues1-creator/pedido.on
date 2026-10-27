import {env} from "cloudflare:workers";
import {effectiveAccess} from "./account-access-policy";
import {trialFromStart} from "./trial-policy";
export async function campaignAccess(ownerId:string,now=Math.floor(Date.now()/1000)){
 const db=env.DB!,grant=await db.prepare("SELECT mode,tier,plan,expires_at AS expiresAt,updated_at FROM account_access WHERE owner_id=?").bind(ownerId).first<{mode:string;tier:string;plan:string|null;expiresAt:number|null;updated_at:string}>(),access=effectiveAccess(grant,now);
 const trial=await db.prepare("SELECT started_at,ends_at FROM account_trials WHERE owner_id=?").bind(ownerId).first<{started_at:number|null;ends_at:number|null}>();
 let startedAt=trial?.started_at||0,endsAt=trial?trialFromStart(trial.started_at,now,trial.ends_at).endsAt:0;
 if(access.mode==="grant"&&grant?.tier==="free"){startedAt=Math.floor(Date.parse(grant.updated_at)/1000);endsAt=grant.expiresAt||0;}
 const active=access.mode!=="suspended"&&Number.isSafeInteger(startedAt)&&startedAt>0&&startedAt<=now&&endsAt>now;
 return {active,startedAt,endsAt,daysRemaining:active?Math.ceil((endsAt-now)/86400):0,rounds:[{round:1,available:active,availableAt:startedAt},{round:2,available:active&&now>=startedAt+5*86400,availableAt:startedAt+5*86400}]};
}

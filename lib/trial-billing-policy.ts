import {monthAfterDueDate} from "./asaas-policy.ts";

export function brazilDate(value:Date){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);}
/** Asaas dates have day precision: round forward so no remaining trial time is lost. */
export function firstSubscriptionDueDate(trialEndsAt:number,now=new Date()){
 const today=brazilDate(now),seconds=now.getTime()/1000;
 if(!Number.isSafeInteger(trialEndsAt)||trialEndsAt<=seconds)return today;
 const day=brazilDate(new Date(trialEndsAt*1000)),midnight=Date.parse(day+"T00:00:00-03:00")/1000;
 if(!monthAfterDueDate(day))return today;
 return trialEndsAt===midnight?day:brazilDate(new Date((midnight+86400)*1000));
}
export function subscriptionOffer(trialEndsAt:number,now=new Date(),recordedDueDate?:string){
 const firstDueDate=recordedDueDate===undefined?firstSubscriptionDueDate(trialEndsAt,now):recordedDueDate;
 const end=monthAfterDueDate(firstDueDate);
 return {trialEndsAt,firstDueDate,paidThrough:end?end+3*3600:0,preservesTrial:trialEndsAt>now.getTime()/1000&&!!end&&Date.parse(firstDueDate+"T00:00:00-03:00")>=trialEndsAt*1000};
}

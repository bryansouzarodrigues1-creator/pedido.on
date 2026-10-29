/** Commercial v3. Counters belong to an account, never to a shop or a browser. */
export const aiOfferVersion=3;
export const trialOffer={images:1,texts:1};
export function brasiliaDay(now=new Date()){
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const start=new Date(day+"T00:00:00-03:00");
 return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString(),period:"day:"+day};
}
export type CreationUsage={used:number;limit:number|null;scope?:string;endsAt?:string;enabled?:boolean};
export function creationLimitReached(usage:CreationUsage){return usage.limit!==null&&usage.used>=usage.limit;}
export function creationUsageLabel(usage:CreationUsage){
 if(usage.limit===null)return `${usage.used} imagens neste mês · sem cota mensal fixa`;
 return `${usage.used} de ${usage.limit} ${usage.scope==="day"?"hoje, em Brasília":usage.scope==="trial"?"no teste":"neste período"}`;
}
export const imageFairUse="Uma geração de imagem por vez e até 3 solicitações por minuto por conta. Sem automações em massa ou compartilhamento de acesso. Uma proteção financeira pode pausar novas gerações; fotos salvas e modelos continuam disponíveis.";

/** Fixed calendar week, Monday 00:00 in Brasília. Reopening or renewing never resets it. */
export function proWeek(now=new Date()){
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const midnight=new Date(day+"T00:00:00-03:00"),weekday=(midnight.getUTCDay()+6)%7,start=new Date(midnight.getTime()-weekday*86400000),end=new Date(start.getTime()+7*86400000);
 return {start:start.toISOString(),end:end.toISOString(),period:"week:"+start.toISOString()};
}
export const proImagesPerWeek=20;

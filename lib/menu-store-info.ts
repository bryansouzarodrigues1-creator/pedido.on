/** Public structured business data only. Never use footer addresses or URL slugs as facts. */
export type MenuStoreInfo={name?:string;address?:string;hours?:string;telephone?:string};
const text=(v:unknown,max:number)=>{if(typeof v!=="string")return "";const s=v.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();return s.length<=max?s:"";};
const week=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],days=["segunda","terça","quarta","quinta","sexta","sábado","domingo"];
function dayLabel(values:unknown){
 const raw=Array.isArray(values)?values:[values],indexes=[...new Set(raw.map(v=>typeof v==="string"?week.indexOf(v.replace(/^https?:\/\/schema.org\//,"")):-1))].sort((a,b)=>a-b);
 if(!indexes.length||indexes.some(i=>i<0))return "";
 return indexes.length===7?"Todos os dias":indexes.length>2&&indexes.every((v,i)=>!i||v===indexes[i-1]+1)?days[indexes[0]]+" a "+days[indexes.at(-1)!]:indexes.map(i=>days[i]).join(", ");
}
function hoursOf(v:Record<string,unknown>){
 const result:string[]=[];
 const specs=Array.isArray(v.openingHoursSpecification)?v.openingHoursSpecification:v.openingHoursSpecification?[v.openingHoursSpecification]:[];
 for(const spec of specs.slice(0,14)){
  if(!spec||typeof spec!=="object"||Array.isArray(spec))continue;
  const s=spec as Record<string,unknown>;if(s.validFrom||s.validThrough)continue;
  const days=dayLabel(s.dayOfWeek),opens=text(s.opens,8),closes=text(s.closes,8);
  if(days&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(opens)&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(closes)&&opens!==closes)result.push(`${days}, ${opens.slice(0,5)} às ${closes.slice(0,5)}`);
 }
 if(!result.length){
  const values=Array.isArray(v.openingHours)?v.openingHours:[v.openingHours],short=["Mo","Tu","We","Th","Fr","Sa","Su"];
  for(const value of values.slice(0,14)){
   if(typeof value!=="string")continue;
   const m=value.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)$/);
   if(!m||m[3]===m[4])continue;
   const start=short.indexOf(m[1]),end=short.indexOf(m[2]||m[1]);if(end<start)continue;
   result.push(`${dayLabel(week.slice(start,end+1))}, ${m[3]} às ${m[4]}`);
  }
 }
 const joined=[...new Set(result)].join("; ");return joined.length<=300?joined:"";
}
function addressOf(value:unknown){
 if(typeof value==="string")return text(value,200);
 if(!value||typeof value!=="object"||Array.isArray(value))return "";
 const a=value as Record<string,unknown>,country=typeof a.addressCountry==="object"&&a.addressCountry?(a.addressCountry as Record<string,unknown>).name:a.addressCountry;
 if(country&&!/^(?:BR|BRA|Brasil|Brazil)$/i.test(String(country)))return "";
 const street=text(a.streetAddress,140);if(!street)return "";
 const city=text(a.addressLocality,70),region=text(a.addressRegion,30),zip=text(a.postalCode,12);
 const label=[street,[city,region].filter(Boolean).join(" - "),zip].filter(Boolean).join(", ");return label.length<=200?label:"";
}
export function structuredMenuStore(html:string,pageUrl:string):MenuStoreInfo|undefined{
 const candidates:MenuStoreInfo[]=[];let visited=0,scripts=0;
 function visit(value:unknown,depth=0){
  if(depth>10||++visited>1500||!value||typeof value!=="object")return;
  if(Array.isArray(value)){for(const item of value)visit(item,depth+1);return;}
  const v=value as Record<string,unknown>,types=(Array.isArray(v["@type"])?v["@type"]:[v["@type"]]).map(t=>String(t).replace(/^https?:\/\/schema.org\//,""));
  if(types.some(t=>["Restaurant","FoodEstablishment","LocalBusiness","FastFoodRestaurant","PizzaRestaurant"].includes(t))){
   // A different store explicitly linked inside a graph cannot supply this store's facts.
   if(typeof v.url==="string"){try{const candidate=new URL(v.url),expected=new URL(pageUrl);if(candidate.hostname.replace(/^www\./,"")!==expected.hostname.replace(/^www\./,"")||candidate.pathname.replace(/\/$/,"")!==expected.pathname.replace(/\/$/,""))return;}catch{return;}}
   const name=text(v.name,100),address=addressOf(v.address),hours=hoursOf(v),phone=text(v.telephone,25),digits=phone.replace(/\D/g,"");
   const telephone=/^(?:\d{10,11}|55\d{10,11})$/.test(digits)?phone:"";
   if(name)candidates.push({name,...(address?{address}:{}),...(hours?{hours}:{}),...(telephone?{telephone}:{})});
  }
  for(const key of ["@graph","mainEntity","about"])if(v[key])visit(v[key],depth+1);
 }
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(++scripts>150)break;if(match[2].length>1100000||! /\btype\s*=\s*["']application\/ld\+json["']/i.test(match[1]))continue;
  try{visit(JSON.parse(match[2]));}catch{}
 }
 const unique=[...new Map(candidates.map(c=>[JSON.stringify(c),c])).values()];
 return unique.length===1?unique[0]:undefined;
}

/** Chaves privadas de acompanhamento são guardadas apenas neste navegador. Não rastreia aparelho por fingerprint. */
export type OrderStorage = {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
const linkPattern=/^\/pedido\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})#([a-f0-9]{64})$/i;
const slugPattern=/^[a-z0-9][a-z0-9_-]{0,100}$/;
export function parsePrivateOrderLink(link:unknown):{id:string;token:string}|null {
  if(typeof link!=="string")return null;
  const match=linkPattern.exec(link);
  return match?{id:match[1].toLowerCase(),token:match[2].toLowerCase()}:null;
}
export function savePrivateOrderLink(storage:OrderStorage,slug:string,link:string){
  const order=parsePrivateOrderLink(link);
  if(!order||!slugPattern.test(slug))return false;
  const key="pedido-recent-"+slug;
  const old=recentPrivateOrderLinks(storage,slug);
  const updated=[link,...old.filter(item=>parsePrivateOrderLink(item)?.id!==order.id)].slice(0,10);
  storage.setItem("pedido-order-"+order.id,order.token);
  storage.setItem("pedido-track-"+slug,link);
  storage.setItem(key,JSON.stringify(updated));
  return true;
}
export function recentPrivateOrderLinks(storage:Pick<OrderStorage,"getItem">,slug:string){
  if(!slugPattern.test(slug))return [];
  try {
    const list:unknown=JSON.parse(storage.getItem("pedido-recent-"+slug)||"[]");
    return Array.isArray(list)?list.filter((link):link is string=>!!parsePrivateOrderLink(link)).slice(0,10):[];
  }catch{return [];}
}
export function savedPrivateOrderToken(storage:Pick<OrderStorage,"getItem">,id:string) {
  if(!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(id))return "";
  const token=storage.getItem("pedido-order-"+id.toLowerCase())||"";
  return /^[a-f0-9]{64}$/.test(token)?token:"";
}

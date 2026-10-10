export async function verifyStripeSignature(payload:string,header:string,secret:string,now=Date.now()):Promise<boolean>{
  const parts=header.split(",").map(p=>p.trim().split("=")),timestamp=parts.find(p=>p[0]==="t")?.[1],signatures=parts.filter(p=>p[0]==="v1").map(p=>p[1]);
  if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]),content=new TextEncoder().encode(`${timestamp}.${payload}`);
  for(const signature of signatures){if(!/^[a-f0-9]{64}$/.test(signature))continue;const bytes=Uint8Array.from(signature.match(/.{2}/g)!,v=>parseInt(v,16));if(await crypto.subtle.verify("HMAC",key,bytes,content))return true;}
  return false;
}

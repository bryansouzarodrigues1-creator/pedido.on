import {demoTicketOptions,demoTicketOrder} from "@/lib/order-demo";
import {buildOrderTicket,renderOrderTicket} from "@/lib/order-ticket";
import {privateHeaders} from "@/lib/http-policy";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const headers={...privateHeaders,"X-Robots-Tag":"noindex, nofollow, noarchive","X-Frame-Options":"DENY"};
 try{
  const url=new URL(request.url),parsed=demoTicketOptions.safeParse(Object.fromEntries(url.searchParams));
  if(!parsed.success)return Response.json({error:"Escolha uma etapa válida da demonstração."},{status:400,headers});
  const options=parsed.data,order=demoTicketOrder(options);let ticket;
  try{ticket=buildOrderTicket("Casa da Pizza · exemplo",order,options.copy);}catch{return Response.json({error:"Este exemplo ainda não libera a via de entrega. Use a comanda da cozinha."},{status:409,headers});}
  if(options.format==="json")return Response.json({version:1,demo:true},{headers});
  return new Response(renderOrderTicket(ticket,options.paper,request.url,{demo:true}),{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
 }catch{return Response.json({error:"Não foi possível abrir este exemplo."},{status:400,headers});}
}

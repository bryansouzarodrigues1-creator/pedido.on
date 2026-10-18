declare const __PIZZARIA_SOURCE_SHA__:string;
export const dynamic="force-dynamic";
export function GET(){
 return Response.json({app:"pizzaria.on",status:"ok",release:typeof __PIZZARIA_SOURCE_SHA__==="string"?__PIZZARIA_SOURCE_SHA__:"local"},{headers:{"Cache-Control":"no-store"}});
}

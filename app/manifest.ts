import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
 return {
  id:"/app",name:"pedido.on · Painel da pizzaria",short_name:"pedido.on",
  description:"Receba pedidos e administre sua pizzaria pelo celular.",
  start_url:"/app",scope:"/",display:"standalone",display_override:["standalone"],
  background_color:"#faf8f2",theme_color:"#c73726",lang:"pt-BR",
  icons:[
   {src:"/pwa/icon-192.png",type:"image/png",sizes:"192x192",purpose:"any"},
   {src:"/pwa/icon-512.png",type:"image/png",sizes:"512x512",purpose:"any"},
   {src:"/pwa/icon-maskable-512.png",type:"image/png",sizes:"512x512",purpose:"maskable"},
   {src:"/favicon.svg",type:"image/svg+xml",sizes:"any",purpose:"any"}
  ]
 };
}

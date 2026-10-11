import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
 return {
  id:"/app",name:"pedido.on · Painel da pizzaria",short_name:"pedido.on",
  description:"Receba pedidos e administre sua pizzaria pelo celular.",
  start_url:"/app",scope:"/",display:"standalone",display_override:["standalone"],
  background_color:"#faf8f2",theme_color:"#c73726",lang:"pt-BR",
  icons:[
   {src:"/assets/pedido-symbol.png",type:"image/png",sizes:"1254x1254",purpose:"any"},
   {src:"/favicon.svg",type:"image/svg+xml",sizes:"any",purpose:"any"}
  ]
 };
}

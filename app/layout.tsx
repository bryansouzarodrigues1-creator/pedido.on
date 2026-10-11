import type {Metadata} from "next";
import "./globals.css";
import "./sales-ui.css";
import "./pedido-ui.css";
import "./saas-ui.css";
import "./pizzeria-ui.css";
import "./pwa.css";
import "./delivery-gate.css";
import "./delivery-approvals.css";
import "./order-chat.css";
export const metadata:Metadata={title:"pedido.on — Sua pizzaria, pronta para vender.",description:"Crie o cardápio digital da sua pizzaria. Cadastre seus sabores, receba pedidos com Pix e cuide da pizzaria pelo celular. Calculadora grátis de preço e lucro, sem cadastro.",manifest:"/manifest.webmanifest",applicationName:"pedido.on",appleWebApp:{capable:true,title:"pedido.on",statusBarStyle:"default"},icons:{icon:"/assets/pedido-symbol.png",apple:"/assets/pedido-symbol.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}

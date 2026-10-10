import OrderTracking from "@/components/order-tracking";
export const metadata={title:"Acompanhar meu pedido · pedido.on",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <OrderTracking id={id}/>;}

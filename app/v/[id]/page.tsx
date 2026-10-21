import SharedMenuPreview from "@/components/shared-menu-preview";
export const metadata={title:"Prévia do cardápio — Pizzaria.on",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <SharedMenuPreview id={id}/>;}

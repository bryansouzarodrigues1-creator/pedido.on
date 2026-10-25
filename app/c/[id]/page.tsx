import SharedMenuPreview from "@/components/shared-menu-preview";
export const metadata={title:"Conheça este cardápio · Pizzaria.on",robots:{index:false,follow:false}};
export default async function Shared({params}:{params:Promise<{id:string}>}){const {id}=await params;return <SharedMenuPreview id={id} managed/>;}

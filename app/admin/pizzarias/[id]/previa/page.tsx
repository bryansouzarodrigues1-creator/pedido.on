import {requireAccountUser} from "@/lib/auth";
import {platformAdmin} from "@/lib/platform";
import {notFound} from "next/navigation";
import {supportRestaurant} from "@/lib/restaurant-support";
import {restaurantSchema} from "@/lib/domain";
import Menu from "@/components/menu";
export const dynamic="force-dynamic";
export const metadata={title:"Prévia administrativa · pizzaria.on",robots:{index:false,follow:false}};
export default async function AdminMenuPreview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{mode?:string}>}){const {id}=await params,user=await requireAccountUser("/admin/pizzarias/"+encodeURIComponent(id));if(!platformAdmin(user))notFound();const row=await supportRestaurant(id),{mode}=await searchParams;if(mode==="live"&&!row.publishedData)notFound();return <Menu key={mode} data={restaurantSchema.parse(JSON.parse(mode==="live"?row.publishedData!:row.data))} slug={row.slug} preview previewLabel={mode==="live"?"Publicado · somente conferência":"Rascunho · ainda não publicado"}/>;}

import {createFileRoute} from "@tanstack/react-router";
import {handleStudio,studioHealth} from "@/lib/pedido-studio.server";
export const Route=createFileRoute("/api/pedido-on/studio")({server:{handlers:{GET:async()=>studioHealth(process.env["LOVABLE_API_KEY"]),POST:async({request})=>handleStudio(request,{fetch,apiKey:process.env["LOVABLE_API_KEY"]})}}});

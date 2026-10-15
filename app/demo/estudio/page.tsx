import type {Metadata} from "next";
import StudioDemo from "@/components/studio-demo";
export const metadata:Metadata={title:"Estúdio da pizzaria — teste o visual | pizzaria.on",description:"Experimente estilos, cores e chamadas do cardápio da sua pizzaria com prévia antes de aplicar."};
export default function StudioPage(){return <StudioDemo/>;}

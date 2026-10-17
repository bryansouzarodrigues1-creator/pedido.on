import {notFound} from "next/navigation";
import Menu from "@/components/menu";
import {demoRestaurant,themes,type ThemeId} from "@/lib/domain";
import {galleryStyleId,galleryStyle,galleryDesign} from "@/lib/gallery-styles";
export default async function DemoPage({params}:{params:Promise<{theme:string}>}){
 const {theme}=await params,identity=galleryStyleId.safeParse(theme);
 if(identity.success){const style=galleryStyle(identity.data);return <Menu data={galleryDesign({...demoRestaurant(style.theme),name:"Sua pizzaria"},identity.data,"")} demo/>;}
 if(!themes.some(t=>t.id===theme))notFound();
 return <Menu data={demoRestaurant(theme as ThemeId)} demo/>;
}

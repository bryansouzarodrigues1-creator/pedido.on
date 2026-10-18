import {notFound} from "next/navigation";
import Menu from "@/components/menu";
import {themes,type ThemeId} from "@/lib/domain";
import {detailedDemoRestaurant} from "@/lib/demo-rich";
import {galleryStyleId,galleryStyle,galleryDesign} from "@/lib/gallery-styles";
export default async function DemoPage({params}:{params:Promise<{theme:string}>}){
 const {theme}=await params,identity=galleryStyleId.safeParse(theme);
 if(identity.success){const style=galleryStyle(identity.data);return <Menu data={galleryDesign(detailedDemoRestaurant(style.theme),identity.data,"")} demo/>;}
 if(!themes.some(t=>t.id===theme))notFound();
 return <Menu data={detailedDemoRestaurant(theme as ThemeId)} demo/>;
}

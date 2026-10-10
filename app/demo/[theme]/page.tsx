import {notFound} from "next/navigation";
import Menu from "@/components/menu";
import {demoRestaurant,themes,type ThemeId} from "@/lib/domain";
export default async function DemoPage({params}:{params:Promise<{theme:string}>}){const {theme}=await params;if(!themes.some(t=>t.id===theme))notFound();return <Menu data={demoRestaurant(theme as ThemeId)} demo/>;}

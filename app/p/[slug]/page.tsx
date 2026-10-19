import {notFound} from "next/navigation";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import Menu from "@/components/menu";
import type {RestaurantData} from "@/lib/domain";
import {canServeMenu} from "@/lib/billing";
import {deliveryApprovalEnabled} from "@/lib/delivery-config";
import {storeVerification} from "@/lib/store-verification";
export const dynamic="force-dynamic";
export default async function MenuPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const row=await getDb().select().from(restaurants).where(and(eq(restaurants.slug,slug),eq(restaurants.published,true))).get();if(!row?.publishedData||!await canServeMenu(row.ownerId,row.id))notFound();const data=JSON.parse(row.publishedData) as RestaurantData,{siteOrderingAllowed}=await storeVerification(row);return <Menu data={{...data,pix:{...data.pix,enabled:siteOrderingAllowed&&data.pix.enabled,key:"",recipient:""}}} slug={slug} siteOrderingAllowed={siteOrderingAllowed} approvalRequired={siteOrderingAllowed&&deliveryApprovalEnabled()}/>;}

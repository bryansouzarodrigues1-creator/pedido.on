import {env} from "cloudflare:workers";
import {getAccountUser} from "./auth";
import {restaurants} from "@/db/schema";
import {getDb} from "@/db";
import {and,eq} from "drizzle-orm";
import type {RestaurantData} from "./domain";
import {HttpError} from "./http";
export {HttpError,sameOrigin,errorResponse} from "./http";
export async function owner(){const u=await getAccountUser();if(!u)throw new HttpError(401,"Entre na sua conta para continuar.");return u;}
export async function ownedRestaurant(id:string,ownerId?:string){const userId=ownerId||(await owner()).userId;const row=await getDb().select().from(restaurants).where(and(eq(restaurants.id,id),eq(restaurants.ownerId,userId))).get();if(!row)throw new HttpError(404,"Pizzaria não encontrada.");return row;}
export function safeRecord(row:typeof restaurants.$inferSelect){const {ownerId,publishedData,...record}=row;return record;}
export function assertMedia(data:RestaurantData,id:string){const paths=[data.logo,data.cover,...data.products.map(p=>p.image)];if(paths.some(p=>p.startsWith("/media/")&&!p.startsWith(`/media/${id}/`)))throw new HttpError(400,"A imagem precisa pertencer a esta pizzaria.");}
export function bucket(){if(!env.BUCKET)throw new HttpError(503,"O envio de imagens está temporariamente indisponível.");return env.BUCKET;}

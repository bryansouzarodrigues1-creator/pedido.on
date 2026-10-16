import {z} from "zod";
import {eq,count} from "drizzle-orm";
import {getDb} from "@/db";
import {restaurants} from "@/db/schema";
import {defaultRestaurant,slugSchema,restaurantSchema} from "@/lib/domain";
import {owner,sameOrigin,safeRecord,errorResponse,HttpError} from "@/lib/server";
import {readJson} from "@/lib/http";
import {localStudio,proposalPatch} from "@/lib/studio-policy";
import {startTrial} from "@/lib/trial";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();const rows=await getDb().select().from(restaurants).where(eq(restaurants.ownerId,user.userId));return Response.json({restaurants:rows.map(safeRecord)},{headers:{"Cache-Control":"no-store"}});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
  sameOrigin(request);const user=await owner();
  const input=z.object({name:z.string().trim().min(2).max(100),vision:z.string().trim().max(1600).default(""),whatsapp:restaurantSchema.innerType().shape.whatsapp.default(""),slug:slugSchema,theme:z.enum(["editorial","classic","dark","playful"]),plan:z.enum(["essencial","profissional","rede"]).default("profissional")}).parse(await readJson(request));
  const db=getDb();const total=await db.select({n:count()}).from(restaurants).where(eq(restaurants.ownerId,user.userId)).get();
  if((total?.n||0)>=10)throw new HttpError(400,"O limite de pré-lançamento é de 10 pizzarias por conta.");
  if(await db.select({id:restaurants.id}).from(restaurants).where(eq(restaurants.slug,input.slug)).get())throw new HttpError(409,"Esse endereço já foi escolhido. Tente outro nome.");
  const base=defaultRestaurant(input.name,input.theme),design=input.vision?proposalPatch(localStudio(input.vision,base),base):{};
  const now=new Date().toISOString();const row={id:crypto.randomUUID(),ownerId:user.userId,slug:input.slug,name:input.name,data:JSON.stringify({...base,...design,whatsapp:input.whatsapp}),plan:input.plan,createdAt:now,updatedAt:now};
  try{const created=await db.insert(restaurants).values(row).returning().get();await startTrial(user.userId);return Response.json({restaurant:safeRecord(created)},{status:201});}catch(e){if(e instanceof Error&&/unique/i.test(e.message))throw new HttpError(409,"Esse endereço já foi escolhido. Tente outro nome.");throw e;}
}catch(e){return errorResponse(e);}}

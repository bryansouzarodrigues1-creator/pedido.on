import {ownedRestaurant} from "@/lib/server";
import {sameOrigin,readJson,privateHeaders,errorResponse,HttpError} from "@/lib/http";
import {assertCsrf} from "@/lib/auth";
import {accountAccess} from "@/lib/account-access";
import {campaignInput,readCampaigns,prepareCampaign} from "@/lib/trial-campaigns";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params,row=await ownedRestaurant(id);return Response.json(await readCampaigns(row),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);assertCsrf(request);const {id}=await params,row=await ownedRestaurant(id);if((await accountAccess(row.ownerId)).mode==="suspended")throw new HttpError(403,"A conta está suspensa. Fale com o suporte.");const input=campaignInput.parse(await readJson(request,3000));return Response.json(await prepareCampaign(row,input),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

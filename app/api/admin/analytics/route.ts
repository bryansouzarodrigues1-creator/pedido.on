import {owner} from "@/lib/server";
import {platformAdmin} from "@/lib/platform";
import {adminAnalytics} from "@/lib/admin-analytics";
import {readAdminQuery} from "@/lib/admin-analytics-policy";
import {HttpError,errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 const user=await owner();if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");
 return Response.json(await adminAnalytics(readAdminQuery(new URL(request.url).searchParams)),{headers:privateHeaders});
}catch(error){return errorResponse(error);}}

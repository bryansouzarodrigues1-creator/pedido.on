import {owner} from "@/lib/server";
import {platformAdmin} from "@/lib/platform";
import {adminStatus} from "@/lib/admin-status";
import {HttpError,errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();if(!platformAdmin(user))throw new HttpError(403,"Acesso exclusivo da administração.");return Response.json(await adminStatus(),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

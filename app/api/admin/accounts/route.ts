import {requirePlatformAdmin} from "@/lib/admin-shared-menus";
import {adminAccounts} from "@/lib/admin-accounts";
import {errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{await requirePlatformAdmin();const p=new URL(request.url).searchParams,page=Math.max(1,Math.min(10000,Number(p.get("page"))||1));return Response.json(await adminAccounts(p.get("q")||"",Math.floor(page)),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

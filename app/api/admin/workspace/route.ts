import {requirePlatformAdmin} from "@/lib/admin-shared-menus";
import {adminWorkspaceOverview} from "@/lib/admin-workspace";
import {errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(){try{await requirePlatformAdmin();return Response.json(await adminWorkspaceOverview(),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

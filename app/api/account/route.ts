import {owner} from "@/lib/server";
import {errorResponse,privateHeaders} from "@/lib/http";
import {aiAllowance} from "@/lib/ai";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();return Response.json({name:user.displayName,email:user.email,provider:user.provider,ai:await aiAllowance(user.userId)},{headers:privateHeaders});}catch(e){return errorResponse(e);}}

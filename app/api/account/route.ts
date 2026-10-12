import {owner} from "@/lib/server";
import {errorResponse,privateHeaders} from "@/lib/http";
import {aiAllowance} from "@/lib/ai";
import {imageAllowance} from "@/lib/ai-images";
import {studioAllowance} from "@/lib/studio";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();const [ai,images,studio]=await Promise.all([aiAllowance(user.userId),imageAllowance(user.userId),studioAllowance(user.userId)]);return Response.json({name:user.displayName,email:user.email,provider:user.provider,ai,creations:{images,studio}},{headers:privateHeaders});}catch(e){return errorResponse(e);}}

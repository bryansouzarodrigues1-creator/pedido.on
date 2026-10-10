import {claimImage} from "@/lib/ai-images";
import {imageClaim} from "@/lib/image-policy";
import {readJson,errorResponse,privateHeaders} from "@/lib/http";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{const input=imageClaim.parse(await readJson(request,4096));return Response.json(await claimImage(input.jobId,input.token),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

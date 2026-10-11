import {readJson,errorResponse,privateHeaders} from "@/lib/http";
import {studioClaim} from "@/lib/studio-policy";
import {claimStudio} from "@/lib/studio";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{const {jobId,token}=studioClaim.parse(await readJson(request,4096));return Response.json(await claimStudio(jobId,token),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

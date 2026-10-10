import {trackedOrder,customerOrder} from "@/lib/order-server";
import {privateHeaders,errorResponse} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const row=await trackedOrder(request,id);return Response.json({order:await customerOrder(row)},{headers:privateHeaders});}catch(e){return errorResponse(e);}}

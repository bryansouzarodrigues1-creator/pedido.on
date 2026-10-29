import {beginAiReceipt,finishAiReceipt} from "./ai-receipts";
import {requestAiProvider} from "./ai-provider";
/** Persist the dispatch before sending; never retry an uncertain expense. */
export async function requestMeteredAiProvider(endpoint:string,body:{jobId:string;token:string},timeout=10000){
 await beginAiReceipt(body.jobId,endpoint);
 const response=await requestAiProvider(endpoint,body,timeout);
 await finishAiReceipt(body.jobId,response);return response;
}

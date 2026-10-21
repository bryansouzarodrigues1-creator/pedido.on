import {assistanceToReaderText,type AssistedCapture} from "./menu-assistance-policy.ts";
import {normalizeMenuText,prepareReaderItems,readMenuPages} from "./menu-reader-policy.ts";
import {inspectMenuSourceText} from "./menu-source-links.ts";
import type {RestaurantData} from "./domain.ts";
import type {Reading} from "./menu-reader-storage.ts";

export function assistanceReadingState(reading:Reading|null,requestId:string){
 if(reading?.assistanceRequestId===requestId&&reading.items.length)return "resume";
 return reading&&(reading.pages.length||reading.items.length||inspectMenuSourceText(reading.text||"").menuText.trim())?"occupied":"new";
}
/** Parse the bounded structured capture in full. Only its URL goes into the
 * 60k free-text field; items and complete descriptions retain their own limits. */
export function buildAssistanceReview(requestId:string,capture:AssistedCapture,restaurantId:string,draft:RestaurantData):Reading{
 const recognized=readMenuPages([{id:"assisted-"+requestId,lines:assistanceToReaderText(capture).split("\n").map(text=>({text}))}]);
 if(!recognized.items.length)throw Error("Os dados chegaram, mas os produtos e preços ainda precisam ser conferidos com o suporte.");
 const items=prepareReaderItems(recognized.items,draft),photoSuggestions:Record<string,string>={};
 for(const item of items){
  const photos=capture.items.filter(row=>row.selected&&row.available&&!row.needsReview&&normalizeMenuText(row.name)===normalizeMenuText(item.name)&&normalizeMenuText(row.category)===normalizeMenuText(item.category)&&row.imageMediaUrl?.startsWith("/media/"+restaurantId+"/")&&/^\/media\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(row.imageMediaUrl));
  const urls=[...new Set(photos.map(row=>row.imageMediaUrl!))];
  if(urls.length===1)photoSuggestions[item.id]=urls[0];
 }
 return {restaurantId,savedAt:Date.now(),pages:[],items,unmatched:recognized.unmatched,text:capture.sourceUrl,assistanceRequestId:requestId,photoSuggestions};
}

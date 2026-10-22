// Synthetic data only. Same envelope produced by writeCaptureResult.
export function runnerResultFromCapture(input){
 const categories=[];
 for(const original of input.items){
  const {selected,sizeChoice,imageMediaUrl,...item}=original;
  let group=categories.find(group=>group.name===item.category);
  if(!group)categories.push(group={name:item.category,items:[]});
  group.items.push(item);
 }
 const valid=input.items.filter(item=>item.available&&!item.needsReview&&item.priceCents!==null);
 return {format:'pizzaria-on-capture-review-v1',report:{format:'pizzaria-on-capture-report-v1',checkedAt:input.capturedAt,
  sourceUrl:input.sourceUrl,storeId:input.sourceUrl.split('/').at(-1),outcome:valid.length?'captured_for_review':'review_required',documentStatus:200,
  stopReason:'visible_items_stable',itemCount:input.items.length,exportableCount:valid.length,pendingCount:input.items.length-valid.length,
  pizzaSizesPending:valid.filter(item=>/pizza|sabor/i.test(item.category)&&!/combo|bebida|sobremesa|lanche/i.test(item.category)).length,
  scrolls:4,blockedRequests:0,truncated:input.truncated,completeness:'unverified',partial:true,elapsedMs:1000},
  capture:{status:'captured',sourceUrl:input.sourceUrl,storeName:input.storeName,capturedAt:input.capturedAt,categories,itemCount:input.items.length,truncated:input.truncated,warning:'Dados sintéticos para teste.'}};
}

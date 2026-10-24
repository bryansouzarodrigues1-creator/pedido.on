/** Only the restaurant's explicit Google review/Maps share link is accepted. */
export function googleReviewLink(value:unknown):string{
 if(typeof value!=="string")return "";
 const raw=value.trim();
 if(!raw||raw.length>500||/[\u0000-\u0020\u007f\\]/.test(raw))return "";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.port)return "";
  const host=url.hostname;
  if(host==="g.page"){
   if(!/^\/(?:r\/)?[a-zA-Z0-9._-]+\/review\/?$/.test(url.pathname))return "";
   url.search="";
  }else if(host==="maps.app.goo.gl"){
   if(!/^\/[a-zA-Z0-9_-]{5,160}\/?$/.test(url.pathname))return "";
   url.search="";
  }else if(host==="search.google.com"&&url.pathname==="/local/writereview"){
   const place=url.searchParams.get("placeid");
   if(!place||!/^[a-zA-Z0-9_-]{3,200}$/.test(place))return "";
   url.search="";url.searchParams.set("placeid",place);
  }else return "";
  url.hash="";
  return url.href;
 }catch{return "";}
}

/** Receive published settings only: drafts must not change an existing customer's link. */
export function completedOrderReviewLink(status:string,publishedSettings:unknown):string{
 if(status!=="delivered"||!publishedSettings||typeof publishedSettings!=="object")return "";
 return googleReviewLink((publishedSettings as {googleReviewUrl?:unknown}).googleReviewUrl);
}

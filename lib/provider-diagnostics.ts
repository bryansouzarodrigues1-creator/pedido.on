export function providerFailure(error:unknown,privateValues:unknown[]){
 const knownNames=["Error","TypeError","AbortError","TimeoutError","NetworkError","ReferenceError"];
 const name=error instanceof Error&&knownNames.includes(error.name)?error.name:"Error";
 let message=error instanceof Error?error.message:"Unknown network error";
 function mask(value:unknown,depth=0){if(depth>8)return;if(typeof value==="string"&&value)message=message.replaceAll(value,"[redacted]");else if(value&&typeof value==="object")for(const item of Object.values(value))mask(item,depth+1);}
 for(const value of privateValues)mask(value);
 message=message.replace(/https?:\/\/[^\s<>"']+/g,text=>{try{const url=new URL(text);return url.origin+url.pathname;}catch{return "[URL]";}}).replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g,"[redacted key]").replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,"[redacted token]");
 if(/password|authorization|cookie|access_token|refresh_token|apikey/i.test(message))message="Sensitive error details omitted";
 return {name,message:message.slice(0,400)};
}

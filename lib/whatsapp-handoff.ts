/** Reserve during the click, before awaiting the server, so mobile popup rules apply. */
export function reserveWhatsappWindow(browser:Pick<Window,"open">){
 let target:Window|null=null;
 try{target=browser.open("about:blank","_blank");if(target)target.opener=null;}catch{}
 const cancel=()=>{try{target?.close();}catch{}target=null;};
 return {cancel,open(url:string){
  if(!/^https:\/\/wa\.me\/[1-9]\d{9,14}\?text=/.test(url)){cancel();return false;}
  try{if(target&&!target.closed){target.location.replace(url);target=null;return true;}}catch{}cancel();return false;
 }};
}

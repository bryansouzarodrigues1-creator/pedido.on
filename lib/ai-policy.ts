export const aiSql={
 reserve:`INSERT INTO ai_jobs (id,owner_id,restaurant_id,input_hash,usage_id,state,credits,created_at)
 SELECT ?,?,?,?,?,'pending',?,? FROM ai_usage WHERE id=? AND credits+?<=? ON CONFLICT(id) DO NOTHING`,
 charge:`UPDATE ai_usage SET credits=credits+?,updated_at=? WHERE id=? AND changes()=1`,
 fail:`UPDATE ai_jobs SET state='failed' WHERE id=? AND state='pending'`,
 refund:`UPDATE ai_usage SET credits=MAX(0,credits-?),updated_at=? WHERE id=? AND changes()=1`,
 complete:`UPDATE ai_jobs SET state='completed',result=? WHERE id=? AND state='pending'`,
 tokens:`UPDATE ai_usage SET input_tokens=input_tokens+?,output_tokens=output_tokens+?,updated_at=? WHERE id=? AND changes()=1`,
} as const;
export const aiCosts={text:1,image:3};
export function aiPeriod(date=new Date()){return date.toISOString().slice(0,7);}
export function validMenuImage(value:string){
 const match=/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);if(!match||match[2].length%4)return false;
 try{const raw=atob(match[2]);if(raw.length>3*1024*1024)return false;
  return match[1]==="png"?raw.startsWith("\x89PNG\r\n\x1a\n"):match[1]==="jpeg"?raw.startsWith("\xff\xd8\xff"):raw.startsWith("RIFF")&&raw.slice(8,12)==="WEBP";
 }catch{return false;}
}

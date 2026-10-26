import {env} from "cloudflare:workers";
import {searchPattern} from "./admin-analytics-policy";
export async function adminAccounts(q="",page=1){
 const db=env.DB!,pattern=searchPattern(q.slice(0,80));
 const base=`FROM account_profiles p WHERE (p.name LIKE ? ESCAPE '\\' OR p.email LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM restaurants r WHERE r.owner_id=p.owner_id AND r.name LIKE ? ESCAPE '\\'))`;
 const [count,rows]=await Promise.all([db.prepare("SELECT COUNT(*) AS n "+base).bind(pattern,pattern,pattern).first<number>("n"),db.prepare(`SELECT p.owner_id AS id,p.name,p.email,p.created_at AS createdAt,(SELECT MAX(s.created_at) FROM auth_sessions s WHERE s.owner_id=p.owner_id AND s.scope='account') AS lastLogin,COALESCE((SELECT json_group_array(json_object('id',r.id,'name',r.name,'slug',r.slug,'published',r.published,'whatsapp',COALESCE(json_extract(CASE WHEN json_valid(r.data) THEN r.data ELSE '{}' END,'$.whatsapp'),''))) FROM restaurants r WHERE r.owner_id=p.owner_id),'[]') AS shops ${base} ORDER BY p.created_at DESC LIMIT 25 OFFSET ?`).bind(pattern,pattern,pattern,(page-1)*25).all<{id:string;name:string;email:string;createdAt:string;lastLogin:string|null;shops:string}>()]);
 return {q,page,pageSize:25,total:count||0,items:rows.results.map(r=>({...r,shops:JSON.parse(r.shops) as {id:string;name:string;slug:string;published:number;whatsapp:string}[]}))};
}
export type AdminAccounts=Awaited<ReturnType<typeof adminAccounts>>;

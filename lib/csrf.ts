import {HttpError} from "./http-policy";
import {randomToken} from "./auth-policy";
export function csrfCookieName(secure:boolean){return secure?"__Host-pedido-csrf":"pedido-csrf";}
export function csrfValue(request:Request){const key=csrfCookieName(new URL(request.url).protocol==="https:")+"=";const value=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(key))?.slice(key.length)||"";return /^[a-f0-9]{64}$/.test(value)?value:"";}
export function issueCsrf(request:Request){const secure=new URL(request.url).protocol==="https:",value=csrfValue(request)||randomToken();return {token:value,cookie:csrfCookieName(secure)+"="+value+"; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600"+(secure?"; Secure":"")};}
export function assertCsrf(request:Request){const value=csrfValue(request);if(!value||request.headers.get("x-pedido-csrf")!==value)throw new HttpError(403,"Atualize a página e tente novamente.");}

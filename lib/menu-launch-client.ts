import {launchDestination,launchSignup} from "./menu-launch.ts";
/** Keep existing owners out of the registration form; the server still checks the session. */
export async function menuLaunchAccountPath(fetcher:typeof fetch=fetch){
 try{
  const response=await fetcher("/api/auth/session",{cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!response.ok)return launchDestination;
  const value=await response.json() as {user?:unknown};
  if(value.user===null)return launchSignup;
  return launchDestination;
 }catch{return launchDestination;}
}

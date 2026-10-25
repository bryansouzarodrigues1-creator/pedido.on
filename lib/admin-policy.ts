export function isPlatformAdministrator(user:{userId:string;email:string;provider:string;adminAuthority?:string}|null|undefined,config:{accountId?:string;email?:string;authority?:string}){
 if(!user)return false;
 if(config.accountId)return user.userId===config.accountId;
 const sameEmail=!!config.email&&user.email.trim().toLowerCase()===config.email.trim().toLowerCase();
 if(config.authority)return /^[a-f0-9]{64}$/.test(config.authority)&&sameEmail&&user.provider==="supabase"&&user.adminAuthority===config.authority;
 return sameEmail&&user.provider==="chatgpt";
}

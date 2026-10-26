// Auditoria de exposição e disponibilidade; apenas GET sem autenticação.
// Não faz cadastro, login, recuperação, pedido, Pix, e-mail ou qualquer escrita.
import assert from 'node:assert/strict';
const origins=['https://pizzaria-on.netlify.app','https://forno-cardapios.waves4845.chatgpt.site'];
const report={checkedAt:new Date().toISOString(),checks:[],warnings:[],scope:'anonymous GET only; no user/account/order/payment writes'};
async function get(origin,path){
 const r=await fetch(origin+path,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(25000),headers:{'Accept':'text/html, application/json'}});
 const type=(r.headers.get('content-type')||'').toLowerCase();
 if([301,302,303,307,308].includes(r.status)){
  const dest=new URL(r.headers.get('location')||'',origin);
  assert.ok(origins.includes(dest.origin),'Unauthorized redirect origin for '+path+': '+dest.origin);
  return {status:r.status,location:dest.pathname,type};
 }
 const data=await r.text();assert.ok(data.length<2000000);
 return {status:r.status,type,text:data,cache:r.headers.get('cache-control')||'',setCookie:r.headers.get('set-cookie')||''};
}
for(const origin of origins){
 const checks={origin,paths:[],config:null};
 try{
  const configResult=await get(origin,'/api/auth/config');
  assert.equal(configResult.status,200,origin+' /api/auth/config HTTP');
  const config=JSON.parse(configResult.text);
  assert.equal(config.enabled,true,origin+' login disabled');
  assert.equal(config.registrationEnabled,true,origin+' registration disabled');
  assert.equal(config.inviteRequired,false,origin+' unexpected invite barrier');
  assert.ok(typeof config.csrf==='string'&&config.csrf.length>=32);
  checks.config={enabled:config.enabled,registrationEnabled:config.registrationEnabled,recoveryEnabled:config.recoveryEnabled,googleEnabled:config.googleEnabled,prototype:config.prototype,csrfIssued:!!configResult.setCookie,supportEnabled:!!config.supportWhatsApp};
  if(!config.recoveryEnabled)report.warnings.push({origin,issue:'A recuperação por e-mail está desativada no backend público. SMTP configurado no provedor não habilita automaticamente o aplicativo.'});
  if(!checks.config.csrfIssued)report.warnings.push({origin,issue:'Cookie CSRF não pôde ser comprovado no GET.'});
  for(const page of ['/entrar','/cadastro','/esqueci-senha','/redefinir-senha']){
   const r=await get(origin,page);
   // Backend Sites pode redirecionar para a origem canônica da Netlify.
   const normal=r.status===200&&r.type.includes('text/html');
   const canonical=[307,308].includes(r.status)&&origin!==origins[0]&&r.location===page;
   assert.ok(normal||canonical,'Invalid login-related page '+origin+page+': HTTP '+r.status);
   if(normal){
    assert.ok(r.text.includes('pizzaria')||r.text.includes('Pizzaria'),'Possível challenge/erro em '+origin+page);
   }
   checks.paths.push({path:page,status:r.status,canonicalRedirect:canonical});
  }
  for(const endpoint of ['/api/restaurants','/api/admin/status']){
   const r=await get(origin,endpoint);
   assert.equal(r.status,401,'Endpoint privado exposto ou inacessível: '+origin+endpoint+' '+r.status);
   assert.ok(r.cache.toLowerCase().includes('no-store'), 'No-store ausente em '+endpoint);
   assert.deepEqual(Object.keys(JSON.parse(r.text)),['error'],'Payload anônimo inesperado em '+endpoint);
   checks.paths.push({path:endpoint,status:r.status,protected:true});
  }
  checks.pass=true;
 }catch(e){checks.pass=false;checks.error=e instanceof Error?e.message:String(e);process.exitCode=1;}
 report.checks.push(checks);
}
console.log(JSON.stringify(report,null,2));

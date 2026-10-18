// One anonymous GET to the real URL supplied in the project. No credentials, accounts or writes.
import {importIfoodLink} from '../lib/ifood-import.ts';
import {parseIfoodStoreLink} from '../lib/menu-source-links.ts';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const supplied=process.env.QA_IFOOD_URL||'https://www.ifood.com.br/delivery/armacao-dos-buzios-rj/master-pizzas---buzios-sao-jose/cd5f08e7-d71c-4918-9fb4-963192b8a85b';
const link=parseIfoodStoreLink(supplied);if(!link)throw Error('O diagnóstico precisa de um link completo de loja iFood.');
const url=link.url;
let httpStatus=null;
const result=await importIfoodLink(url,async(...args)=>{const response=await fetch(...args);httpStatus=response.status;return response;});
const report={checkedAt:new Date().toISOString(),url,httpStatus,status:result.status,productCount:result.count,metadataFields:Object.keys(result.store||{}),store:result.store||null,message:result.message,note:'An anonymous public-page lookup. Does not validate official iFood API access or guarantee a full catalog.'};
const output=path.resolve('.sites-runtime/browser-ci/public-store-probe.json');await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));

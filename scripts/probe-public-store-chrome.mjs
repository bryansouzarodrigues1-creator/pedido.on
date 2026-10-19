// Read-only diagnosis of the two public store links supplied by the owner.
// A successful workflow means the probe ran, not that a catalog was imported.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {structuredIfoodMenu} from '../lib/ifood-import.ts';
import {structuredMenuStore} from '../lib/menu-store-info.ts';
import {parseIfoodStoreLink} from '../lib/menu-source-links.ts';

const links=[
 'https://www.ifood.com.br/delivery/armacao-dos-buzios-rj/master-pizzas---buzios-sao-jose/cd5f08e7-d71c-4918-9fb4-963192b8a85b',
 'https://www.ifood.com.br/delivery/cabo-frio-rj/aione-pizzas-jardim-pero/900caad5-258e-4bf7-9458-353cb0bffe60',
].map(value=>parseIfoodStoreLink(value));
if(links.some(value=>!value))throw Error('Invalid owner-supplied public store URL.');
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright-core');
const out=path.resolve('.sites-runtime/public-ifood-chrome');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true});
const report={checkedAt:new Date().toISOString(),browser:browser.version(),scope:'Anonymous public pages; GET/HEAD only; no login, message, order, payment, proxy, stealth, challenge solving or model call.',stores:[]};
const providerHost=host=>['ifood.com.br','ifood.com','ifood-static.com.br'].some(root=>host===root||host.endsWith('.'+root));
try{
 for(const link of links){
  const context=await browser.newContext({locale:'pt-BR',serviceWorkers:'block',acceptDownloads:false});
  const page=await context.newPage();
  const item={url:link.url,documentStatus:null,outcome:'unavailable',productCount:0,metadataFields:[],jsonResponses:[],blockedWrites:0,errors:[]};
  const pending=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['GET','HEAD'].includes(request.method())){item.blockedWrites++;return route.abort();}
   if(url.protocol!=='https:'||!providerHost(url.hostname))return route.abort();
   if(request.isNavigationRequest()&&!request.frame().parentFrame()&&(url.origin!==new URL(link.url).origin||url.pathname.replace(/\/$/,'')!==new URL(link.url).pathname))return route.abort();
   return route.continue();
  });
  page.on('response',response=>{
   const url=new URL(response.url()),type=response.headers()['content-type']||'';
   // Observe only anonymous catalog responses for this exact store, never auth state.
   if(!providerHost(url.hostname)||!url.pathname.includes(link.storeId)||!/catalog|merchant|menu/i.test(url.pathname)||!type.includes('application/json'))return;
   pending.push((async()=>{
    const found={path:url.origin+url.pathname,status:response.status(),productCount:0};
    item.jsonResponses.push(found);
    if(response.status()!==200||Number(response.headers()['content-length']||0)>1100000)return;
    const body=await response.body();if(body.length>1100000)return;
    const value=JSON.parse(body.toString('utf8'));
    const html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{catalog:value}}}).replace(/</g,'\\u003c')+'</script>';
    const parsed=structuredIfoodMenu(html);found.productCount=parsed.count;
    if(parsed.count>item.productCount){item.productCount=parsed.count;item.catalogSource='observed public JSON';await writeFile(path.join(out,link.storeId+'-products.txt'),parsed.text);}
   })().catch(()=>{item.errors.push('A public catalog response could not be inspected.');}));
  });
  try{
   const response=await page.goto(link.url,{waitUntil:'domcontentloaded',timeout:30000});
   item.documentStatus=response?.status()??null;
   const challenge=async()=>/access denied|request blocked|captcha|just a moment|verify you are human|verifique.{0,30}humano|error code: 10[12]\d/i.test((await page.title())+' '+(await page.locator('body').innerText()).slice(0,3000));
   if(item.documentStatus===401||item.documentStatus===403||await challenge())item.outcome='blocked';
   else if(response?.ok()){
    await page.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});
    if(await challenge())item.outcome='blocked';
    else{
     const html=await page.content();item.htmlBytes=Buffer.byteLength(html);
     if(item.htmlBytes<=1500000){
      const parsed=structuredIfoodMenu(html),store=structuredMenuStore(html,link.url);
      item.htmlProductCount=parsed.count;item.metadataFields=Object.keys(store||{});if(store)item.store=store;
      if(parsed.count>item.productCount){item.productCount=parsed.count;item.catalogSource='rendered public HTML';await writeFile(path.join(out,link.storeId+'-products.txt'),parsed.text);}
      item.scriptTypes=await page.locator('script').evaluateAll(nodes=>nodes.map(node=>({id:node.id||null,type:node.type||null})).filter(node=>node.id==='__NEXT_DATA__'||node.type==='application/ld+json').slice(0,20));
      await writeFile(path.join(out,link.storeId+'-visible.txt'),(await page.locator('body').innerText()).slice(0,60000));
     }else item.outcome='response_too_large';
    }
   }
  }catch(error){item.errors.push(error.message.replace(/https?:\/\/[^\s]+/g,'[public URL]').slice(0,400));}
  finally{
   await page.screenshot({path:path.join(out,link.storeId+'.png'),fullPage:true}).catch(()=>{});
   await context.close();await Promise.allSettled(pending);
   if(item.outcome!=='blocked'&&item.productCount>0)item.outcome='catalog_observed';
   report.stores.push(item);
   await writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));
   console.log(JSON.stringify(item));
  }
 }
}finally{await browser.close();}

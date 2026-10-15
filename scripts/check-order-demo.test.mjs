import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createDemoOrder,demoTicketUrl} from '../lib/order-demo.ts';
import {decideOrder} from '../lib/order-policy.ts';
import {fixture} from './test-backend-fixture.mjs';

async function example(f,order,copy='kitchen',extra=''){
 return f.dispatch('demoTicket','GET',new Request('https://pedido.example'+demoTicketUrl(order,copy)+extra));
}
test('the fictitious Pix and cash flows use the real decision policy and expose only the permitted print copies',async()=>{
 const f=fixture();try{
  f.state.user=null;const before=f.db.prepare('SELECT * FROM orders').all(),sessions=f.db.prepare('SELECT * FROM auth_sessions').all();
  const Actions=f.load('components/order-admin.tsx').OrderPrintActions;
  for(const mode of ['pix','cash']){
   let order=createDemoOrder(mode);assert.equal((await example(f,order,'delivery')).status,409);
   let html=await (await example(f,order)).text();assert.match(html,/DEMONSTRAÇÃO · SEM VALOR/);assert.match(html,/NÃO PREPARAR, ENTREGAR OU COBRAR/);assert.match(html,/order-demo-print\.js/);assert.doesNotMatch(html,/src="\/order-print\.js"/);
   order={...order,...decideOrder(order,{orderId:order.id,version:order.version,action:'accept',etaMinutes:40})};
   if(mode==='pix'){
    assert.equal((await example(f,order,'delivery')).status,409);
    order={...order,status:'awaiting',paymentStatus:'proof_sent',receiptId:crypto.randomUUID(),receiptCount:1,version:order.version+1};
    assert.equal((await example(f,order,'delivery')).status,409);
    assert.throws(()=>decideOrder(order,{orderId:order.id,version:order.version,action:'verify_payment',etaMinutes:40}));
    order={...order,...decideOrder(order,{orderId:order.id,version:order.version,action:'verify_payment',receivedPix:true,etaMinutes:40})};
   }
   const links=renderToStaticMarkup(createElement(Actions,{order,demo:true}));assert.match(links,/\/demo\/pedidos\/comanda/);assert.match(links,/copy=delivery/);assert.doesNotMatch(links,/\/api\/restaurants/);
   for(const action of ['prepare','dispatch','complete']){
    const response=await example(f,order,'delivery'),text=await response.text();assert.equal(response.status,200);assert.match(text,/DEMONSTRAÇÃO · SEM VALOR/);assert.match(text,/sem valor operacional ou financeiro/);assert.match(text,mode==='pix'?/Nada a cobrar/:/Cobrar na entrega/);
    order={...order,...decideOrder(order,{orderId:order.id,version:order.version,action})};
   }
   html=await (await example(f,order,'delivery','&paper=a4')).text();assert.match(html,/VIA HISTÓRICA/);assert.doesNotMatch(html,/class="amount"/);
  }
  assert.deepEqual(f.db.prepare('SELECT * FROM orders').all(),before);assert.deepEqual(f.db.prepare('SELECT * FROM auth_sessions').all(),sessions);assert.equal(f.objects.size,0);
 }finally{f.close();}
});

test('demo routes reject forged states and personal data, never load a restaurant, and never issue a canceled delivery copy',async()=>{
 const f=fixture();try{
  f.state.user=null;const base='https://pedido.example/demo/pedidos/comanda';
  for(const suffix of ['?mode=cash&status=confirmed&paymentStatus=approved','?status=awaiting&paymentStatus=approved','?customer=Pessoa','?restaurantId=shop-a','?orderId='+crypto.randomUUID(),'?paper=javascript','?format=<script>']){
   const response=await f.dispatch('demoTicket','GET',new Request(base+suffix));assert.equal(response.status,400,suffix);
  }
  const canceled={...createDemoOrder(),status:'canceled'};assert.equal((await example(f,canceled,'delivery')).status,409);assert.match(await (await example(f,canceled)).text(),/CANCELADO/);
  const response=await f.dispatch('demoTicket','GET',new Request(base+'?format=json'));assert.equal(response.status,200);assert.deepEqual(await response.json(),{version:1,demo:true});assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
  const html=await f.dispatch('demoTicket','GET',new Request(base));assert.match(html.headers.get('content-security-policy'),/default-src 'none'/);assert.equal(html.headers.get('x-frame-options'),'DENY');
  assert.equal((await f.call('ticket','GET',{id:'shop-a',orderId:crypto.randomUUID()})).status,401);
 }finally{f.close();}
});

test('demo customer and owner views cannot open WhatsApp, read private-link storage or expose the real chat',()=>{
 const f=fixture(),saved={};for(const name of ['window','location','localStorage'])saved[name]=Object.getOwnPropertyDescriptor(globalThis,name);
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
  for(const name of ['location','localStorage'])Object.defineProperty(globalThis,name,{configurable:true,get(){throw Error('Demo must not read '+name);}});
  const order=createDemoOrder(),Customer=f.load('components/order-tracking.tsx').CustomerOrderView,Details=f.load('components/order-admin.tsx').OrderDetails;
  const customer={...order,code:'EXEMPLO',restaurant:'Casa da Pizza',slug:'',whatsapp:'5511999999999',hasReceipt:false,pix:JSON.parse(order.pixSnapshot),summary:JSON.parse(order.data),events:[]};
  const html=renderToStaticMarkup(createElement(Customer,{order:customer,onDemoReceipt(){}}))+renderToStaticMarkup(createElement(Details,{order,onAction:async()=>true,busy:false,demo:true}));
  assert.doesNotMatch(html,/wa\.me|Conversa do pedido|\/api\/restaurants|\/api\/orders/);assert.match(html,/Simular envio de comprovante/);assert.match(html,/DEMONSTRAÇÃO/);assert.match(html,/copy=kitchen/);
 }finally{
  for(const name of Object.keys(saved))if(saved[name])Object.defineProperty(globalThis,name,saved[name]);else delete globalThis[name];f.close();
 }
});

test('the demo print control is local, handles unavailable print and cannot call any API or provider',()=>{
 let click,prints=0;const message={textContent:''},button={disabled:false,addEventListener(_kind,fn){click=fn;}};
 const context={document:{getElementById:id=>id==='print-button'?button:message},window:{print:()=>prints++},fetch(){throw Error('No network permitted');}};
 vm.runInNewContext(readFileSync(new URL('../public/order-demo-print.js',import.meta.url),'utf8'),context);click();assert.equal(prints,1);assert.match(message.textContent,/exemplo fictício/);
 delete context.window.print;click();assert.equal(prints,1);assert.match(message.textContent,/Abra este exemplo no navegador/);assert.equal(button.disabled,false);
});

test('the existing demo starts with a short mode selector, fictitious print links and no external messaging',()=>{
 const f=fixture();try{
  const Demo=f.load('components/order-demo.tsx').default,html=renderToStaticMarkup(createElement(Demo));
  assert.match(html,/Forma de pagamento do exemplo/);assert.match(html,/Pix antecipado/);assert.match(html,/Pagamento na entrega/);assert.match(html,/Nenhum pagamento, comprovante real ou pedido é enviado/);assert.match(html,/\/demo\/pedidos\/comanda/);assert.doesNotMatch(html,/wa\.me|\/api\/restaurants|Conversa do pedido/);
 }finally{f.close();}
});

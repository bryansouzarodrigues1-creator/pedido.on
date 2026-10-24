import test from 'node:test';
import assert from 'node:assert/strict';
import {googleReviewLink,completedOrderReviewLink} from '../lib/google-reviews.ts';
import {restaurantSchema,demoRestaurant} from '../lib/domain.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './test-backend-fixture.mjs';

const direct='https://g.page/r/FornoAzulTeste/review';
test('review links accept Google review forms and short Maps share links',()=>{
 for(const url of [direct,'https://g.page/forno-azul/review','https://maps.app.goo.gl/AbC123teste','https://search.google.com/local/writereview?placeid=ChIJ_teste'])assert.equal(googleReviewLink(url),url);
 assert.equal(googleReviewLink('  '+direct+'?utm_source=site#private-order-token  '),direct);
 assert.equal(googleReviewLink('https://search.google.com/local/writereview?placeid=ChIJ_teste&continue=https://evil.example'), 'https://search.google.com/local/writereview?placeid=ChIJ_teste');
});
test('review links reject lookalike domains, scripts, credentials and unrelated Google pages',()=>{
 for(const value of [null,42,{},'javascript:alert(1)','http://g.page/r/test/review','https://g.page.evil.example/r/test/review','https://evil.example/?url='+direct,'https://attacker@g.page/r/test/review','https://g.page:8443/r/test/review','https://www.google.com/url?q=https://evil.example','https://g.page/','https://maps.app.goo.gl/','https://search.google.com/local/writereview','https://g.page/r/tes\nt/review','https://g.page\\@evil.example/r/test/review',direct+'?'+ 'a'.repeat(500)])assert.equal(googleReviewLink(value),'',String(value));
});
test('old restaurants remain valid without any review link and removal is explicit',()=>{
 const old=demoRestaurant();delete old.googleReviewUrl;
 const parsed=restaurantSchema.parse(old);assert.equal(parsed.googleReviewUrl,'');
 const {googleReviewUrl,...unchanged}=parsed;assert.deepEqual(unchanged,old);
 assert.equal(restaurantSchema.parse({...old,googleReviewUrl:'   '}).googleReviewUrl,'');
});
test('saving a review link normalizes it and rejects a non-Google destination',()=>{
 const parsed=restaurantSchema.parse({...demoRestaurant(),googleReviewUrl:direct+'?utm_source=share'});assert.equal(parsed.googleReviewUrl,direct);
 const bad=restaurantSchema.safeParse({...demoRestaurant(),googleReviewUrl:'https://evil.example/review'});assert.equal(bad.success,false);assert.match(bad.error.issues[0].message,/link.*Google/);
});
test('order review invitation is eligible only after delivery with a valid published destination',()=>{
 for(const status of ['awaiting_payment','awaiting','confirmed','preparing','out_for_delivery','canceled'])assert.equal(completedOrderReviewLink(status,{googleReviewUrl:direct}),'');
 assert.equal(completedOrderReviewLink('delivered',{googleReviewUrl:direct}),direct);
 for(const settings of [null,{},[],{googleReviewUrl:'https://evil.example/review'}])assert.equal(completedOrderReviewLink('delivered',settings),'');
});

test('public menu and owner settings render the explicit destination safely and omit invalid or sample links',()=>{
 const f=fixture();try{
  const Menu=f.load('components/menu.tsx').default,Settings=f.load('components/google-review-settings.tsx').default;
  const data={...demoRestaurant(),googleReviewUrl:direct};
  const html=renderToStaticMarkup(createElement(Menu,{data,slug:'pizzaria-a'}));
  const link=html.match(/<a[^>]*class="[^"]*google-review-link[^"]*"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(link);assert.ok(link.includes('href="'+direct+'"'));assert.match(link,/Avaliar no Google/);assert.match(link,/target="_blank"/);assert.match(link,/rel="noopener noreferrer"/);assert.match(link,/referrer[Pp]olicy="no-referrer"/);
  for(const props of [{data:{...data,googleReviewUrl:''}},{data:{...data,googleReviewUrl:'https://evil.example/review'}},{data,preview:true},{data,demo:true}])assert.doesNotMatch(renderToStaticMarkup(createElement(Menu,props)),/google-review-link/);
  const settings=renderToStaticMarkup(createElement(Settings,{value:direct,onChange(){}}));assert.match(settings,/Testar link no Google/);assert.match(settings,/Salve e publique/);
  const invalid=renderToStaticMarkup(createElement(Settings,{value:'https://evil.example/review',onChange(){}}));assert.match(invalid,/aria-invalid="true"/);assert.match(invalid,/role="alert"/);assert.doesNotMatch(invalid,/google-review-link/);
 }finally{f.close();}
});

test('actual customer view invites all completed orders and preserves other stages without an early review request',async()=>{
 const f=fixture();try{
  const {order,input}=await f.create(),response=await f.call('customer','GET',{id:order.id},undefined,{'x-pedido-order-token':input.trackingToken});
  const current=(await response.json()).order,{CustomerOrderView}=f.load('components/order-tracking.tsx');
  for(const status of ['awaiting_payment','awaiting','confirmed','preparing','out_for_delivery','delivered','canceled']){
   const html=renderToStaticMarkup(createElement(CustomerOrderView,{order:{...current,status,googleReviewUrl:direct},token:input.trackingToken}));
   if(status==='delivered'){assert.match(html,/Como foi seu pedido/);assert.match(html,/Avaliar no Google/);assert.ok(html.includes('href="'+direct+'"'));}else assert.doesNotMatch(html,/tracking-google-review|Avaliar no Google/);
   assert.ok(!html.includes(input.trackingToken));
  }
  const missing=renderToStaticMarkup(createElement(CustomerOrderView,{order:{...current,status:'delivered'},token:input.trackingToken}));assert.doesNotMatch(missing,/tracking-google-review/);
 }finally{f.close();}
});

test('real save, publish and customer routes isolate the review link by store and keep draft changes private',async()=>{
 const f=fixture();try{
  const {order,input}=await f.create(),headers={'x-pedido-order-token':input.trackingToken};
  const get=async()=>{const res=await f.call('customer','GET',{id:order.id},undefined,headers);assert.equal(res.status,200);return (await res.json()).order;};
  const row=()=>f.db.prepare("SELECT * FROM restaurants WHERE id='shop-a'").get();
  const save=async url=>{const before=row();return f.call('restaurant','PUT',{id:'shop-a'},{revision:before.revision,data:{...JSON.parse(before.data),googleReviewUrl:url}});};
  const before=row();assert.equal((await save('https://evil.example/review')).status,400);assert.deepEqual(row(),before);
  f.state.user={...f.state.user,userId:'owner-b'};assert.equal((await save(direct)).status,404);f.state.user={...f.state.user,userId:'owner-a'};
  const saved=await save(direct+'?utm_source=share');assert.equal(saved.status,200,await saved.clone().text());assert.equal(JSON.parse(row().data).googleReviewUrl,direct);assert.equal((await get()).googleReviewUrl,undefined);
  f.db.prepare("UPDATE orders SET status='delivered' WHERE id=?").run(order.id);assert.equal((await get()).googleReviewUrl,undefined,'an unpublished draft must not change the customer link');
  const other={...f.data,googleReviewUrl:'https://g.page/r/OutraLoja/review'};f.db.prepare("UPDATE restaurants SET published_data=? WHERE id='shop-b'").run(JSON.stringify(other));
  const publish=async()=>f.call('publish','POST',{id:'shop-a'},{revision:row().revision,published:true});
  const published=await publish();assert.equal(published.status,200,await published.clone().text());assert.equal((await get()).googleReviewUrl,direct);
  const removed=await save('');assert.equal(removed.status,200);assert.equal((await get()).googleReviewUrl,direct,'removal remains a draft until publication');
  assert.equal((await publish()).status,200);assert.equal((await get()).googleReviewUrl,undefined);
  assert.equal((await f.call('customer','GET',{id:order.id})).status,404);
 }finally{f.close();}
});

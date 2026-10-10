import test from 'node:test';
import assert from 'node:assert/strict';
import {validPixKey,trackingToken,trackingAlive,receiptType,orderActionSchema} from '../lib/order-policy.ts';
import {restaurantSchema,defaultRestaurant} from '../lib/domain.ts';

test('Pix formats include current CNPJ alphanumeric keys and exact email, E164 and random-key rules',()=>{
 for(const [type,key] of [['cpf','529.982.247-25'],['cnpj','11.222.333/0001-81'],['cnpj','ABCD1234567800'],['email','pizza@example.com'],['phone','+5511999999999'],['phone','+12025550123'],['random','123e4567-e89b-12d3-a456-426614174000']])assert.equal(validPixKey(type,key),true,type+':'+key);
 for(const [type,key] of [['cpf','11111111111'],['cpf','52998224726'],['cnpj','11222333000100'],['email','PIZZA@example.com'],['email','x'.repeat(78)+'@example.com'],['phone','11999999999'],['phone','+000123456'],['random','arbitrary text']])assert.equal(validPixKey(type,key),false,type+':'+key);
});

test('the restaurant cannot activate prepaid Pix without the registered-key fields and payment method',()=>{
 const base=defaultRestaurant('Pizzaria de teste');assert.equal(restaurantSchema.safeParse(base).success,true);
 const pix={enabled:true,type:'email',key:'pizza@example.com',recipient:'Pizzaria de teste'};
 assert.equal(restaurantSchema.safeParse({...base,pix}).success,true);
 for(const patch of [{pix:{...pix,key:''}},{pix:{...pix,recipient:''}},{payments:['Dinheiro'],pix}])assert.equal(restaurantSchema.safeParse({...base,...patch}).success,false);
 const old={...base};delete old.pix;assert.equal(restaurantSchema.parse(old).pix.enabled,false);
});

test('tracking credentials are opaque 256-bit values, bounded, and links expire after thirty days',()=>{
 const now=Date.parse('2026-10-09T00:00:00Z');assert.equal(trackingToken('ab'.repeat(32)),'ab'.repeat(32));
 for(const invalid of [null,'short','ab'.repeat(33),'../../secret'])assert.equal(trackingToken(invalid),'');
 assert.equal(trackingAlive('2026-10-08T00:00:00Z',now),true);
 for(const stamp of ['2026-09-09T00:00:00Z','2026-10-10T00:00:00Z','not a date'])assert.equal(trackingAlive(stamp,now),false);
});

test('proof formats require matching magic bytes, with no SVG or HTML execution path',()=>{
 assert.deepEqual(receiptType(new TextEncoder().encode('%PDF-1.7\nexample'),'application/pdf'),{type:'application/pdf',ext:'pdf'});
 for(const type of ['image/png','image/jpeg','image/webp','image/svg+xml','text/html','application/pdf'])assert.equal(receiptType(new TextEncoder().encode('<script>not a proof</script>'),type),null);
 assert.equal(receiptType(new Uint8Array(5*1024*1024+1),'image/png'),null);
 assert.equal(orderActionSchema.safeParse({orderId:crypto.randomUUID(),version:1,action:'confirm',etaMinutes:241,receivedPix:true}).success,false);
 assert.equal(orderActionSchema.safeParse({orderId:crypto.randomUUID(),version:1,status:'confirmed'}).success,false);
});

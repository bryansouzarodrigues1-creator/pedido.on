import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatorSchema,calculateProfit,decimalValue} from '../lib/profit-calculator.ts';
const base={price:5000,cost:1800,extras:200,fixed:1000000,daily:30,days:26,fees:5,margin:20};
test('calculator accounts for fees, complete cost, fixed expenses and operating volume',()=>{
 const r=calculateProfit(base);assert.equal(r.quantity,780);assert.equal(r.total,3900000);assert.equal(r.fees,195000);assert.equal(r.direct,1560000);assert.equal(r.profit,1145000);assert.equal(r.breakEven,364);assert.equal(r.suggested,4400);assert.equal(r.minimum,3500);assert.equal(r.moreSales.quantity,936);assert.equal(r.moreSales.profit,1574000);
});
test('target is margin on revenue and reference rounds upward to fifty cents',()=>{
 const r=calculateProfit({...base,fixed:0,cost:2000,extras:0,fees:0,margin:20});assert.equal(r.suggested,2500);assert.equal(r.suggestedProfit,390000);
 const v={...base,price:4025,fees:3.75};const k=calculateProfit(v);assert.equal(k.fees,Math.round(k.total*.0375));assert.ok(k.suggested*(1-v.fees/100-v.margin/100)>=v.cost+v.extras+v.fixed/k.quantity);
});
test('negative contribution never advertises a attainable break-even through volume',()=>{
 const r=calculateProfit({...base,price:1000});assert.equal(r.breakEven,null);assert.ok(r.profit<0);assert.ok(r.moreSales.profit<r.profit);assert.ok(r.minimum>1000);
 assert.equal(calculateProfit({...base,fixed:0}).breakEven,0);
});
test('Brazilian numbers parse without silently accepting missing or invalid values',()=>{
 assert.equal(decimalValue('1.234,56'),1234.56);assert.equal(decimalValue('45.50'),45.5);assert.equal(decimalValue('20,00'),20);
 for(const v of ['', ' ', '-3', 'R$ 10','1,2,3','3.123','Infinity','x'])assert.ok(Number.isNaN(decimalValue(v)),v);
});
test('impossible and fractional volumes or invalid percentages require correction',()=>{
 for(const patch of [{daily:0},{daily:2.5},{days:32},{price:0},{fixed:-1},{fees:40,margin:60},{fees:61},{margin:71}])assert.equal(calculatorSchema.safeParse({...base,...patch}).success,false);
 assert.equal(calculatorSchema.safeParse({...base,unknown:'injected'}).success,false);
});

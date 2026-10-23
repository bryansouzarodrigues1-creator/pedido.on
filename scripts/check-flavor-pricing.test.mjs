import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFlavorPrice,flavorPriceSchema,flavorRowInput,flavorTableSchema,blankFlavorRow,exampleFlavorRows,flavorPricingCsv} from '../lib/flavor-pricing.ts';

test('reference percentages add to cost; gross profit and reserve are separate from revenue margin',()=>{
 const result=calculateFlavorPrice({cost:2601,overhead:15,markup:135});
 assert.equal(result.suggested,6503);assert.equal(result.gross,3902);assert.equal(result.reserve,390);assert.equal(result.afterReserve,3512);assert.ok(result.grossMargin>59.99&&result.grossMargin<60.01);
 const simple=calculateFlavorPrice({cost:2000,overhead:15,markup:125});assert.equal(simple.suggested,4800);assert.equal(simple.gross,2800);assert.equal(simple.reserve,300);assert.equal(simple.afterReserve,2500);
});
test('final price rounds once to cents, including values with hidden-fraction differences from a displayed spreadsheet',()=>{
 for(const [cost,overhead,markup,suggested] of [[2541,15,141,6505],[3541,15,111,8003],[2016,15,133,5000],[2316,15,144.1,6001],[1,0,50,2]])assert.equal(calculateFlavorPrice({cost,overhead,markup}).suggested,suggested);
 assert.deepEqual(calculateFlavorPrice({cost:100,overhead:0,markup:0}),{cost:100,overhead:0,markup:0,suggested:100,reserve:0,gross:0,afterReserve:0,grossMargin:0});
});
test('missing values, negative costs and percentages, excessive precision and unknown fields are rejected',()=>{
 for(const input of [{cost:0,overhead:15,markup:100},{cost:-100,overhead:15,markup:100},{cost:100,overhead:301,markup:100},{cost:100,overhead:15,markup:1001},{cost:100,overhead:15.001,markup:100},{cost:100,overhead:15,markup:NaN},{cost:100,overhead:15,markup:100,price:1}])assert.equal(flavorPriceSchema.safeParse(input).success,false);
 assert.equal(flavorRowInput(blankFlavorRow()).success,false);
 assert.deepEqual(flavorRowInput({...blankFlavorRow(),cost:'1.234,56',overhead:'15',markup:'144,1'}).data,{cost:123456,overhead:15,markup:144.1});
});
test('saved flavor tables restore exact strings and independent rows without using old monthly storage',()=>{
 const rows=exampleFlavorRows(),restored=flavorTableSchema.parse(JSON.parse(JSON.stringify({version:1,rows})));assert.equal(rows.length,5);assert.equal(new Set(rows.map(row=>row.id)).size,5);assert.deepEqual(restored.rows,rows);assert.equal(rows[4].markup,'144,1');assert.equal(flavorTableSchema.safeParse({version:2,rows}).success,false);
 assert.equal(flavorTableSchema.safeParse({version:1,rows:[]}).success,false);assert.equal(flavorTableSchema.safeParse({version:1,rows:[{...rows[0],cost:'x'.repeat(25)}]}).success,false);
});
test('CSV includes every flavor, exact cent values, UTF-8 header and safe spreadsheet text',()=>{
 const rows=exampleFlavorRows();rows[0].name='=HYPERLINK("https://example.test")';const csv=flavorPricingCsv(rows);assert.ok(csv.startsWith('\ufeff'));assert.equal(csv.split('\r\n').filter(Boolean).length,6);assert.ok(csv.includes('"\'=HYPERLINK(""https://example.test"")"'));assert.ok(csv.includes('"26,01";"15";"135";"65,03";"39,02";"3,90";"35,12"'));assert.ok(csv.includes('"Mussarela"'));assert.throws(()=>flavorPricingCsv([blankFlavorRow()]),/Confira os valores/);
});

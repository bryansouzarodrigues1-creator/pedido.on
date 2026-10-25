import {z} from "zod";
import {decimalValue} from "./profit-calculator.ts";
export const ingredientSchema=z.object({id:z.string().uuid(),name:z.string().max(80),purchasePrice:z.string().max(24),purchaseQuantity:z.string().max(24),usedQuantity:z.string().max(24),unit:z.enum(["kg","g","l","ml","un"])}).strict();
export type CostIngredient=z.infer<typeof ingredientSchema>;
export function blankIngredient():CostIngredient{return {id:crypto.randomUUID(),name:"",purchasePrice:"",purchaseQuantity:"1",usedQuantity:"",unit:"kg"};}
export function quantityValue(text:string){const v=text.trim().replace(/\s/g,"").replace(",",".");return /^\d+(\.\d{1,3})?$/.test(v)?Number(v):NaN;}
export function recipeCost(input:{ingredients:CostIngredient[];waste:string;packaging:string;energy:string;other:string}){
 if(!input.ingredients.length||input.ingredients.length>60)throw Error("Inclua de 1 a 60 ingredientes na ficha.");
 const waste=decimalValue(input.waste),extras=[input.packaging,input.energy,input.other].map(decimalValue);
 if(!Number.isFinite(waste)||waste<0||waste>50||extras.some(v=>!Number.isFinite(v)||v<0||v>10000))throw Error("Confira perdas (0 a 50%) e os custos extras da unidade.");
 const items=input.ingredients.map(raw=>{const item=ingredientSchema.parse(raw),price=decimalValue(item.purchasePrice),bought=quantityValue(item.purchaseQuantity),used=quantityValue(item.usedQuantity),factor=item.unit==="kg"||item.unit==="l"?1000:1;
  if(!Number.isFinite(price)||price<=0||price>10000||!Number.isFinite(bought)||bought<=0||bought>1000000||!Number.isFinite(used)||used<=0||used>1000000)throw Error("Confira preço, quantidade comprada e quantidade usada de cada ingrediente.");
  const rawCents=Math.round(price*100)*used/(bought*factor);return {...item,cents:Math.round(rawCents),rawCents,usedUnit:item.unit==="kg"||item.unit==="g"?"g":item.unit==="un"?"un":"ml"};
 });
 const ingredients=items.reduce((n,v)=>n+v.rawCents,0),withLoss=Math.round(ingredients/(1-waste/100)),extraCents=extras.map(v=>Math.round(v*100)),total=withLoss+extraCents.reduce((n,v)=>n+v,0);
 if(!Number.isSafeInteger(total)||total<1||total>1000000)throw Error("O custo por pizza precisa ficar entre R$ 0,01 e R$ 10.000,00.");
 return {items,ingredients:Math.round(ingredients),loss:withLoss-Math.round(ingredients),packaging:extraCents[0],energy:extraCents[1],other:extraCents[2],total};
}
export function marginPrice(input:{cost:number;overhead:number;fees:number;margin:number}){
 const {cost,overhead,fees,margin}=input;
 if(!Number.isSafeInteger(cost)||cost<1||cost>1000000||![overhead,fees,margin].every(v=>Number.isFinite(v)&&v>=0&&Math.abs(v*100-Math.round(v*100))<.000001)||overhead>300||fees>90||margin>90||fees+margin>=100)throw Error("Taxas e margem devem somar menos de 100%. Confira também o custo e a reserva de despesas.");
 const reserve=Math.round(cost*Math.round(overhead*100)/10000),denominator=10000-Math.round(fees*100)-Math.round(margin*100),suggested=Math.ceil((cost+reserve)*10000/denominator);
 if(suggested>100000000)throw Error("O preço calculado ficou muito alto. Revise as taxas e a margem.");
 return {suggested,reserve};
}

import {z} from "zod";
export const calculatorSchema=z.object({price:z.number().int().min(1).max(1000000),cost:z.number().int().min(0).max(1000000),extras:z.number().int().min(0).max(1000000),fixed:z.number().int().min(0).max(100000000),daily:z.number().int().min(1).max(5000),days:z.number().int().min(1).max(31),fees:z.number().min(0).max(60),margin:z.number().min(0).max(70)}).strict().refine(v=>v.fees+v.margin<100,"As taxas e a margem desejada precisam somar menos de 100%.");
export type CalculatorInput=z.infer<typeof calculatorSchema>;
export function calculateProfit(raw:unknown){
 const v=calculatorSchema.parse(raw),quantity=v.daily*v.days,variable=v.cost+v.extras,feeRate=v.fees/100;
 const perSale=v.price*(1-feeRate)-variable,allocated=v.fixed/quantity;
 const suggested=Math.ceil((variable+allocated)/(1-feeRate-v.margin/100)/50)*50;
 const total=v.price*quantity,fees=Math.round(total*feeRate),direct=variable*quantity,contribution=total-fees-direct,profit=contribution-v.fixed;
 const breakEven=perSale>0?Math.ceil(v.fixed/perSale):null;
 const extraQuantity=Math.max(1,Math.ceil(quantity*.2));
 return {quantity,total,fees,direct,contribution,profit,margin:total?profit/total*100:0,perSale:Math.round(perSale),allocated:Math.round(allocated),suggested,breakEven,minimum:Math.ceil((variable+allocated)/(1-feeRate)/50)*50,moreSales:{quantity:quantity+extraQuantity,profit:Math.round(perSale*(quantity+extraQuantity)-v.fixed)},suggestedProfit:Math.round((suggested*(1-feeRate)-variable)*quantity-v.fixed)};
}
export function decimalValue(value:string){const clean=value.trim().replace(/\s/g,"");if(!clean)return NaN;const normal=clean.includes(",")?clean.replace(/\./g,"").replace(",","."):clean;if(!/^\d+(\.\d{1,2})?$/.test(normal))return NaN;return Number(normal);}

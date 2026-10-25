import {z} from "zod";
import {ingredientSchema,recipeCost,marginPrice} from "./pizza-costing.ts";
import {decimalValue} from "./profit-calculator.ts";

const percentage=(maximum:number)=>z.number().min(0).max(maximum).refine(v=>Math.abs(v*100-Math.round(v*100))<0.000001);
export const flavorPriceSchema=z.object({cost:z.number().int().min(1).max(1000000),overhead:percentage(300),markup:percentage(1000)}).strict();
export function calculateFlavorPrice(raw:unknown){
 const value=flavorPriceSchema.parse(raw),overheadPoints=Math.round(value.overhead*100),markupPoints=Math.round(value.markup*100);
 // Percentages in the reference are additions to cost, not margins on revenue.
 // Keep cents and basis points integral; round the final sale price only once.
 const suggested=Math.round(value.cost*(10000+overheadPoints+markupPoints)/10000);
 const reserve=Math.round(value.cost*overheadPoints/10000),gross=suggested-value.cost;
 return {...value,suggested,reserve,gross,afterReserve:gross-reserve,grossMargin:gross/suggested*100};
}
export const flavorRowSchema=z.object({id:z.string().uuid(),name:z.string().max(80),cost:z.string().max(24),overhead:z.string().max(24),markup:z.string().max(24),method:z.enum(["markup","margin"]).optional(),fees:z.string().max(24).optional(),margin:z.string().max(24).optional(),salePrice:z.string().max(24).optional(),costMode:z.enum(["ready","recipe"]).optional(),ingredients:z.array(ingredientSchema).max(60).refine(items=>new Set(items.map(i=>i.id)).size===items.length,"Ingredientes repetidos na cópia.").optional(),waste:z.string().max(24).optional(),packaging:z.string().max(24).optional(),energy:z.string().max(24).optional(),other:z.string().max(24).optional()}).strict();
export type FlavorPriceRow=z.infer<typeof flavorRowSchema>;
export const flavorTableSchema=z.object({version:z.literal(1),rows:z.array(flavorRowSchema).min(1).max(200)}).strict().refine(value=>new Set(value.rows.map(row=>row.id)).size===value.rows.length,"Os sabores precisam ter identificadores diferentes.");
export function flavorRowInput(row:FlavorPriceRow){let cost=NaN;try{cost=row.costMode==="recipe"?flavorRecipe(row).total:Math.round(decimalValue(row.cost)*100);}catch{}return flavorPriceSchema.safeParse({cost,overhead:decimalValue(row.overhead),markup:row.method==="margin"?0:decimalValue(row.markup)});}
export function blankFlavorRow():FlavorPriceRow{return {id:crypto.randomUUID(),name:"",cost:"",overhead:"15",markup:"100"};}
export function exampleFlavorRows():FlavorPriceRow[]{return [
 ["Calabresa com cebola","26,01","135"],
 ["Calabresa sem cebola","25,41","141"],
 ["Calabresa com requeijão","35,41","111"],
 ["Mussarela","20,16","133"],
 ["Presunto","23,16","144,1"],
].map(([name,cost,markup])=>({...blankFlavorRow(),name,cost,markup}));}
function csvCell(value:string){const safe=/^[\s]*[=+@-]/.test(value)?"'"+value:value;return '"'+safe.replaceAll('"','""')+'"';}
export function flavorRecipe(row:FlavorPriceRow){return recipeCost({ingredients:row.ingredients||[],waste:row.waste||"0",packaging:row.packaging||"0",energy:row.energy||"0",other:row.other||"0"});}
export function flavorQuote(row:FlavorPriceRow){
 const parsed=flavorRowInput(row);if(!parsed.success)throw Error("Confira o custo, a reserva de despesas e o acréscimo sobre o custo.");
 const fees=decimalValue(row.fees??"0");if(!Number.isFinite(fees)||fees<0||fees>90)throw Error("Informe taxas entre 0 e 90%.");
 const v=parsed.data,base=row.method==="margin"?marginPrice({cost:v.cost,overhead:v.overhead,fees,margin:decimalValue(row.margin??"20")}):calculateFlavorPrice(v);
 if(row.method!=="margin"&&fees>0)base.suggested=Math.ceil(base.suggested*10000/(10000-Math.round(fees*100)));
 const fee=Math.round(base.suggested*Math.round(fees*100)/10000),profit=base.suggested-v.cost-base.reserve-fee,current=row.salePrice?.trim()?Math.round(decimalValue(row.salePrice)*100):base.suggested;
 if(!Number.isSafeInteger(current)||current<1||current>100000000)throw Error("Confira o preço que você cobra hoje.");
 const currentFee=Math.round(current*Math.round(fees*100)/10000),currentProfit=current-v.cost-base.reserve-currentFee;
 return {...v,...base,fees,fee,gross:base.suggested-v.cost,afterReserve:profit,grossMargin:(base.suggested-v.cost)/base.suggested*100,netMargin:profit/base.suggested*100,currentPrice:current,currentProfit,currentMargin:currentProfit/current*100};
}
export function flavorPricingCsv(rows:FlavorPriceRow[]){
 const checked=flavorTableSchema.parse({version:1,rows}).rows,cents=(v:number)=>(v/100).toFixed(2).replace(".",",");
 const header=["Sabor","Custo total (R$)","Despesas estimadas (% do custo)","Acréscimo desejado (% do custo)","Preço sugerido (R$)","Lucro bruto (R$)","Reserva de despesas (R$)","Sobra após reserva e taxas (R$)","Margem bruta (% do preço)","Método","Taxas (% da venda)","Margem desejada (% da venda)","Preço atual (R$)","Sobra no preço atual (R$)","Margem após reserva e taxas (%)"];
 const lines=checked.map((row,index)=>{let r;try{r=flavorQuote(row);}catch{throw Error("Confira os valores de todos os sabores antes de baixar a tabela.");}return [row.name.trim()||"Sabor "+(index+1),cents(r.cost),String(r.overhead).replace(".",","),row.method==="margin"?"":String(r.markup).replace(".",","),cents(r.suggested),cents(r.gross),cents(r.reserve),cents(r.afterReserve),r.grossMargin.toFixed(2).replace(".",","),row.method==="margin"?"Margem sobre a venda":"Acréscimo sobre o custo",String(r.fees).replace(".",","),row.method==="margin"?row.margin||"20":"",cents(r.currentPrice),cents(r.currentProfit),r.currentMargin.toFixed(2).replace(".",",")].map(csvCell).join(";");});
 return "\ufeff"+[header.map(csvCell).join(";"),...lines].join("\r\n")+"\r\n";
}

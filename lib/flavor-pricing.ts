import {z} from "zod";
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
export const flavorRowSchema=z.object({id:z.string().uuid(),name:z.string().max(80),cost:z.string().max(24),overhead:z.string().max(24),markup:z.string().max(24)}).strict();
export type FlavorPriceRow=z.infer<typeof flavorRowSchema>;
export const flavorTableSchema=z.object({version:z.literal(1),rows:z.array(flavorRowSchema).min(1).max(200)}).strict();
export function flavorRowInput(row:FlavorPriceRow){return flavorPriceSchema.safeParse({cost:Math.round(decimalValue(row.cost)*100),overhead:decimalValue(row.overhead),markup:decimalValue(row.markup)});}
export function blankFlavorRow():FlavorPriceRow{return {id:crypto.randomUUID(),name:"",cost:"",overhead:"15",markup:"100"};}
export function exampleFlavorRows():FlavorPriceRow[]{return [
 ["Calabresa com cebola","26,01","135"],
 ["Calabresa sem cebola","25,41","141"],
 ["Calabresa com requeijão","35,41","111"],
 ["Mussarela","20,16","133"],
 ["Presunto","23,16","144,1"],
].map(([name,cost,markup])=>({...blankFlavorRow(),name,cost,markup}));}
function csvCell(value:string){const safe=/^[\s]*[=+@-]/.test(value)?"'"+value:value;return '"'+safe.replaceAll('"','""')+'"';}
export function flavorPricingCsv(rows:FlavorPriceRow[]){
 const checked=flavorTableSchema.parse({version:1,rows}).rows;
 const cents=(value:number)=>(value/100).toFixed(2).replace(".",",");
 const header=["Sabor","Custo total (R$)","Despesas estimadas (% do custo)","Lucro desejado (% do custo)","Preço sugerido (R$)","Lucro bruto (R$)","Reserva de despesas (R$)","Sobra após reserva (R$)","Margem bruta (% do preço)"];
 const lines=checked.map((row,index)=>{const parsed=flavorRowInput(row);if(!parsed.success)throw Error("Confira os valores de todos os sabores antes de baixar a tabela.");const result=calculateFlavorPrice(parsed.data);return [row.name.trim()||"Sabor "+(index+1),cents(result.cost),String(result.overhead).replace(".",","),String(result.markup).replace(".",","),cents(result.suggested),cents(result.gross),cents(result.reserve),cents(result.afterReserve),result.grossMargin.toFixed(2).replace(".",",")].map(csvCell).join(";");});
 return "\ufeff"+[header.map(csvCell).join(";"),...lines].join("\r\n")+"\r\n";
}

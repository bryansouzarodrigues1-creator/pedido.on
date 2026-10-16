// Local, explicit interchange format. Prices are reais, never guessed from IDs.
import {menuAmount} from "./menu-reader-policy.ts";
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function csvRows(text:string,separator:string){
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(cell.trim());cell="";}else if(c==='\n'&&!quoted){row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";}else if(c!=='\r')cell+=c;}
 if(quoted)throw Error("O CSV tem aspas abertas. Exporte novamente o arquivo.");row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export function menuFileText(name:string,raw:string){
 if(raw.length>60000)throw Error("Envie até 60 mil caracteres por arquivo.");
 const text=raw.replace(/^\uFEFF/,"");if(/\.txt$/i.test(name))return text;
 if(!/\.csv$/i.test(name))throw Error("Envie um arquivo TXT ou CSV. Para fotos, use Enviar fotos.");
 const rows=csvRows(text,text.split("\n")[0].includes(";")?";":","),headers=rows.shift()?.map(normalize)||[];
 const column=(...keys:string[])=>headers.findIndex(h=>keys.includes(h)),ni=column("nome","produto","name"),ci=column("categoria","category"),di=column("descricao","description"),pi=column("preco","price"),ti=column("tipo","kind");
 if(ni<0||pi<0&&!["p","m","g"].some(s=>headers.includes(s)))throw Error("O CSV precisa das colunas nome e preco, ou nome e p, m, g. Valores em reais, como 49,90.");
 if(rows.length>200)throw Error("Importe até 200 produtos por arquivo.");
 return rows.flatMap(row=>{
  const title=row[ni]?.replace(/[\r\n]/g," ").trim();if(!title||title.length>100)throw Error("Confira os nomes do CSV (até 100 caracteres).");
  const category=ci>=0?row[ci]:"",kind=ti>=0?normalize(row[ti]||""):"",sizes=["p","m","g"].flatMap(s=>{const i=headers.indexOf(s);if(i<0||!row[i])return [];if(menuAmount(row[i])===null)throw Error("Confira um preço do CSV: "+title);return [s.toUpperCase()+" R$ "+row[i]];});
  const price=pi>=0?row[pi]:"";if(!sizes.length&&menuAmount(price||"")===null)throw Error("Informe o preço em reais no CSV: "+title);
  const heading=`Categoria: ${category||(kind==="simple"?"Produtos":"Pizzas")} [${["pizza","simple","crust"].includes(kind)?kind:sizes.length?"pizza":/bebida|combo|lanche|porcao|suco|refri/i.test(category)?"simple":"pizza"}]`;
  // Repeat the heading so each row keeps its own category and sizes.
  return [heading,title+" "+(sizes.length?sizes.join(" "):"R$ "+price),...(di>=0&&row[di]?["Ingredientes: "+row[di].replace(/[\r\n]/g," ")]:[])];
 }).join("\n");
}

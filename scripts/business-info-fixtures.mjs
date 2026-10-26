import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const req=createRequire(import.meta.url),wranglerReq=createRequire(req.resolve('wrangler/package.json')),miniflareReq=createRequire(wranglerReq.resolve('miniflare/package.json')),sharp=miniflareReq('sharp');
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
export const businessInfoExpectedHours='Segunda: 18:00 - 23:00; Terça: 18:00 - 23:00; Quarta: 18:00 - 23:00; Quinta: 18:00 - 23:00; Sexta: 18:00 - 00:00; Sábado: 18:00 - 00:00; Domingo: Fechado';
/** Synthetic documents with known answers; never called a real customer's Google profile. */
export async function businessInfoFixtures(output){
 await mkdir(output,{recursive:true});const paths={};
 for(const dark of [false,true]){
  const color=dark?'#f0f3f4':'#202124',background=dark?'#202124':'#ffffff';
  const line=(text,x,y,size=34)=>`<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" fill="${color}">${esc(text)}</text>`;
  const days=['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1120"><rect width="100%" height="100%" fill="${background}"/>${line('Pizzaria Forno de Teste',55,85,46)}${line('Endereço: Rua das Palmeiras, 42 - Centro',55,165,36)}${line('Telefone: (22) 99999-1234',55,230,36)}${line('Horários de funcionamento',55,330,40)}${days.map((day,i)=>line(day,55,415+i*74)+line(i===6?'Fechado':i<4?'18:00 - 23:00':'18:00 - 00:00',600,415+i*74)).join('')}${line('Aniversário da loja: 15/11/2026',55,1020,33)}</svg>`;
  const key=dark?'google-dark':'google-light',target=path.join(output,key+'.png');await sharp(Buffer.from(svg)).png().toFile(target);paths[key]=target;
 }
 const line=(text,y)=>`<text x="50" y="${y}" font-family="DejaVu Sans" font-size="32" fill="#18392e">${esc(text)}</text>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="100%" height="100%" fill="#e5f5df"/>${line('Dados da Pizzaria da Vila',70)}${line('Horário: Terça a domingo, das 18h às 23h',155)}${line('Endereço: Avenida das Flores, 75',240)}${line('WhatsApp: (22) 98888-4321',325)}${line('Aniversário da loja: 15/11/2026',410)}${line('Tempo de entrega: 30 a 50 min',495)}</svg>`;
 paths.whatsapp=path.join(output,'whatsapp.png');await sharp(Buffer.from(svg)).png().toFile(paths.whatsapp);return paths;
}

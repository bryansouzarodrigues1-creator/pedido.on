export type CardData={
  name:string;
  email:string;
  password:string;
  domain:string;
  includePassword:boolean;
  pizzaDataUrl?:string;
  logoDataUrl?:string;
};

function xml(value:string){
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}

function lines(value:string,limit:number):string[]{
  const codepoints=Array.from(value);
  const result:string[]=[];
  for(let i=0;i<codepoints.length;i+=limit)result.push(codepoints.slice(i,i+limit).join(""));
  return result.length?result:[""];
}

/** This is an editable SVG template, generated entirely in the owner's browser.
 * By default, no password is included in the image. An explicit opt-in is needed.
 */
export function buildRegistrationCardSvg(data:CardData):string{
  const nameLines=lines(data.name.trim()||"proprietário",34);
  const emailLines=lines(data.email.trim(),30);
  const passwordLines=data.includePassword?lines(data.password,28):["••••••••••••"];
  const domainLines=lines(data.domain,32);
  const emailLabelY=319+(nameLines.length-1)*25;
  const passwordLabelY=emailLabelY+51+emailLines.length*29;
  const passwordTextY=passwordLabelY+46;
  const noteY=passwordTextY+passwordLines.length*29+32;
  const footerHeight=102+domainLines.length*29;
  const height=Math.max(810,noteY+50+footerHeight);
  const footerLineY=height-footerHeight;
  const safeImage=(value:string)=>/^data:image\/(?:png|webp|jpe?g);base64,[a-z0-9+/=]+$/i.test(value);
  const photo=safeImage(data.pizzaDataUrl||"")?
    '<image href="'+data.pizzaDataUrl+'" x="845" y="83" width="355" height="'+(height-166)+'" preserveAspectRatio="xMidYMid slice"/>':"";
  const logo=safeImage(data.logoDataUrl||"")?
    '<image href="'+data.logoDataUrl+'" x="81" y="69" width="65" height="65"/>':
    '<circle cx="112" cy="103" r="29" fill="#ffd34e"/><path d="M95 98l34 17-15-34z" fill="#ff6b43"/>';
  const nameText=nameLines.map((line,i)=>'<text x="88" y="'+(298+i*25)+'" font-family="Arial,sans-serif" font-size="19" fill="#bbcbda">Conta de '+xml(line)+'</text>').join("");
  const emailText=emailLines.map((line,i)=>'<text x="88" y="'+(emailLabelY+25+i*29)+'" font-family="Arial,sans-serif" font-size="24" fill="#ffffff">'+xml(line)+'</text>').join("");
  const secretText=passwordLines.map((line,i)=>'<text x="88" y="'+(passwordTextY+i*29)+'" font-family="Arial,sans-serif" font-size="24" fill="'+(data.includePassword?"#fff":"#ffcf55")+'">'+xml(line)+'</text>').join("");
  const domainText=domainLines.map((line,i)=>'<text x="90" y="'+(footerLineY+66+i*26)+'" font-family="Arial,sans-serif" font-size="20" fill="#ffcf55">'+xml(line)+'</text>').join("");
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="'+height+'" viewBox="0 0 1280 '+height+'" role="img" aria-label="Cartão de acesso Pizzaria.on">',
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07172d"/><stop offset="1" stop-color="#123559"/></linearGradient>',
    '<linearGradient id="veil" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#001224" stop-opacity=".05"/><stop offset="1" stop-color="#001224" stop-opacity=".72"/></linearGradient>',
    '<clipPath id="slice"><rect x="845" y="83" width="355" height="'+(height-166)+'" rx="31"/></clipPath></defs>',
    '<rect width="1280" height="'+height+'" rx="40" fill="url(#bg)"/>',
    '<circle cx="490" cy="44" r="300" fill="#234a64" opacity=".16"/>',
    '<circle cx="812" cy="'+height+'" r="350" fill="#e7ad39" opacity=".06"/>',
    '<rect x="65" y="53" width="115" height="97" rx="24" fill="#fff" opacity=".07"/>',
    logo,
    '<text x="198" y="111" font-family="Arial,sans-serif" font-size="45" font-weight="800" fill="#fff">pizzaria<tspan fill="#ffd24f">.on</tspan></text>',
    '<text x="88" y="205" font-family="Arial,sans-serif" font-size="18" letter-spacing="3" font-weight="700" fill="#ffc94a">SEU CARDÁPIO, SUA IDENTIDADE</text>',
    '<text x="88" y="266" font-family="Arial,sans-serif" font-size="53" font-weight="800" fill="#ffffff">Meu acesso</text>',
    nameText,
    '<text x="88" y="'+emailLabelY+'" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="#ffcf55">MEU E-MAIL</text>',
    emailText,
    '<text x="88" y="'+passwordLabelY+'" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="#ffcf55">MINHA SENHA</text>',
    secretText,
    '<text x="88" y="'+noteY+'" font-family="Arial,sans-serif" font-size="17" fill="#bfd1de">'+(data.includePassword?"ATENÇÃO: imagem contém sua senha. Não compartilhe.":"Sua senha está protegida e não aparece nesta imagem.")+'</text>',
    '<rect x="845" y="83" width="355" height="'+(height-166)+'" rx="31" fill="#d57d37"/>',
    '<g clip-path="url(#slice)">'+photo+'<rect x="845" y="83" width="355" height="'+(height-166)+'" fill="url(#veil)"/></g>',
    '<rect x="884" y="'+(height-183)+'" width="261" height="63" rx="31" fill="#ffd24f"/>',
    '<text x="1014" y="'+(height-144)+'" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="22" fill="#0b243e">Feito para pizzarias</text>',
    '<path d="M80 '+footerLineY+'h700" stroke="#ffffff" stroke-opacity=".2"/>',
    '<text x="90" y="'+(footerLineY+31)+'" font-family="Arial,sans-serif" font-size="13" letter-spacing="2" font-weight="700" fill="#aebdcf">ENTRE NO SITE</text>',
    domainText,
    '</svg>'
  ].join("");
}


/** Validate Brazilian mobile WhatsApp numbers without inferring missing DDDs. */
export function normalizeBrazilWhatsApp(value:string):string|null{
 const raw=value.trim();
 if(!/^[+()\d\s.-]{10,27}$/.test(raw))return null;
 const digits=raw.replace(/\D/g,"");
 const local=digits.startsWith("55")&&digits.length===13?digits.slice(2):digits;
 if(!/^[1-9]\d9\d{8}$/.test(local))return null;
 return "55"+local;
}
/** Preserve the exact registered support number, including eight-digit accounts.
 * This checks syntax only; it never infers a missing subscriber digit or ownership.
 */
export function normalizeSupportWhatsApp(value:string):string|null{
 const raw=value.trim();
 if(!/^[+()\d\s.-]{10,27}$/.test(raw))return null;
 const digits=raw.replace(/\D/g,"");
 const local=digits.startsWith("55")&&(digits.length===12||digits.length===13)?digits.slice(2):digits;
 if(!/^[1-9]\d(?:[2-9]\d{7}|9\d{8})$/.test(local))return null;
 return "55"+local;
}
export function formatBrazilWhatsApp(number:string):string|null{
 const full=normalizeSupportWhatsApp(number);
 return full?"+55 ("+full.slice(2,4)+") "+full.slice(4,-4)+"-"+full.slice(-4):null;
}
export function supportWhatsAppLink(number:string,message:string):string|null{
 const full=normalizeSupportWhatsApp(number);
 return full?"https://wa.me/"+full+"?text="+encodeURIComponent(message.slice(0,300)):null;
}

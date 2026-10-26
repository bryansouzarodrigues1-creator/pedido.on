const zone="America/Sao_Paulo";
/** Calendar dates keep their day; instants are displayed in Brasília time. */
export function displayDate(value:string|number|null|undefined,withTime=false,epoch:"milliseconds"|"seconds"="milliseconds",empty="Não informado"){
 if(value===null||value===undefined||value==="")return empty;
 if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const date=new Date(value+"T12:00:00Z");if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return empty;return value.split("-").reverse().join("/");
 }
 // SQLite timestamps without an offset are UTC, never the viewer's timezone.
 const normalized=typeof value==="string"&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)?value.replace(" ","T")+"Z":value;
 if(typeof normalized==="string"){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(normalized))return empty;
  const calendar=normalized.slice(0,10),check=new Date(calendar+"T12:00:00Z");if(!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==calendar)return empty;
 }
 const date=new Date(typeof normalized==="number"&&epoch==="seconds"?normalized*1000:normalized);if(!Number.isFinite(date.getTime()))return empty;
 return new Intl.DateTimeFormat("pt-BR",{timeZone:zone,dateStyle:"short",...(withTime?{timeStyle:"short" as const}:{})}).format(date);
}

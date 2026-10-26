// Public connectivity probe: no sessions, database, customer data or side effects.
export function GET(){return Response.json({ok:true},{headers:{"Cache-Control":"no-store","CDN-Cache-Control":"no-store"}});}

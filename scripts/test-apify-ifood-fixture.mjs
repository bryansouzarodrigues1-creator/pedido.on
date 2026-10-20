// Entirely fictitious restaurant and provider responses. No real scraper call.
export const testToken='apify_api_SYNTHETIC_DO_NOT_USE_20261020';
export const restaurantUrl=(n=1)=>`https://www.ifood.com.br/delivery/cabo-frio-rj/forno-azul-de-teste/f0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const exampleMenu=[
 {id:'synthetic-calabresa',section:'Pizzas tradicionais',name:'Calabresa da Forno Azul',details:'Molho, muçarela, calabresa artesanal e cebola roxa.',price:49.9,originalPrice:null},
 {id:'synthetic-agua',section:'Bebidas',name:'Água mineral sem gás',details:'Garrafa de 500 ml. Entrega R$ 7,00 é cobrada à parte.',price:5.5,originalPrice:null},
 {id:'synthetic-guarana',section:'Bebidas',name:'Guaraná da casa',details:null,price:11.5,originalPrice:null},
];
export function exampleDataset({url=restaurantUrl(),menu=exampleMenu,...patch}={}){
 return [{name:'Forno Azul de Teste',url,uuid:new URL(url).pathname.split('/').at(-1),currency:'BRL',menuRequested:true,menuMode:'limited',menuExtractionStatus:'captured',menuCompletenessStatus:'complete-relative-to-source-response',menuSource:'catalog',menuItemsDiscovered:menu.length,menuItemsReturned:menu.length,menuItemCount:menu.length,menuTruncated:false,menuLimitApplied:null,menu,...patch}];
}

// Synthetic data shaped after official Merchant/Catalog examples, never a real store.
export const merchantId='900caad5-258e-4bf7-9458-353cb0bffe60';
export const storeUrl=`https://www.ifood.com.br/delivery/cabo-frio-rj/forno-azul-de-teste/${merchantId}`;
export const merchant={id:merchantId,name:'Forno Azul de Teste',address:{street:'Rua do Forno Azul',number:'240',district:'Bairro de Teste',city:'Cabo Frio',state:'RJ',country:'BR'},telephone:'(22) 99999-0147'};
export const hours=[{shifts:['TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(dayOfWeek=>({dayOfWeek,start:'18:00:00',duration:390}))}];
export function pizza(){return {
 item:{id:'pizza-test',type:'PIZZA',status:'AVAILABLE'},
 products:[{id:'root',name:'Pizza artesanal',optionGroups:[{id:'size',min:1,max:1},{id:'crust',min:1,max:1},{id:'edge',min:0,max:1},{id:'topping',min:1,max:1}]},
  {id:'size-p',name:'Pequena'},{id:'size-m',name:'Média'},{id:'size-g',name:'Grande'},
  {id:'crust-free',name:'Tradicional'},{id:'edge-free',name:'Sem borda'},
  {id:'calabresa',name:'Calabresa de Teste',description:'Molho, muçarela, calabresa e cebola.'},{id:'marguerita',name:'Marguerita de Teste',description:'Tomate, muçarela e manjericão.'}],
 optionGroups:[['size','SIZE',['p','m','g']],['crust','CRUST',['crust-free']],['edge','EDGE',['edge-free']],['topping','TOPPING',['calabresa','marguerita']]].map(([id,optionGroupType,optionIds])=>({id,name:id,status:'AVAILABLE',optionGroupType,optionIds})),
 options:[{id:'p',productId:'size-p',status:'AVAILABLE',price:{value:25},fractions:[1,2]},{id:'m',productId:'size-m',status:'AVAILABLE',price:{value:32},fractions:[1,2]},{id:'g',productId:'size-g',status:'AVAILABLE',price:{value:42},fractions:[1,2]},
  ...['crust-free','edge-free','calabresa','marguerita'].map(id=>({id,productId:id,status:'AVAILABLE',price:{value:id==='marguerita'?2:0}}))]
};}
export function categories(){return [{id:'pizzas',name:'Pizzas salgadas',status:'AVAILABLE',items:[pizza()]},{id:'drinks',name:'Bebidas',status:'AVAILABLE',items:[{item:{id:'water',type:'DEFAULT',status:'AVAILABLE',price:{value:8.9}},products:[{id:'water-product',name:'Água mineral',description:'500 ml'}],optionGroups:[],options:[]}]}];}
export function officialTransport(log=[],mode={}){return async (url,options={})=>{
 const path=new URL(url).pathname+new URL(url).search;log.push({url,options});
 if(path.endsWith('/oauth/userCode'))return Response.json({userCode:'HJLX-LPSQ',authorizationCodeVerifier:'private-test-verifier',verificationUrlComplete:'https://portal.ifood.com.br/apps/code?c=HJLX-LPSQ',expiresIn:600});
 if(path.endsWith('/oauth/token'))return mode.badCode?Response.json({private:'must not leak'},{status:401}):Response.json({accessToken:'private.access.token',type:'bearer',expiresIn:3600,refreshToken:'private-refresh-token'});
 if(path===`/merchant/v1.0/merchants/${merchantId}`)return Response.json(mode.wrongMerchant?{...merchant,id:'c3fad304-a342-4898-a12b-80919ae3f599'}:merchant);
 if(path.endsWith('/opening-hours'))return mode.noHours?Response.json({}, {status:503}):Response.json(hours);
 if(path.endsWith('/catalogs'))return Response.json([{catalogId:'catalog-test',status:'AVAILABLE',context:['DEFAULT']}]);
 if(path.includes('/categories?'))return mode.noCatalog?Response.json({}, {status:403}):Response.json(categories());
 throw Error('Unexpected provider URL: '+url);
};}

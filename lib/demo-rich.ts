import {demoRestaurant,type Product,type RestaurantData,type ThemeId} from "./domain.ts";

/** Only demo routes use these fictional items: never used as a restaurant's created menu. */
const pizza=(id:string,name:string,description:string,p:number,m:number,g:number):Product=>
 ({id,categoryId:"pizzas",name,description,image:"",kind:"pizza",price:0,sizes:{p,m,g},enabled:true,featured:false});
const sweet=(id:string,name:string,description:string,p:number,m:number,g:number):Product=>
 ({id,categoryId:"doces",name,description,image:"",kind:"pizza",price:0,sizes:{p,m,g},enabled:true,featured:false});
const drink=(id:string,name:string,description:string,price:number):Product=>
 ({id,categoryId:"bebidas",name,description,image:"",kind:"simple",price,sizes:{p:0,m:0,g:0},enabled:true,featured:false});
const combo=(id:string,name:string,description:string,price:number):Product=>
 ({id,categoryId:"combos",name,description,image:"",kind:"simple",price,sizes:{p:0,m:0,g:0},enabled:true,featured:false});

/**
 * A substantial test menu for the 12 live demo routes. Uses fictional prices and products.
 * Deliberately avoids injecting these items into account creation, OCR, or persisted D1 data.
 */
export function detailedDemoRestaurant(theme:ThemeId="editorial"):RestaurantData{
 const data=demoRestaurant(theme);
 const pizzaItems=[
  ...data.products.filter(p=>p.categoryId==="pizzas"),
  pizza("demo-frango-catupiry","Frango com Catupiry","Frango desfiado temperado, Catupiry cremoso e finalização com orégano.",3700,5200,6500),
  pizza("demo-portuguesa","Portuguesa da casa","Presunto, ovos, cebola, azeitonas, mozzarella e molho artesanal.",3800,5400,6800),
  pizza("demo-pepperoni","Pepperoni especial","Pepperoni levemente picante, mozzarella e molho de tomate rústico.",4000,5600,7200),
  pizza("demo-vegetariana","Horta & forno","Abobrinha, tomate confit, cebola roxa, mozzarella e manjericão.",3600,5000,6400),
  pizza("demo-bacon","Bacon crocante","Bacon dourado, queijo derretido, cebola caramelizada e toque de páprica.",3900,5500,7000),
 ];
 const sweetItems=[
  ...data.products.filter(p=>p.categoryId==="doces"),
  sweet("demo-banana-canela","Banana com canela","Banana, doce de leite e canela com borda douradinha.",3100,4400,5600),
  sweet("demo-prestigio","Prestígio","Chocolate ao leite e coco em uma combinação cremosa.",3500,4800,6000),
 ];
 const drinks=[
  ...data.products.filter(p=>p.categoryId==="bebidas"),
  drink("demo-guarana-lata","Guaraná lata 350 ml","Gelado para acompanhar qualquer sabor.",700),
  drink("demo-agua","Água mineral 500 ml","Sem gás, gelada.",500),
  drink("demo-suco-uva","Suco de uva 1 L","Opção refrescante para compartilhar.",1700),
 ];
 const combos=[
  ...data.products.filter(p=>p.categoryId==="combos"),
  combo("demo-combo-dupla","Dupla da noite","Duas pizzas médias tradicionais e refrigerante de 2 L. Composição ilustrativa.",9900),
  combo("demo-combo-casal","Jantar a dois","Uma pizza grande e uma bebida de 1 L. Composição ilustrativa.",7400),
 ];
 return {...data,name:"Sua pizzaria",products:[...pizzaItems,...sweetItems,...drinks,...combos]};
}

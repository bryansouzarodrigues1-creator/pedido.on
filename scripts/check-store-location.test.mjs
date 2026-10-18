import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {storeLocation} from "../lib/store-location.ts";

test("formatted store address is visible and opens a Google Maps search",()=>{
 const place=storeLocation(" Rua das Pizzas, 123 "," Búzios, RJ ");
 assert.deepEqual(place,{
  label:"Rua das Pizzas, 123 · Búzios, RJ",
  mapUrl:"https://www.google.com/maps/search/?api=1&query=Rua%20das%20Pizzas%2C%20123%2C%20B%C3%BAzios%2C%20RJ"
 });
 const url=new URL(place.mapUrl);
 assert.equal(url.origin,"https://www.google.com");
 assert.equal(url.pathname,"/maps/search/");
 assert.equal(url.searchParams.get("query"),"Rua das Pizzas, 123, Búzios, RJ");
});
test("missing address hides link; never guess precise store location from city",()=>{
 assert.equal(storeLocation("  ","Búzios, RJ"),null);
 assert.equal(storeLocation("",""),null);
 assert.deepEqual(storeLocation("Av. Brasil, 10",""),{
  label:"Av. Brasil, 10",
  mapUrl:"https://www.google.com/maps/search/?api=1&query=Av.%20Brasil%2C%2010"
 });
});
test("external map link cannot be turned into a redirect by address input",()=>{
 const place=storeLocation("Rua 9?foo=bar&next=https://evil.example","#Bairro");
 assert.ok(place);
 const url=new URL(place.mapUrl);
 assert.equal(url.origin,"https://www.google.com");
 assert.equal(url.searchParams.get("api"),"1");
 assert.equal(url.searchParams.get("query"),"Rua 9?foo=bar&next=https://evil.example, #Bairro");
 assert.equal(url.searchParams.has("next"),false);
});
test("menu renders public store address before catalog, never delivery address",()=>{
 const source=readFileSync(new URL("../components/menu.tsx",import.meta.url),"utf8");
 assert.ok(source.includes('className="menu-store-location"'));
 assert.ok(source.includes('location=storeLocation(data.address,data.city)'));
 assert.ok(source.indexOf('className="menu-store-location"')<source.indexOf('id="cardapio"'));
 assert.ok(source.includes('rel="noopener noreferrer"'));
});

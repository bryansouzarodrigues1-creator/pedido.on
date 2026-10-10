import {z} from "zod";
const price=z.number().int().min(0).max(1000000).nullable();
export const importedItem=z.object({name:z.string().trim().min(2).max(100),category:z.string().trim().min(2).max(60),description:z.string().trim().max(600),kind:z.enum(["pizza","simple"]),price, sizes:z.object({p:price,m:price,g:price})});
export const importedMenu=z.object({items:z.array(importedItem).min(1).max(35),notes:z.string().max(600)});
export type ImportedItem=z.infer<typeof importedItem>;
export const menuOutputSchema={
 type:"object",additionalProperties:false,required:["items","notes"],
 properties:{
  notes:{type:"string"},
  items:{type:"array",maxItems:35,items:{
   type:"object",additionalProperties:false,required:["name","category","description","kind","price","sizes"],
   properties:{
    name:{type:"string"},category:{type:"string"},description:{type:"string"},kind:{type:"string",enum:["pizza","simple"]},price:{type:["integer","null"]},
    sizes:{type:"object",additionalProperties:false,required:["p","m","g"],properties:{p:{type:["integer","null"]},m:{type:["integer","null"]},g:{type:["integer","null"]}}}
   }
  }}
 }
};

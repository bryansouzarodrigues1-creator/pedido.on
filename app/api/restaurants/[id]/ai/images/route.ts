import {ownedRestaurant} from "@/lib/server";
import {sameOrigin,readJson,errorResponse,privateHeaders} from "@/lib/http";
import {imageInput} from "@/lib/image-policy";
import {restaurantSchema} from "@/lib/domain";
import {studioConfig} from "@/lib/studio";
import {HttpError} from "@/lib/http";
import {generateImage,imageAllowance} from "@/lib/ai-images";
import {promotionVersion} from "@/lib/promotion-art";
import {isActivePromotion} from "@/lib/promotions";
import {assistantAnswer} from "@/lib/assistant-help";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){try{const {id}=await params,row=await ownedRestaurant(id);return Response.json(await imageAllowance(row.ownerId),{headers:privateHeaders});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:Context){try{sameOrigin(request);const {id}=await params,row=await ownedRestaurant(id),input=imageInput.parse(await readJson(request,12000)),data=restaurantSchema.parse(JSON.parse(row.data));const guide=assistantAnswer(input.description);if(guide?.kind==="guide")throw new HttpError(422,"Use a ajuda local do Estúdio. Para importar, abra o leitor do cardápio e envie prints ou texto com preços. Nenhuma imagem de IA foi usada.");let product:{name:string;description:string}|undefined=input.asset==="product"?data.products.find(p=>p.id===input.productId):undefined;if(input.asset==="product"&&!product)throw new HttpError(400,"Escolha um produto desta pizzaria.");if(input.asset==="product"&&!studioConfig().enabled)throw new HttpError(503,"As fotos de produtos aguardam a ativação da IA do estúdio.");if(input.asset==="promotion"){
 const p=data.promotions.find(p=>p.id===input.promotionId),live=row.publishedData?restaurantSchema.parse(JSON.parse(row.publishedData)):null,publicOffer=live?.promotions.find(p=>p.id===input.promotionId);
 if(!p||!row.published||!live||!publicOffer||!isActivePromotion(live,publicOffer)||promotionVersion(data,p)!==input.promotionVersion||promotionVersion(live,publicOffer)!==input.promotionVersion)throw new HttpError(409,"A promoção mudou ou ainda não foi publicada. Atualize o cardápio antes de gerar a arte.");
 const ids=p.kind==="bundle"?p.items.map(item=>item.productId):[p.productId];
 product={name:p.kind==="bundle"?p.name:data.products.find(item=>item.id===p.productId)!.name,description:ids.map(id=>{const product=data.products.find(item=>item.id===id)!;return product.name+": "+product.description;}).join("; ").slice(0,600)};
 }
 return Response.json(await generateImage(row.ownerId,id,data.name,input,product),{headers:privateHeaders});}catch(e){return errorResponse(e);}}

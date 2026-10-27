/** Stable IDs keep existing Asaas invoices and subscriptions compatible. */
export const planCatalog={
 essencial:{name:"Pro",amount:4900,limit:1,images:20,texts:1000000,aiCredits:80,description:"Seu cardápio pronto para receber pedidos.",features:["Cardápio, pedidos e Pix direto","Meio a meio, bordas e combos","Importação de fotos do cardápio","Divulgação ilimitada: textos e artes para suas redes","Até 20 novas imagens com IA por semana"]},
 profissional:{name:"Pro",amount:8900,limit:1,images:30,texts:200,aiCredits:200,description:"Mais imagens para manter sua pizzaria em destaque.",features:["Tudo do Essencial","30 imagens e 200 textos com IA por mês","Artes de promoção para divulgar","Logo, capa e fotos na mesma franquia"]},
 rede:{name:"Divulgação",amount:14900,limit:1,images:60,texts:400,aiCredits:400,description:"Para criar e divulgar com mais frequência.",features:["Tudo do Pro","60 imagens e 400 textos com IA por mês","Mais espaço para novas campanhas","Artes em formato quadrado e vertical"]},
} as const;
export type CatalogPlan=keyof typeof planCatalog;
export const trialAi={images:7,texts:100};
export const planIds=Object.keys(planCatalog) as CatalogPlan[];
/** Only R$49 is offered to new customers for the first commercial beta.
 * Keep historical plan IDs/prices for old invoices, cancellation and refunds.
 */
export const publicPlanIds=["essencial"] as const;
export const publicPlanCatalog={essencial:planCatalog.essencial};
export const publicPlanName="Pro";
export function isPublicPlan(value:unknown):value is "essencial"{return value==="essencial";}

export const aiCostUnits={image:168750,text:2500}; // 1 credit = 1,000,000 units; reference + 25% reserve.
export const aiBetaBudgetUnits=20000000;

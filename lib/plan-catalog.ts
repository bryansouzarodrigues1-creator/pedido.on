/** Stable IDs keep existing Asaas invoices and subscriptions compatible. */
export const planCatalog={
 essencial:{name:"Essencial",amount:4900,limit:1,images:3,texts:1000000,aiCredits:80,description:"Seu cardápio bonito e organizado, pronto para vender.",features:["Cardápio, pedidos e Pix direto","Meio a meio, bordas e combos","Importação de fotos do cardápio","Divulgação ilimitada: textos e artes com seus produtos","Até 3 novas imagens com IA por dia, com legenda"]},
 profissional:{name:"Pro",amount:8900,limit:1,images:null,texts:1000000,aiCredits:200,description:"Sua loja com um assistente para ajudar cada cliente.",features:["Tudo do Essencial","Atendente de IA no seu cardápio","Respostas sobre sabores, horários, entrega e pagamento","Perguntas frequentes e histórico para o dono","Imagens e textos sem cota mensal fixa, sujeitos a uso justo"]},
 rede:{name:"Divulgação",amount:14900,limit:1,images:60,texts:400,aiCredits:400,description:"Para criar e divulgar com mais frequência.",features:["Tudo do Pro","60 imagens e 400 textos com IA por mês","Mais espaço para novas campanhas","Artes em formato quadrado e vertical"]},
} as const;
export type CatalogPlan=keyof typeof planCatalog;
export const trialAi={images:7,texts:100};
export const planIds=Object.keys(planCatalog) as CatalogPlan[];
/** Preserve invoice IDs and the legacy Divulgação plan; offer only these two. */
export const publicPlanIds=["essencial","profissional"] as const;
export type PublicPlan=typeof publicPlanIds[number];
export const publicPlanCatalog={essencial:planCatalog.essencial,profissional:planCatalog.profissional};
export const publicPlanName="Essencial";
export function isPublicPlan(value:unknown):value is PublicPlan{return value==="essencial"||value==="profissional";}

export const aiCostUnits={image:168750,text:2500}; // 1 credit = 1,000,000 units; reference + 25% reserve.
export const aiBetaBudgetUnits=20000000;

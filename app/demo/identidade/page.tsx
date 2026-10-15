import {Brand} from "@/components/ui";
import BrandStudio from "@/components/brand-studio";
import {defaultRestaurant} from "@/lib/domain";
export const metadata={title:"Crie a identidade da sua pizzaria · pizzaria.on",description:"Personalize logo, capa, cores e cardápio. Veja o conjunto e baixe suas imagens."};
export default function Page(){return <div className="identity-demo-page"><header className="account-nav container"><Brand/><a href="/app" className="btn outline small">Meu painel</a></header><main className="container"><BrandStudio data={defaultRestaurant("Bella Massa")} demo/></main><footer className="identity-demo-footer container"><p>Identidade pronta? Agora coloque seus sabores e preços.</p><a href="/cadastro?next=%2Fapp%3Fnew%3D1" className="btn primary">Montar meu cardápio</a></footer></div>;}

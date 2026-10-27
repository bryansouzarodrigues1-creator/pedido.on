import IdeaStart from "@/components/idea-start";
import AccountNavigation from "@/components/account-navigation";
import type {Metadata} from "next";
export const metadata:Metadata={title:"Crie seu cardápio com IA — pizzaria.on",description:"Descreva sua pizzaria, envie seu cardápio e escolha entre modelos profissionais sem criar uma conta."};
export default function CriarPage(){return <main className="ai-creation-page"><header className="ai-creation-nav"><div className="saas-container"><AccountNavigation guestLabel="Já tenho conta"/></div></header><IdeaStart/></main>;}

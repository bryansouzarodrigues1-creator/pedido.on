import type {Metadata} from "next";
import ProfitCalculator from "@/components/profit-calculator";
export const metadata:Metadata={title:"Calculadora de preço e lucro para pizzarias | pizzaria.on",description:"Calcule custo, preço e lucro por sabor em uma tabela. Projete também o resultado do mês e o ponto de equilíbrio. Grátis, sem cadastro e com cálculos salvos no navegador."};
export default function CalculatorPage(){return <ProfitCalculator/>;}

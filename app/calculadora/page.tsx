import type {Metadata} from "next";
import ProfitCalculator from "@/components/profit-calculator";
export const metadata:Metadata={title:"Calculadora de preço e lucro para pizzarias | pizzaria.on",description:"Calcule o preço da pizza, quanto sobra no mês e o ponto de equilíbrio com seus custos prontos. Grátis, sem cadastro e com cálculos salvos no navegador."};
export default function CalculatorPage(){return <ProfitCalculator/>;}

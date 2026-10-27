import { money } from "@/lib/domain";

export default function PriceExplanation({ cost, price, extras = 0, fees = 0, fixed = 0 }: { cost: number; price: number; extras?: number; fees?: number; fixed?: number }) {
  const remaining = price - cost - extras - fees - fixed;
  return <div className="price-explanation">
    <p><strong>O que essa conta quer dizer?</strong></p>
    <p>Na venda de {money(price)}, {money(cost)} pagam o custo que você informou. Esse custo representa {(cost / price * 100).toFixed(1).replace(".", ",")}% do preço.</p>
    <p>{remaining < 0 ? <>Faltam <strong>{money(-remaining)}</strong> por pizza para cobrir os gastos informados.</> : <>Sobram <strong>{money(remaining)}</strong> por pizza {extras || fees || fixed ? "depois dos gastos informados" : "antes dos outros gastos"}.</>} Isso ainda não garante lucro líquido.</p>
    <details><summary>O que ainda preciso descontar?</summary><p>Inclua embalagem, entrega paga pela pizzaria, taxas, impostos e a parcela das contas fixas que faltarem nesta conta. Some cada gasto uma vez. O valor da entrega cobrado do cliente pode ser diferente do custo do entregador.</p><p>CMV é o custo dos produtos que você vendeu. Para acompanhá-lo como percentual, compare esse custo com o valor vendido. Separe ingredientes dos demais gastos nesta análise. Ter 50% do preço sobrando antes das contas não significa ter 50% de lucro líquido.</p></details>
  </div>;
}

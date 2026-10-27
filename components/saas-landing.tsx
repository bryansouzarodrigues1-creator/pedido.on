import PwaSetup from "./pwa-setup";
import IdeaStart from "./idea-start";
import AccountNavigation from "./account-navigation";
/** Visitors arrive from a shared menu: the creator itself is the entire first experience. */
export default function SaasLanding(){
 return <div className="pizza-home pizza-home-creator">
  <header className="pizza-home-header"><div className="saas-container"><AccountNavigation/></div></header>
  <div id="pwa-install-top" className="saas-container"/><main><IdeaStart/><section className="digital-menu-benefits saas-container" aria-label="Por que ter um cardápio digital"><h2>Um cardápio que ajuda no atendimento.</h2><div><article><h3>Mostre o que você vende</h3><p>Sabores, fotos e preços no mesmo link. Atualize o cardápio e compartilhe no WhatsApp e no Instagram.</p></article><article><h3>Receba o pedido organizado</h3><p>O cliente escolhe tamanhos, quantidades e observações. Receba pelo WhatsApp ou pelo painel após verificar sua loja.</p></article><article><h3>Cuide do que sobra por pizza</h3><p>Use a calculadora gratuita para conferir custos e preço antes de colocar o sabor no cardápio.</p></article></div><a className="btn outline" href="/demo/editorial">Ver um cardápio funcionando</a></section></main><footer id="pwa-install-footer" className="saas-container"/><PwaSetup/>
 </div>;
}

import PwaSetup from "./pwa-setup";
import IdeaStart from "./idea-start";
import {Brand} from "./ui";
/** Visitors arrive from a shared menu: the creator itself is the entire first experience. */
export default function SaasLanding(){
 return <div className="pizza-home pizza-home-creator">
  <header className="pizza-home-header"><div className="saas-container"><Brand/><nav aria-label="Acesso"><a href="/entrar">Entrar</a></nav></div></header>
  <div id="pwa-install-top" className="saas-container"/><main><IdeaStart/></main><footer id="pwa-install-footer" className="saas-container"/><PwaSetup/>
 </div>;
}

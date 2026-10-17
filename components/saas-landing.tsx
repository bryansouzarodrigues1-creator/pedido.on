import IdeaStart from "./idea-start";
import {Brand} from "./ui";
/** Visitors arrive from a shared menu: the creator itself is the entire first experience. */
export default function SaasLanding(){
 return <div className="pizza-home pizza-home-creator">
  <header className="pizza-home-header"><div className="saas-container"><Brand/><nav aria-label="Acesso"><a href="/entrar">Entrar</a></nav></div></header>
  <main><IdeaStart/></main>
 </div>;
}

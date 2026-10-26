import NoticeCenter from "./notice-center";
const links=[['/admin','Visão geral'],['/admin/clientes','Clientes e pizzarias'],['/admin/importacoes','Importações'],['/admin/cardapios','Cardápios compartilhados'],['/admin/cardapios/novo','Criar cardápio']] as const;
export default function AdminNav({active}:{active:string}){return <div className="admin-nav-wrap"><nav className="admin-workspace-nav" aria-label="Seções da administração">{links.map(([href,label])=><a key={href} href={href} aria-current={active===href?'page':undefined}>{label}</a>)}</nav><NoticeCenter/></div>;}

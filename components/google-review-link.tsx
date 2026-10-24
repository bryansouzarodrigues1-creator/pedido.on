import {ArrowUpRight} from "lucide-react";
import {googleReviewLink} from "@/lib/google-reviews";

export default function GoogleReviewLink({url,className="",label="Avaliar no Google"}:{url:unknown;className?:string;label?:string}){
 const href=googleReviewLink(url);
 if(!href)return null;
 return <a className={`google-review-link ${className}`.trim()} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><img src="/assets/google-g.png" alt="" width={20} height={20}/><span>{label}</span><ArrowUpRight size={16} aria-hidden="true"/></a>;
}

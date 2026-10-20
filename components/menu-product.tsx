import {Plus,Pizza,ArrowUpRight} from "lucide-react";
import {money,type Product,type RestaurantData} from "@/lib/domain";
import {lowestProductPrice} from "@/lib/promotions";
import {menuPresentation} from "@/lib/menu-design";

export default function MenuProduct({product,data,onChoose}:{product:Product;data:RestaurantData;onChoose:()=>void}){
 const {layout}=menuPresentation(data);
 const price=<span className="menu-product-price">{product.kind==="pizza"&&<small>A partir de </small>}<b>{money(lowestProductPrice(data,product))}</b></span>;
 const photo=product.image?<img src={product.image} alt="" loading="lazy"/>:<span className="menu-product-placeholder"><Pizza size={layout==="poster"?48:30}/></span>;
 if(layout==="compact")return <button className="menu-product menu-product-compact" onClick={onChoose} disabled={!data.isOpen}>{product.image&&<span className="menu-product-photo">{photo}</span>}<span className="menu-product-copy"><h3>{product.name}</h3>{product.description&&<p>{product.description}</p>}</span>{price}<span className="menu-product-add"><Plus size={18}/></span></button>;
 if(layout==="list")return <button className="menu-product menu-product-list" onClick={onChoose} disabled={!data.isOpen}>{product.image&&<span className="menu-product-photo">{photo}</span>}<span className="menu-product-copy"><h3>{product.name}</h3>{product.description&&<p>{product.description}</p>}</span><span className="menu-product-order">{price}<span className="menu-product-add"><ArrowUpRight size={18}/></span></span></button>;
 if(layout==="poster")return <button className={"menu-product menu-product-poster"+(!product.image?" without-photo":"")} onClick={onChoose} disabled={!data.isOpen}>{product.image&&<span className="menu-product-photo">{photo}{product.featured&&<span className="menu-product-badge">Escolha da casa</span>}</span>}<span className="menu-product-copy"><h3>{product.name}</h3>{product.description&&<p>{product.description}</p>}<span className="menu-product-order">{price}<span className="menu-product-add"><Plus size={18}/></span></span></span></button>;
 return <button className="product-card" onClick={onChoose} disabled={!data.isOpen}><div className="product-card-copy"><h3>{product.name}</h3>{product.description&&<p>{product.description}</p>}<b>{product.kind==="pizza"&&<small>A partir de </small>}{money(lowestProductPrice(data,product))}</b></div><div className="product-card-image">{photo}<span className="add-circle"><Plus size={17}/></span></div></button>;
}

// The print dialog does not prove that paper or a PDF was produced.
(() => {
 const button=document.getElementById("print-button"),message=document.getElementById("print-message");
 if(!button||!message)return;
 if(new URL(location.href).searchParams.has("updated"))message.textContent="O pedido foi atualizado. Confira esta nova via antes de imprimir.";
 button.addEventListener("click",async()=>{
  if(button.disabled)return;button.disabled=true;message.textContent="Conferindo a situação atual do pedido…";
  try{
   const url=new URL(location.href);url.searchParams.set("format","json");
   const response=await fetch(url,{cache:"no-store",credentials:"same-origin"});let body;try{body=await response.json();}catch{throw Error("Não foi possível conferir o pedido. Atualize a página antes de imprimir.");}
   if(!response.ok)throw Error(body.error||"O pedido não está disponível para impressão.");
   if(String(body.version)!==document.body.dataset.orderVersion){const fresh=new URL(location.href);fresh.searchParams.set("updated","1");location.replace(fresh);return;}
   if(typeof window.print!=="function")throw Error("Abra esta página no navegador para imprimir ou salvar como PDF.");
   message.textContent="Situação conferida. A impressão será aberta no navegador.";window.print();
  }catch(error){message.textContent=error instanceof Error?error.message:"Confira a conexão e tente novamente.";}
  finally{button.disabled=false;}
 });
})();

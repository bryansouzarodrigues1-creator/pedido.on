// Fictitious static examples only. Never reads orders, sessions or a payment provider.
(() => {
 const button=document.getElementById("print-button"),message=document.getElementById("print-message");
 if(!button||!message)return;
 button.addEventListener("click",()=>{
  if(button.disabled)return;
  if(typeof window.print!=="function"){message.textContent="Abra este exemplo no navegador para imprimir ou salvar como PDF.";return;}
  button.disabled=true;
  try{message.textContent="Impressão do exemplo fictício. Nenhum pedido ou pagamento real.";window.print();}
  catch{message.textContent="Use a opção Imprimir do navegador para salvar este exemplo como PDF.";}
  finally{button.disabled=false;}
 });
})();

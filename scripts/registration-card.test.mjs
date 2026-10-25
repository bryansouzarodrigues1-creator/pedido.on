import test from "node:test";
import assert from "node:assert/strict";
import {buildRegistrationCardSvg} from "../lib/registration-card-svg.ts";

const sample={
  name:"Pizzaria da Ana",
  email:"ana@example.com",
  password:"SenhaDeTeste!2026&<privada>",
  domain:"minha-pizzaria.exemplo",
  includePassword:false
};

test("o SVG inclui a marca, e-mail e domínio correto",()=>{
  const svg=buildRegistrationCardSvg(sample);
  assert.match(svg,/pizzaria/);
  assert.match(svg,/ana@example.com/);
  assert.match(svg,/minha-pizzaria.exemplo/);
  assert.match(svg,/MEU E-MAIL/);
  assert.match(svg,/MINHA SENHA/);
});

test("nunca exporta a senha quando não há consentimento",()=>{
  const svg=buildRegistrationCardSvg(sample);
  assert.ok(!svg.includes(sample.password));
  assert.ok(!svg.includes("SenhaDeTeste"));
  assert.match(svg,/Sua senha está protegida/);
});

test("a exportação explícita inclui senha, com XML seguro",()=>{
  const svg=buildRegistrationCardSvg({...sample,includePassword:true});
  assert.match(svg,/SenhaDeTeste!2026&amp;&lt;privada&gt;/);
  assert.ok(!svg.includes(sample.password));
  assert.match(svg,/ATENÇÃO: imagem contém sua senha/);
});

test("dados livres são tratados como texto, sem elementos HTML/SVG injetados",()=>{
  const svg=buildRegistrationCardSvg({...sample,email:'<script>alert("oi")</script>@exemplo.com',name:"João & Ana"});
  assert.ok(!svg.includes("<script>"));
  assert.match(svg,/&lt;script&gt;/);
  assert.match(svg,/João &amp; Ana/);
});

test("texto comprido aumenta altura sem cortar a senha",()=>{
  const password="X".repeat(128);
  const svg=buildRegistrationCardSvg({...sample,password,email:"e".repeat(254),includePassword:true});
  assert.match(svg,/height="[0-9]+"/);
  assert.equal((svg.match(/X{28}/g)||[]).length,4);
  assert.match(svg,/X{16}/);
  assert.ok(Number(svg.match(/height="(\d+)"/)[1])>810);
});

test("nome e e-mail extensos são distribuídos sem desaparecimento de dados",()=>{
  const name="Proprietário ".repeat(8),email="w".repeat(60)+"@"+"loja.".repeat(35)+"com";
  const svg=buildRegistrationCardSvg({...sample,name,email,includePassword:false});
  assert.ok((svg.match(/Conta de /g)||[]).length===1);
  assert.ok((svg.match(/fill="#bbcbda"/g)||[]).length>=2);
  assert.ok((svg.match(/fill="#ffffff"/g)||[]).length>3);
  assert.ok(!svg.includes(sample.password));
  assert.match(svg,/MEU E-MAIL/);
});

test("nunca transforma uma URL maliciosa de imagem em elemento SVG",()=>{
  const svg=buildRegistrationCardSvg({...sample,pizzaDataUrl:'data:image/png" onload="alert(1)',logoDataUrl:'data:image/svg+xml;base64,PHN2Zz4='});
  assert.ok(!svg.includes('onload='));
  assert.ok(!svg.includes('data:image/svg+xml'));
  assert.ok(!svg.includes('<script>'));
});

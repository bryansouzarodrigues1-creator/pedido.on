import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedImage,creationTarget} from '../lib/creation-intent.ts';

test('the exact mobile logo requests select image generation before any text request',()=>{
 for(const message of ['Gere uma logo real','Gere uma logo real com cores vibrantes e um desing que vai fazer lembrar']){
  assert.equal(requestedImage(message).asset,'logo');
  assert.deepEqual(creationTarget('visual',message,'ai'),{target:'logo',intent:{asset:'logo',label:'logo'},needsChoice:false});
 }
});

test('explicit cover, profile and product requests preserve their image destination',()=>{
 for(const [message,asset] of [
  ['Crie uma capa com uma pizza saindo do forno','cover'],
  ['Quero um banner vibrante para o cardápio','cover'],
  ['Faça uma imagem de perfil da pizzaria','profile'],
  ['Gere uma foto do produto sem texto e sem logo','product'],
  ['Gere uma foto de uma pizza margherita, sem logo','product'],
  ['LOGOTIPO novo com forno a lenha','logo'],
 ])assert.equal(requestedImage(message)?.asset,asset,message);
 // A deliberate selection is authoritative even if its brief refers to another asset.
 assert.equal(creationTarget('cover','Uma capa com a logo da pizzaria no canto','ai').target,'cover');
});

test('visual and writing requests mentioning existing logos remain text requests',()=>{
 for(const message of [
  'Quero um cardápio escuro com a logo atual.',
  'Gere um prompt para uma logo.',
  'Crie uma descrição de uma foto de pizza.',
  'Não gere uma logo, mude só a cor.',
  'Não quero uma imagem, quero um slogan.',
  'Logo depois podemos trocar o visual.',
  'Melhore os textos e a apresentação da pizzaria.',
 ])assert.equal(requestedImage(message),null,message);
});

test('ambiguous images and local styles require an explicit choice instead of spending on text',()=>{
 for(const message of ['Gere uma imagem profissional','Quero um logo e uma capa para a pizzaria']){
  assert.equal(requestedImage(message).asset,null,message);
  assert.equal(creationTarget('visual',message,'ai').needsChoice,true,message);
 }
 assert.equal(creationTarget('visual','Gere uma logo real','local').needsChoice,true);
});

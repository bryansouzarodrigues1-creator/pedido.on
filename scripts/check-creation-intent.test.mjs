import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedImage,creationTarget,defaultCreationTarget} from '../lib/creation-intent.ts';
import {creationRequest} from '../lib/creation-request.ts';
import {demoRestaurant} from '../lib/domain.ts';

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

test('the actual cheese pizza request starts a real image with its literal prompt, without a text pass',()=>{
 const message='Gere algo marcante de pizza de queijo';
 assert.equal(defaultCreationTarget,'image');
 const request=creationRequest(defaultCreationTarget,message,'ai',demoRestaurant(),crypto.randomUUID());
 assert.equal(request.path,'ai/images');assert.equal(request.target,'cover');
 assert.equal(request.body.description,message);assert.equal(request.body.asset,'cover');
 assert.equal('snapshot' in request.body,false);assert.equal('message' in request.body,false);
 assert.equal(creationTarget('visual',message,'ai').needsChoice,true);
 assert.throws(()=>creationRequest('visual',message,'ai',demoRestaurant(),crypto.randomUUID()));
});

test('image is the default even when the brief omits image keywords; writing remains an explicit destination',()=>{
 for(const message of ['Gere algo marcante','Queijo derretido, forno a lenha e cores vibrantes','Quero uma arte para minha pizzaria']){
  assert.equal(creationRequest(defaultCreationTarget,message,'ai',demoRestaurant(),crypto.randomUUID()).path,'ai/images');
 }
 assert.equal(creationRequest('image','Gere uma logo real','ai',demoRestaurant(),crypto.randomUUID()).target,'logo');
 assert.equal(creationRequest('visual','Crie uma descrição curta de pizza de queijo','ai',demoRestaurant(),crypto.randomUUID()).path,'studio');
 assert.equal(creationRequest('visual','Quero um cardápio escuro e vermelho','local',demoRestaurant(),crypto.randomUUID()).path,'studio');
});

test('a product image retains its literal brief and requires a product from the current shop',()=>{
 const message='Gere uma foto de pizza de queijo sem texto';const data=demoRestaurant();
 assert.throws(()=>creationRequest('image',message,'ai',data,crypto.randomUUID()));
 assert.throws(()=>creationRequest('image',message,'ai',data,crypto.randomUUID(),'other-shop'));
 const request=creationRequest('image',message,'ai',data,crypto.randomUUID(),'margherita');
 assert.equal(request.path,'ai/images');assert.equal(request.target,'product');
 assert.equal(request.body.description,message);assert.equal(request.body.productId,'margherita');
});

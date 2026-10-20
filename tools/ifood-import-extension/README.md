# Pizzaria.on — extensão experimental de importação assistida

**PDF, fotos e texto no celular continuam como caminho principal.** Esta extensão é uma alternativa opcional para o dono que abre o iFood no computador.

## Instalar (Chrome, Edge ou Brave no PC)

1. Baixe a pasta tools/ifood-import-extension do repositório (ou extraia o ZIP beta).
2. Abra chrome://extensions, edge://extensions ou brave://extensions.
3. Ative **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
4. Selecione a pasta que contém manifest.json.
5. Abra o cardápio da sua loja no iFood e role a página para carregar os produtos.
6. Clique na extensão e em **Ler cardápio desta aba**.
7. Confira nomes e valores. Copie para o Pizzaria.on, ou baixe o TXT para importar no site.
8. Revise preços, descrição, categoria, tamanhos das pizzas e fotos antes da publicação.

## Escopo e limites

- Apenas HTML de produtos já carregados na aba ativa. Não faz login, interceptação de API, bypass de CAPTCHA/403, requisição de rede ou acesso oculto.
- Sem segredo, token, cookies ou chamada paga; Manifest V3 apenas com activeTab e scripting.
- Preços múltiplos, a partir de, indisponíveis e ausentes são marcados como pendentes e não exportados como definitivos.
- Até 200 produtos; se houver mais, a extensão avisa que a extração ficou truncada.
- A exportação TXT mantém categoria, nome, preço e descrição para o leitor existente. Pizzas sem tamanho conhecido continuam pendentes de confirmação.
- A exportação JSON contém **somente os links** de fotos que o navegador exibiu. O site não importa automaticamente essas imagens pelo JSON; não prometer fotos transferidas.
- Não é integração oficial iFood. Use apenas cardápios que o proprietário pode importar.
- **Não validado em loja iFood real.** A interface do iFood pode mudar e deixar de expor os cartões. Se falhar, use PDF, foto, texto ou HTML salvo.

## Verificação

    node --test scripts/check-ifood-extension.test.mjs

Os testes são de DOM/HTML controlado. Não equivalem a importação de um estabelecimento real ou teste num computador do usuário.

# Pizzaria.on — extensão experimental 0.4.0

**O fluxo principal do Pizzaria.on continua sendo PDF/fotos no celular.** Esta extensão é um recurso opcional para leitura local de uma loja iFood que o responsável tenha autorização para importar.

> O backend de entrega assistida foi publicado na versão 80. A extensão continua beta: o proprietário confere o resultado, e uma loja real ainda precisa validar a captura completa.

## Instalar manualmente no computador (Chrome, Edge ou Brave)

1. Obtenha o ZIP **0.4.0** gerado pelo workflow de pacote experimental, ou a pasta `tools/ifood-import-extension` desta branch. Não utilize o ZIP da versão 0.2.
2. Extraia todos os arquivos juntos; `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `extractor.js` e `format.js` devem permanecer na mesma pasta.
3. Abra `chrome://extensions`, `edge://extensions` ou `brave://extensions`, ative o Modo do desenvolvedor e selecione **Carregar sem compactação**.
4. Na sua própria loja do iFood, role até carregar os itens. Clique no ícone da extensão e depois em **Ler cardápio desta aba**.
5. Confira categorias, nomes, descrições, preços, disponibilidade, complementos e tamanhos. A extensão não inventa informações ausentes.
6. Continue podendo copiar o texto e salvar TXT/JSON; esses caminhos não exigem backend da versão 0.4.

## Enviar diretamente para o Pizzaria.on (operação assistida)

1. O proprietário autenticado abre o importador da própria pizzaria e solicita ajuda, confirmando autorização para leitura do cardápio.
2. O administrador abre `/admin/importacoes` e gera o **código temporário de uso único** (válido por 30 minutos) para a solicitação. Esse código não é enviado ao cliente.
3. O operador abre a **mesma loja** na aba do iFood, lê os produtos e cola o código na extensão. O backend confere o identificador da loja requisitada.
4. Opcionalmente, o operador permite buscar arquivos das fotografias em domínios `*.ifood.com.br`. Fotos acessíveis são enviadas ao armazenamento R2 dentro dos limites de segurança. Se a permissão for negada ou alguma imagem falhar, o catálogo ainda pode ser entregue com os links correspondentes.
5. O operador clica para enviar. O dono atualiza sua solicitação no Pizzaria.on e leva os produtos ao leitor, onde **confirma os preços e cada fotografia** antes de salvar o rascunho.
6. A publicação para compradores é sempre uma ação separada.

## Limites da versão beta

- A leitura usa somente cartões de produto já disponíveis no DOM da aba; não contorna CAPTCHA, login, verificação ou HTTP 403.
- Não lê opções de produto ou complementos que não estejam acessíveis no conteúdo capturado. Não promete extração integral de catálogos.
- Há limite de 200 registros e 100 fotografias por solicitação. Imagens binárias aceitas: JPG/PNG/WebP até aproximadamente 1,5 MB cada.
- Apenas endereços HTTP(S) e permissões do domínio configurado são usados; nunca envie senhas, cookies ou tokens do iFood.
- A extensão só recebe código temporário gerado pela administração e o apaga do campo após entrega com sucesso.
- Não existe sincronização contínua: alterações futuras no iFood não atualizam automaticamente o cardápio do Pizzaria.on.
- Nenhum produto ou foto é publicado automaticamente. Links sem imagem acessível permanecem referências, e qualquer erro de associação exige conferência.
- O código atual tem testes automatizados aprovados, mas **uma entrega real de ponta a ponta, com fotos, ainda requer homologação**.

## Testes e empacotamento

```sh
node --test scripts/check-ifood-extension.test.mjs
node --test scripts/check-menu-assistance.test.mjs
```

A pasta da extensão não contém dependências externas. O workflow `Package iFood extension beta (no deploy)` verifica a estrutura e gera ZIP de distribuição como artefato do GitHub Actions; **não publica o site**.

Projeto independente, não oficial do iFood. Use apenas dados e imagens cuja importação e reutilização estejam autorizadas.

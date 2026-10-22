# Captura própria por tarefa

Este robô abre uma loja pública em um navegador descartável e reutiliza exatamente `extractIfoodDOM` e os formatadores da extensão 0.4.0. Não precisa carregar a extensão no Chromium. Pode executar no computador de um operador ou em um servidor com Chrome/Chromium, Node 24 e Playwright. A primeira entrada operacional é um workflow manual no GitHub Actions; não foi contratado um servidor permanente.

## Executar sem instalar a extensão

### Windows: abrir o leitor local

Com **Node.js 24 ou mais recente** e Chrome, Edge ou Brave instalados, abra `tools/ifood-capture-runner/iniciar-windows.cmd` dentro de uma cópia completa deste repositório. Na primeira abertura, ele instala somente o driver Playwright 1.64.1 na pasta local ignorada `.sites-runtime/ifood-capture-tools/`, sem scripts de instalação e sem alterar as dependências do aplicativo. Reutiliza o navegador instalado; não baixa outro navegador.

Cole o link completo e confirme a autorização de leitura da loja. Uma janela separada executa a mesma captura limitada a 45 segundos, sem usar o perfil pessoal. Ao terminar, o terminal informa onde abrir **`resultado.html`**: produtos/preços para conferência, pendências e download do TXT. Bloqueios e páginas vazias também produzem esse relatório, sem catálogo para importar. O HTML funciona localmente, sem carregar fotos, scripts ou recursos externos.

O navegador visível serve para acompanhar a execução. O leitor continua encerrando a tentativa quando encontra bloqueio, login ou verificação humana; abrir no Windows não garante acesso. O teste em um computador físico permanece pendente enquanto os dispositivos do Desktop Commander estiverem offline. As verificações Windows do CI usam respostas sintéticas, não a conexão doméstica do operador.

### GitHub Actions e execução por comando

No repositório `pedido.on`, abra **Actions → iFood capture runner (review only) → Run workflow**. Informe o link completo e confirme que tem autorização para importar aquela loja. O trabalho executa os testes isolados e tenta abrir a loja uma vez, por até 45 segundos. Ao terminar, o resumo da execução mostra o relatório real e o TXT disponível para copiar. O ZIP `ifood-capture-...` é uma cópia opcional, válida por sete dias, quando a conta dispõe de armazenamento de artefatos. As PRs não guardam ZIP sintético. O runner usa a cota de Actions da conta; não chama Apify ou IA.

Dentro de `ifood-capture-live/`:

| Arquivo | Uso |
| --- | --- |
| `report.json` | Resultado real, HTTP observado, quantidade de itens, pendências e motivo da parada |
| `resultado.html` | Relatório local legível com produtos, preços, pendências e arquivos da tentativa |
| `capture-review.json` | Todos os itens observados, inclusive preços ambíguos e indisponíveis; só existe com produtos |
| `cardapio.txt` | Itens com preço inequívoco; enviar como TXT ou colar no criador e conferir antes de salvar |
| `cardapio-origem.json` | Cópia dos itens exportáveis e referências de fotos; não é importação automática de imagens |

`captured_for_review` significa que há itens para conferir. `review_required` significa que os itens vistos ainda não têm preço exportável. `blocked`, `empty` e `unavailable` não equivalem a uma importação. Um workflow verde significa que o diagnóstico terminou; leia o resultado em `report.json`. Os arquivos em `ifood-capture-fixture/` são **sintéticos**, não pertencem à loja consultada.

No computador de um operador, instale o driver e o navegador fora das dependências do aplicativo:

```sh
npm install --prefix /tmp/pizzaria-capture-tools --no-audit --no-fund --save-exact playwright-core@1.64.1
node /tmp/pizzaria-capture-tools/node_modules/playwright-core/cli.js install chromium
export QA_PLAYWRIGHT_MODULE=/tmp/pizzaria-capture-tools/node_modules/playwright-core
node tools/ifood-capture-runner/run.mjs --url 'https://www.ifood.com.br/delivery/cidade-rj/loja/IDENTIFICADOR-DA-LOJA' --out .sites-runtime/captura-nova
```

Substitua o endereço pelo link completo real. A pasta de saída precisa ser nova, para impedir que arquivos de uma captura anterior pareçam o resultado de uma tentativa bloqueada. Se já houver Chrome instalado, `QA_CHROME_PATH` pode indicar seu executável.

O parâmetro `--headed` abre o navegador visível; o padrão para servidores permanece sem janela. Nenhuma opção reaproveita cookies ou um perfil existente.

## Comportamento e limites

- Só aceita uma URL HTTPS de loja iFood, normalizada pelo mesmo parser do aplicativo. Remove parâmetros de rastreamento e não aceita URLs arbitrárias. Redirecionamentos HTTP são interrompidos antes de seguir `Location`, inclusive dentro dos recursos da página.
- Cada tarefa recebe um contexto anônimo novo, fechado no final. Não usa perfil pessoal, sessão, cookies fornecidos, senhas ou tokens do iFood.
- Carrega recursos normais dos domínios iFood e verificações comuns do site. Bloqueia escritas de negócio. Não interage com login/CAPTCHA, não troca identidade, proxy ou endereço IP para contornar bloqueios.
- HTTP 401/403/429, tela de verificação ou login encerram a tentativa sem exportar produtos. Não tenta repetidamente desbloquear a página.
- Rola somente a página, até 24 passos, 45 segundos e 200 produtos. Mantém itens que saíram de uma lista virtualizada; um preço que muda durante a captura fica pendente.
- Não abre fichas, complementos ou categorias recolhidas, nem escolhe tamanhos de pizza. Toda captura tem completude **não verificada**, mesmo quando a lista visível estabiliza. Um resultado parcial pode omitir produtos.
- Fotos ficam como referências. O proprietário confere preços, tamanhos e direitos de uso no importador existente. Não há envio ao backend, gravação de rascunho, publicação, mensagem ou pedido automático.

## Próxima integração possível

Depois de validar uma loja real acessível, o mesmo `captureStore` pode ser consumido por uma fila em um servidor próprio. A fila precisa associar cada trabalho à autorização da loja, limitar concorrência e entregar o resultado à revisão do proprietário. O endpoint atual de entrega assistida é destinado à extensão; este runner não falsifica sua origem nem enfraquece essa validação. Nenhuma API pública de captura foi aberta nesta etapa.

Manter a extensão manual oferece um caminho útil quando a loja abre no computador do responsável e o servidor recebe bloqueio. Um servidor próprio não garante acesso a uma página que o iFood não disponibiliza para ele.

## Verificação

```sh
node --test scripts/check-ifood-capture-runner.test.mjs
node scripts/check-ifood-capture-runner.mjs
```

O segundo comando exige o driver/navegador. Seus cenários usam Chromium real com respostas inteiramente sintéticas e sem tráfego externo. A consulta pública é um passo separado do workflow; seu relatório registra o resultado observado, inclusive falhas de acesso.

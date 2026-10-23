# Captura própria por tarefa

Este robô abre uma loja pública em um navegador descartável e reutiliza exatamente `extractIfoodDOM` e os formatadores da extensão 0.4.0. Não precisa carregar a extensão no Chromium. Pode executar no computador de um operador ou em um servidor com Chrome/Chromium, Node 24 e Playwright. A primeira entrada operacional é um workflow manual no GitHub Actions; não foi contratado um servidor permanente.

## Executar sem instalar a extensão

### Windows: abrir o leitor local

Com **Node.js 24 ou mais recente** e Chrome, Edge ou Brave instalados, abra `tools/ifood-capture-runner/iniciar-windows.cmd` dentro de uma cópia completa deste repositório. Na primeira abertura, ele instala somente o driver Playwright 1.64.1 na pasta local ignorada `.sites-runtime/ifood-capture-tools/`, sem scripts de instalação e sem alterar as dependências do aplicativo. Reutiliza o navegador instalado; não baixa outro navegador.

Cole o link completo e confirme a autorização de leitura da loja. Uma janela separada executa a mesma captura limitada a 45 segundos, sem usar o perfil pessoal. Ao terminar, o terminal informa onde abrir **`resultado.html`**: produtos/preços para conferência, pendências e download do TXT. Bloqueios e páginas vazias também produzem esse relatório, sem catálogo para importar. O HTML funciona localmente, sem carregar fotos, scripts ou recursos externos.

O navegador visível serve para acompanhar a execução. O leitor continua encerrando a tentativa quando encontra bloqueio, login ou verificação humana; abrir no Windows não garante acesso. O teste em um computador físico permanece pendente enquanto os dispositivos do Desktop Commander estiverem offline. As verificações Windows do CI usam respostas sintéticas, não a conexão doméstica do operador.

### GitHub Actions e execução por comando

O workflow também oferece **browserbase** como navegador. Antes de escolher essa opção, configure `BROWSERBASE_API_KEY` nos segredos do ambiente GitHub e confira a franquia gratuita no painel Browserbase. `BROWSERBASE_PROJECT_ID` é opcional; a API infere o projeto da chave. A execução exige marcar a autorização da loja e a confirmação da franquia. A chave não vai no campo do link, no JSON de produtos, nos logs ou no código. [Configuração e limites](../../docs/BROWSERBASE-20261023.md).

No repositório `pedido.on`, abra **Actions → iFood capture runner (review only) → Run workflow**. Informe o link completo e confirme que tem autorização para importar aquela loja. O trabalho executa os testes isolados e tenta abrir a loja uma vez, por até 45 segundos. Ao terminar, o resumo da execução mostra o relatório real e o TXT disponível para copiar. O ZIP `ifood-capture-...` é uma cópia opcional, válida por sete dias, quando a conta dispõe de armazenamento de artefatos. As PRs não guardam ZIP sintético. O runner usa a cota de Actions da conta; não chama Apify ou IA.

Dentro de `ifood-capture-live/`:

| Arquivo | Uso |
| --- | --- |
| `report.json` | Resultado real, HTTP observado, quantidade de itens, pendências e motivo da parada |
| `resultado.html` | Relatório local legível com produtos, preços, pendências e arquivos da tentativa |
| `capture-review.json` | Todos os itens observados, inclusive preços ambíguos e indisponíveis; só existe com produtos |
| `cardapio.txt` | Itens com preço inequívoco; enviar como TXT ou colar no criador e conferir antes de salvar |
| `cardapio-origem.json` | Cópia dos itens exportáveis e referências de fotos; não é importação automática de imagens |
| `resultado-importacao.json` | Resultado validável para o administrador entregar à solicitação correta; só existe quando há produtos exportáveis |

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
- Fotos ficam como referências. O proprietário confere preços, tamanhos e direitos de uso no importador existente. A captura não envia automaticamente o resultado ao backend; o administrador pode entregar o arquivo na solicitação. Não há gravação de rascunho, publicação, mensagem ou pedido automático.

## Entregar à revisão do dono

Na v82, o administrador entra em [Importações](https://forno-cardapios.waves4845.chatgpt.site/admin/importacoes), abre a solicitação ativa correspondente e escolhe **Enviar resultado do robô**. Seleciona `resultado-importacao.json`, confere loja, produtos e pendências, confirma a revisão e envia. Quando há captura exportável, o resumo do workflow também mostra o JSON para salvar nesse arquivo.

O servidor exige administrador autenticado, mesma origem/CSRF, confirmação e correspondência da loja iFood. Rejeita arquivo bloqueado, loja diferente, catálogo inconsistente ou solicitação cancelada/concluída. O recebimento invalida o código de pareamento e concorre de forma atômica com entrega da extensão e cancelamento. O limite é 650.000 bytes e 200 produtos.

O dono recebe o resultado na revisão já existente. Pendências e itens indisponíveis continuam visíveis; tamanhos de pizza e preços ambíguos exigem conferência. Receber não salva no rascunho nem publica. Referências externas de fotos não viram imagens importadas automaticamente; só podem ser associadas mídias já concluídas da própria solicitação que correspondam ao item e à origem. O arquivo não autoriza acesso a mídias privadas.

Uma fila automática que dispara captura a partir da solicitação ainda não foi implementada. O operador executa o workflow e entrega o arquivo. A captura real acessível continua pendente: HTTP 403 não produz `resultado-importacao.json`, mesmo se uma pasta antiga contiver produtos. [Publicação e evidências](../../docs/ENTREGA-ROBO-WORK-20261022.md).

Manter a extensão manual oferece um caminho útil quando a loja abre no computador do responsável e o servidor recebe bloqueio. Um servidor próprio não garante acesso a uma página que o iFood não disponibiliza para ele.

## Verificação

```sh
node --test scripts/check-ifood-capture-runner.test.mjs
node scripts/check-ifood-capture-runner.mjs
```

O segundo comando exige o driver/navegador. Seus cenários usam Chromium real com respostas inteiramente sintéticas e sem tráfego externo. A consulta pública é um passo separado do workflow; seu relatório registra o resultado observado, inclusive falhas de acesso.

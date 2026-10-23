# Teste do robô com navegador Browserbase

O usuário autorizou testar a alternativa gratuita em 23/10/2026. O objetivo é executar a leitura sem depender do computador pessoal. O conector e o workflow estão integrados no GitHub e passaram nos testes descritos abaixo. A v82 segue publicada, sem nova implantação. **O acesso e a chave existente foram validados. Uma sessão real foi criada em 23/10 às 08:30:41 de Brasília, mas a conexão CDP falhou antes de navegar no iFood. O painel confirmou a sessão encerrada (`Completed`); não houve captura de produtos.**

## O que está preparado

- `run-browserbase.mjs` cria uma sessão própria, conecta Playwright por CDP, reutiliza `captureStore` e o extrator da extensão e gera os mesmos arquivos aceitos pela revisão administrativa da v82. A extensão não precisa ser instalada no navegador remoto.
- O workflow **iFood capture runner (review only)** recebe a opção `browserbase`. Exige a autorização da loja e confirmação explícita de franquia gratuita disponível. Sem chave ou confirmação, não cria sessão.
- Uma sessão por tentativa, timeout Browserbase de 90 segundos, captura de até 45 segundos e pedido explícito de encerramento no `finally`. Sem repetição automática para falha/bloqueio; o timeout do provedor protege também a perda de conexão.
- Não usa modelos de IA, API de Agents, proxy, contexto persistente, CAPTCHA automático ou modo avançado de identidade. Gravação/logs Browserbase estão desligados. Em uma execução concluída, um arquivo separado contém somente metadados seguros da sessão; o endereço WSS com credencial nunca é impresso. Uma falha anterior à captura pode terminar sem esse arquivo, como ocorreu no teste real abaixo.

## Tráfego e redirecionamentos

O transporte local existente usa `route.fetch()` e devolve a resposta ao Chrome. Para um navegador remoto, essa chamada partiria do processo controlador. A opção Browserbase usa o tráfego do próprio Chromium e interceptação CDP de pedidos/respostas.

Cada pedido é limitado pela política de loja/domínios/métodos existente. Respostas 3xx são interrompidas antes de seguir `Location`. O documento recebido pelo próprio Chrome (até 4 MiB) recebe uma política adicional antes da execução: bloqueia workers, frames, objetos, popups e formulários, mantendo a leitura e os scripts da página principal. WebSockets ficam bloqueados. Se a proteção CDP necessária não estiver disponível, a captura termina sem exportar produtos.

O `allowedDomains` do Browserbase restringe a navegação principal, mas não é suficiente para proteger subrecursos: a própria documentação explicita essa limitação. A aplicação mantém sua proteção de rede. Ainda falta conferir no provedor real a compatibilidade e se a loja renderiza com essas restrições.

## Tentativa real de 23/10/2026

O usuário concluiu o acesso ao Browserbase pelo formulário seguro e autorizou recuperar a chave existente e executar o teste gratuito. Antes da tentativa, o painel mostrou plano **Free** e **0 de 60 minutos** usados. A chave foi copiada sem exibição e usada temporariamente no ambiente do runner; o arquivo intermediário foi removido antes da execução.

A API aceitou a credencial e criou **uma sessão** às **08:30:41 de Brasília (11:30:41 UTC)**. O runner então retornou `Não foi possível conectar ao navegador Browserbase.` antes de chamar a captura da loja. O encerramento explícito foi aceito pelo adaptador, e o painel posteriormente mostrou a única sessão como **Completed**, duração exibida **00:00:00**. Essa duração não é uma medição independente de cobrança. A causa da falha de conexão não foi diagnosticada; não atribuir o resultado a bloqueio do iFood.

Não houve navegação no iFood, resposta HTTP da loja, produto capturado, TXT ou `resultado-importacao.json`. A pasta nova de saída ficou vazia. Nenhuma segunda sessão ou tentativa de contornar bloqueios foi executada. [Evidência sanitizada da tentativa](evidence/browserbase-real-attempt-20261023.json).

O navegador do GitHub estava conectado a outra conta, sem acesso administrativo ao repositório. O formulário seguro para adicionar a conta correta foi cancelado pelo usuário. Não houve nova tentativa de login nem gravação de `BROWSERBASE_API_KEY` nos segredos do GitHub. A conexão já existente do plugin continua apta a atualizar os documentos do projeto, mas não oferece gestão de segredos ou disparo manual de workflow.

## O que falta

1. Autenticação na conta dona de `pedido.on` para guardar a chave como segredo de Actions. O project ID é opcional. Não colar a chave no chat nem no código; o valor temporário usado nesta execução já foi descartado.
2. Validar a conexão do controlador ao navegador remoto em ambiente autorizado. O código atual fornece uma mensagem segura, mas o erro bruto não foi registrado para evitar expor a URL WSS com credencial.
3. Uma nova tentativa real exige conferir novamente a franquia e a autorização. O teste desta etapa não executou o workflow no GitHub e não homologou a captura no Browserbase.
4. Se uma tentativa autorizada futura produzir itens, conferir `resultado.html` e entregar `resultado-importacao.json` à solicitação correta no admin da v82. O dono ainda confirma os itens; receber não altera o rascunho nem publica.

HTTP 401/403/429, login ou verificação encerram uma tentativa de captura. Não contornar bloqueios, trocar identidade/proxy ou repetir tentativas para desbloquear. O teste anterior da loja permanece HTTP 403/zero produtos; esse resultado anterior não foi obtido nesta sessão Browserbase.

## Executar com segredo já configurado

O comando pode rodar no GitHub Actions; não exige PC do usuário. Para outro ambiente autorizado com Node 24 e Playwright instalado:

```sh
node tools/ifood-capture-runner/run-browserbase.mjs \
  --url 'https://www.ifood.com.br/delivery/cidade/loja/IDENTIFICADOR-DA-LOJA' \
  --out .sites-runtime/captura-browserbase-nova \
  --authorized --free-budget-confirmed
```

Substituir o link por uma loja real autorizada; a pasta deve ser nova. A chave fica apenas em `BROWSERBASE_API_KEY` no ambiente. Nunca adicionar `set -x`, imprimir o ambiente, a resposta inteira da criação de sessão ou a URL CDP.

## Verificação reproduzível

```sh
node --test scripts/check-ifood-capture-runner.test.mjs scripts/check-ifood-capture-browserbase.test.mjs
node scripts/check-ifood-capture-runner.mjs
node scripts/check-ifood-capture-browser-network.mjs
```

Os testes de API são simulados e não gastam franquia. O teste de rede usa Chrome real e servidor descartável em loopback: verifica leitura, execução de script, recusa de escritas/novos alvos e interrupção de redirecionamentos antes de atingir o destino. Os cenários do extrator continuam sintéticos. O CI Windows também executa essa proteção; aprovação do CI não prova uma sessão Browserbase real.

| Verificação | Resultado |
| --- | --- |
| Testes locais | 596 aprovados, zero falhas/skips; TypeScript aprovado |
| [Captura Chrome Linux](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39941343941) | Aprovada: 21 testes de política/provedor, 14 cenários sintéticos do extrator e quatro cenários de rede real em loopback |
| [Windows](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39941343914) | Aprovado: 596 testes, tipos/build, 14 cenários do extrator e quatro de rede |
| [Chrome do aplicativo](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39941343894) | Aprovado; dados locais descartáveis e consultas públicas existentes do diagnóstico, sem mutações remotas |
| [Espelho CI/build](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/39941349680) e [captura](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/39941349659) | Aprovados |
| PRs integradas | Principal [#90](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/90), espelho [#45](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/45) |

Head principal testado `c63fa9c06b4fe62024731181eb1bda06cebf4ef1`, árvore `e1df49749550c0264e31a04e4d3963181b9812d3`, merge `3294e2ddfa21b5d39fc9406adba44478b7787f4c`. Espelho testado `a1cf8fa868e207001f696f20b9544a91a766c465`, merge `4dc87dba5d7488eeded4077e1efa9b0a94f5d240`. Este registro posterior altera somente documentos e evidências. [Evidência sanitizada](evidence/browserbase-preparation-20261023.json).

Registro histórico da preparação, anterior ao acesso concluído: o formulário vazio foi observado sem credenciais ou dados pessoais ([tela de cadastro](evidence/browserbase-signup-1792752600753.jpg)). Ele oferecia Google ou e-mail/telefone/senha e informava o aceite dos termos. A evidência de preparação descreve aquele momento; a tentativa real posterior está registrada separadamente acima.

Não houve alteração de banco, conta, segredo de produção, cobrança, geração Lovable/IA ou nova publicação do aplicativo. A fila que dispara automaticamente o robô continua fora desta etapa; validar primeiro uma captura real antes de contratar ou ampliar infraestrutura.

## Fontes oficiais consultadas

- [Plano gratuito e limites](https://www.browserbase.com/pricing)
- [Playwright e conexão CDP](https://docs.browserbase.com/welcome/quickstarts/playwright)
- [Criação de sessão e opções](https://docs.browserbase.com/reference/api/create-a-session)
- [Encerramento explícito](https://docs.browserbase.com/reference/api/update-a-session)
- [Limites de Allowed Domains](https://docs.browserbase.com/platform/browser/security/allowed-domains)

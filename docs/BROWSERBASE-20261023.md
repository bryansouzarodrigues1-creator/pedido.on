# Teste do robô com navegador Browserbase

O usuário autorizou testar a alternativa gratuita em 23/10/2026. O objetivo é executar a leitura sem depender do computador pessoal. O conector e o workflow estão integrados no GitHub e passaram nos testes descritos abaixo. A v82 segue publicada, sem nova implantação. **A chave existente está configurada como segredo criptografado no GitHub Actions. A execução real de 23/10 às 08:41 de Brasília conectou ao Browserbase, consultou a loja autorizada e encerrou ao receber HTTP 403, com zero produtos. A integração de execução remota foi validada; a importação de um catálogo real continua sem homologação.**

## O que está preparado

- `run-browserbase.mjs` cria uma sessão própria, conecta Playwright por CDP, reutiliza `captureStore` e o extrator da extensão e gera os mesmos arquivos aceitos pela revisão administrativa da v82. A extensão não precisa ser instalada no navegador remoto.
- O workflow **iFood capture runner (review only)** recebe a opção `browserbase`. Exige a autorização da loja e confirmação explícita de franquia gratuita disponível. Sem chave ou confirmação, não cria sessão.
- Uma sessão por tentativa, timeout Browserbase de 90 segundos, captura de até 45 segundos e pedido explícito de encerramento no `finally`. Sem repetição automática para falha/bloqueio; o timeout do provedor protege também a perda de conexão.
- Não usa modelos de IA, API de Agents, proxy, contexto persistente, CAPTCHA automático ou modo avançado de identidade. Gravação/logs Browserbase estão desligados. Em uma execução concluída, um arquivo separado contém somente metadados seguros da sessão; o endereço WSS com credencial nunca é impresso. Uma falha anterior à captura pode terminar sem esse arquivo, como ocorreu no teste real abaixo.

## Tráfego e redirecionamentos

O transporte local existente usa `route.fetch()` e devolve a resposta ao Chrome. Para um navegador remoto, essa chamada partiria do processo controlador. A opção Browserbase usa o tráfego do próprio Chromium e interceptação CDP de pedidos/respostas.

Cada pedido é limitado pela política de loja/domínios/métodos existente. Respostas 3xx são interrompidas antes de seguir `Location`. O documento recebido pelo próprio Chrome (até 4 MiB) recebe uma política adicional antes da execução: bloqueia workers, frames, objetos, popups e formulários, mantendo a leitura e os scripts da página principal. WebSockets ficam bloqueados. Se a proteção CDP necessária não estiver disponível, a captura termina sem exportar produtos.

O `allowedDomains` do Browserbase restringe a navegação principal, mas não é suficiente para proteger subrecursos: a própria documentação explicita essa limitação. A aplicação mantém sua proteção de rede. A conexão e a instalação inicial da proteção funcionaram no provedor pelo GitHub Actions. A leitura/renderização de um catálogo real com essas restrições continua sem validação, pois a loja respondeu HTTP 403.

## Tentativa real de 23/10/2026

O usuário concluiu o acesso ao Browserbase pelo formulário seguro e autorizou recuperar a chave existente e executar o teste gratuito. O painel mostrou plano **Free**, **0 de 60 minutos** usados e gasto com modelos de **US$0,00** antes da consulta. Não houve contratação ou mudança de plano.

Uma verificação inicial no ambiente Work criou uma sessão às **08:30:41 de Brasília**, mas falhou na conexão CDP antes de navegar na loja. O adaptador pediu encerramento e o painel confirmou **Completed**. A credencial temporária foi removida. Essa falha inicial não foi uma resposta do iFood.

A conta dona do repositório foi verificada no navegador e a chave existente foi guardada em **Settings → Secrets and variables → Actions**, como `BROWSERBASE_API_KEY`. O valor não apareceu em chat, código, documentos ou logs. O project ID opcional não precisou ser configurado: a API inferiu o projeto da chave.

A [execução manual #15](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39947752780), iniciada às **08:40:39 de Brasília**, usou o navegador `browserbase`, link da Master Pizzas já autorizado e confirmação da franquia. Fonte `40323ee28cc96388b682388dc6bb59b685631038`, job `120394475187`. Antes da consulta, passaram novamente **21 testes de política/provedor**, **14 cenários sintéticos do extrator** e **quatro cenários de rede Chromium em loopback**.

Às **08:41:13.988 de Brasília (11:41:13.988 UTC)**, o navegador remoto consultou a loja e recebeu:

| Dado real | Resultado |
| --- | --- |
| Conexão CDP e etapa Browserbase | Concluídas no GitHub Actions |
| Documento da loja | HTTP **403** |
| Resultado do leitor | `blocked`, motivo `http_403` |
| Produtos observados/exportáveis | **0 / 0** |
| Rolagens | **0**; parou após a resposta |
| TXT / resultado para importação | Não gerados |
| Encerramento | `releaseRequested: true`; painel confirmou **Completed** |
| Workflow | `success`: diagnóstico concluído, sem importação bem-sucedida |

A pasta real contém somente `report.json`, `resultado.html` e `browserbase-session.json`. O ZIP também contém testes sintéticos em uma pasta diferente; os produtos dessas fixtures não pertencem à loja. Não enviar arquivos de fixture à administração como captura real.

Artefato `12498533546`, `ifood-capture-39947752780-1`, **102.897 bytes**, SHA-256 conferido `937d84456d3ebbea630ed2d1de754de9903898d71392349a6488d5a91b5b77c2`, retenção até 30/10/2026. O [relatório real preservado](evidence/browserbase-capture-report-20261023.json) e a [evidência sanitizada](evidence/browserbase-real-attempt-20261023.json) ficam no GitHub além dessa retenção, sem chave ou identificadores privados da conta/sessão.

Foram **duas sessões no total**: uma falha de conexão no Work, sem consulta à loja, e uma consulta real pelo GitHub. As duas apareceram como **Completed**, com duração exibida **00:00:00**; isso não mede de forma independente o uso faturável. Não houve repetição automática nem nova consulta após o 403, proxy, alteração de identidade ou resolução de CAPTCHA.

## O que falta

1. A importação automática real dessa loja continua sem homologação. O segredo e a conexão remota já funcionam; contratar plano ou trocar o caminho da rede para contornar o 403 não faz parte desta etapa.
2. Usar PDF, fotos ou dados de uma fonte autorizada disponível para continuar a montagem do cardápio, sempre com revisão do dono. Não anunciar catálogo importado a partir desse resultado.
3. Antes de qualquer consulta futura, conferir novamente a autorização e a franquia. HTTP 401/403/429, login ou verificação encerram uma tentativa, sem repetir para desbloquear.
4. Somente uma captura autorizada com itens exportáveis deve gerar `resultado-importacao.json` e ser entregue à solicitação correta no admin da v82. O dono ainda confirma os itens; receber não altera o rascunho nem publica.

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

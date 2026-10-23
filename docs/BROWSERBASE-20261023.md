# Teste do robô com navegador Browserbase

O usuário autorizou testar a alternativa gratuita em 23/10/2026. O objetivo é executar a leitura sem depender do computador pessoal. A v82 segue publicada; esta etapa prepara o conector e o workflow. **Ainda não houve sessão Browserbase real nem captura real bem-sucedida neste provedor.**

## O que está preparado

- `run-browserbase.mjs` cria uma sessão própria, conecta Playwright por CDP, reutiliza `captureStore` e o extrator da extensão e gera os mesmos arquivos aceitos pela revisão administrativa da v82. A extensão não precisa ser instalada no navegador remoto.
- O workflow **iFood capture runner (review only)** recebe a opção `browserbase`. Exige a autorização da loja e confirmação explícita de franquia gratuita disponível. Sem chave ou confirmação, não cria sessão.
- Uma sessão por tentativa, timeout Browserbase de 90 segundos, captura de até 45 segundos e pedido explícito de encerramento no `finally`. Sem repetição automática para falha/bloqueio; o timeout do provedor protege também a perda de conexão.
- Não usa modelos de IA, API de Agents, proxy, contexto persistente, CAPTCHA automático ou modo avançado de identidade. Gravação/logs Browserbase estão desligados. Um arquivo separado contém somente metadados seguros da sessão; o endereço WSS com credencial nunca é impresso.

## Tráfego e redirecionamentos

O transporte local existente usa `route.fetch()` e devolve a resposta ao Chrome. Para um navegador remoto, essa chamada partiria do processo controlador. A opção Browserbase usa o tráfego do próprio Chromium e interceptação CDP de pedidos/respostas.

Cada pedido é limitado pela política de loja/domínios/métodos existente. Respostas 3xx são interrompidas antes de seguir `Location`. Uma política adicional do documento bloqueia workers, frames, objetos, popups e formulários, mantendo a leitura e os scripts da página principal. WebSockets ficam bloqueados. Se a proteção CDP necessária não estiver disponível, a captura termina sem exportar produtos.

O `allowedDomains` do Browserbase restringe a navegação principal, mas não é suficiente para proteger subrecursos: a própria documentação explicita essa limitação. A aplicação mantém sua proteção de rede. Ainda falta conferir no provedor real a compatibilidade e se a loja renderiza com essas restrições.

## O que falta para o teste real

1. Concluir o cadastro gratuito ou entrar no Browserbase. O cadastro observado em `https://www.browserbase.com/sign-up` exige telefone, criação de senha e aceite dos termos. Essa etapa pertence ao usuário; nenhuma conta ou contrato foi criado pelo agente.
2. Conferir no painel que o plano é gratuito e que resta franquia. A página pública consultada oferece 1 hora de navegador e até 15 minutos por sessão. Não mudar de plano ou adicionar recursos pagos para este teste.
3. Configurar a chave em **GitHub → pedido.on → Settings → Secrets and variables → Actions → New repository secret**, nome `BROWSERBASE_API_KEY`. O project ID é opcional. Não colar a chave no chat ou no repositório. A conexão necessária não está disponível nos plugins desta sessão.
4. Executar uma tentativa pelo workflow, com link autorizado, navegador `browserbase` e a confirmação da franquia. Conferir o relatório e o encerramento no painel.
5. Se houver produtos exportáveis, conferir `resultado.html` e entregar `resultado-importacao.json` à solicitação correta no admin da v82. O dono ainda confirma os itens; receber não altera o rascunho nem publica.

HTTP 403/429, login ou verificação encerram a tentativa. Não contornar bloqueios, trocar identidade/proxy ou repetir tentativas para desbloquear. O último teste real anterior à preparação Browserbase continua HTTP 403/zero produtos; não atribuir esse resultado ao Browserbase.

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

Não houve alteração de banco, conta, segredo de produção, cobrança, geração Lovable/IA ou nova publicação do aplicativo. A fila que dispara automaticamente o robô continua fora desta etapa; validar primeiro uma captura real antes de contratar ou ampliar infraestrutura.

## Fontes oficiais consultadas

- [Plano gratuito e limites](https://www.browserbase.com/pricing)
- [Playwright e conexão CDP](https://docs.browserbase.com/welcome/quickstarts/playwright)
- [Criação de sessão e opções](https://docs.browserbase.com/reference/api/create-a-session)
- [Encerramento explícito](https://docs.browserbase.com/reference/api/update-a-session)
- [Limites de Allowed Domains](https://docs.browserbase.com/platform/browser/security/allowed-domains)

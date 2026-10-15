# Verificação das comandas e fluxos — 15/10/2026

Base funcional validada: **v33**, publicada às **16:54:14 de Brasília**, fonte Sites `9293c3a068138e9a85a29be5fa300a932cde8fe7`, PR #17 integrada em `3c80413943d52e2c75716bc338b47e3050f4dcb0`. Implantação `appgdep_6ad12f4c8b6c8191bb6d20b475585f26`, ambiente revisão 13, audiência pública.

## Resultado

**281 testes passaram**, sem falhas ou testes ignorados; `pnpm typecheck` aprovado. São nove casos novos além dos 272 da publicação: sete de integração no runtime Cloudflare e dois do controle de impressão/renderização. A publicação das comandas não apresentou falha funcional nos cenários exercitados. Nenhuma correção de comportamento, migração ou alteração de configuração foi necessária nesta verificação.

| Cenário | Evidência |
| --- | --- |
| Login e sessão | Rotas reais de login em workerd criam cookies e sessões seladas no D1 local; transporte Supabase simulado |
| Pix antecipado | Pedido → aceite → comprovante no R2 local → conferência explícita do dono → resumo sem cobrança; o arquivo de comprovante é fictício |
| Cobrança posterior | Dinheiro, crédito, débito e Pix na entrega mostram a forma e o total gravado; concluir não inventa confirmação de recebimento |
| Privacidade | Anônimo, outra conta, outra loja, sessão adulterada, recuperação, expiração e logout não liberam a via |
| Concorrência | Quatro envios do mesmo pedido gravam uma única linha; entre duas atualizações da mesma versão somente uma vence |
| Falha de gravação | Erro deliberado no histórico devolve erro e desfaz a alteração do pedido na transação D1 |
| Combos e valores | Dois combos preservam quatro pizzas e dois refrigerantes; cupom incide somente no item elegível, taxa e total permanecem originais após editar o catálogo |
| Cancelamento e histórico | Cancelado não libera resumo do motoboy; concluído tem aviso histórico e não orienta nova cobrança |
| WhatsApp | A preparação da conversa não cria pedido, comprovante ou comanda |
| Controle de impressão | Versão antiga, rede indisponível, resposta HTML de login e ausência de `window.print` impedem abertura; clique duplo durante a consulta não repete a impressão |
| Conteúdo das vias | HTML preserva 30 itens e todas as observações em A4/80 mm; links da interface respeitam modalidade e estado; não há imagens externas no documento |

Os testes de integração usam **workerd, D1 e R2 reais em emulação local descartável**, com as migrações existentes. Autenticação do aplicativo, criptografia da sessão, autorização, SQL e rotas de negócio são executados. Somente o transporte externo Supabase é simulado. Não usar essa evidência como teste de login Supabase real ou confirmação de Pix bancário.

## Produção, somente leitura

Diagnóstico anônimo por HTTPS concluído às **17:06:12 de Brasília**: **14/14 verificações passaram**. Início, calculadora, demonstração, página offline, JavaScript de impressão, service worker, versão do PWA, manifesto e ícones responderam 200. Admin, lista de pizzarias, status de assinatura e comanda responderam 401 com cache privado. Cinco arquivos estáticos tiveram SHA-256 idêntico ao fonte local.

[Resultado estruturado das consultas](qa-comandas-live-2026-10-15.json). O diagnóstico não imprime corpos privados, cookies ou credenciais, não faz POST e não acessa provedores financeiros/modelos. O manifesto é gerado por `app/manifest.ts`, portanto é validado como JSON, sem supor arquivo estático em `public/`.

## Reproduzir

```sh
pnpm test
pnpm typecheck
node --experimental-strip-types --experimental-vm-modules --test scripts/check-order-ticket.test.mjs scripts/check-order-ticket-worker.test.mjs
python3 scripts/check-live-readonly.py --output /tmp/pizzaria-live-qa.json
```

O diagnóstico de produção é explícito e fica fora de `pnpm test`. Não realiza geração, contratação, pagamento, estorno ou cancelamento financeiro. Cenários com dados fictícios ficam somente em bancos/objetos locais descartáveis. Não houve criação ou modificação de pedidos/clientes de produção nesta etapa.

## Limites e próximo ensaio operacional

O ambiente gerenciado não disponibiliza o recurso `control-browser`. O roteiro Sites exige pular a revisão em navegador nessa situação. Não foi instalada outra ferramenta de navegador nem iniciado servidor de preview. HTML/SSR e execução do JavaScript em VM verificam conteúdo e regras; não comprovam aparência, toque, paginação do PDF ou diálogo de impressão num aparelho real.

Ainda executar, numa pizzaria de teste em dois aparelhos:

1. Registrar um pedido fictício no celular do cliente; conferir itens, endereço, taxa e total no painel do dono.
2. Sem transferir dinheiro, usar uma forma de pagamento na entrega para testar preparo e saída. Validar Pix real separadamente com valor e pagador definidos.
3. Abrir comanda e resumo, salvar PDF e imprimir numa impressora configurada. Conferir margens, acentos, observações, corte e leitura do valor a cobrar.
4. Reabrir uma via, cancelar/alterar o pedido em outro aparelho e confirmar que o botão exige atualização.

Primeira fatura Asaas realmente paga, Web Push com painel fechado, instalação/retomada no Android, câmera/OCR real e acesso externo do WhatsApp não foram validados por essa bateria. Os testes existentes desses subsistemas usam as simulações descritas em cada arquivo. O relatório não declara o beta inteiro comercialmente homologado.

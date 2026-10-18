# Homologação integrada — 18/10/2026

Base auditada: `185317b05d5052026ff22b6da775086b967810ae` (PR #58). Plano vigente: **uma pizzaria, R$49/mês**. Não reutilizar o catálogo histórico de R$89/R$149 como oferta atual. Contas Sites, Supabase, D1/R2 anteriores e serviço Lovable preservados.

## Ambiente e publicação

- Worker beta: `pizzaria-on-backend-staging-20261017`.
- URL: https://pizzaria-on-backend-staging-20261017.bryansouzarodrigues06.workers.dev
- D1 beta: `4f83f462-997f-4269-8e77-f7daaf0c89cb`; R2: `pizzaria-on-beta-media-20261017`.
- `/healthz` identifica o SHA compilado; não publica configuração privada nem contagens de clientes.
- A publicação revisada usa `--keep-vars`, preservando a chave de sessão e os segredos existentes. Não há migração de esquema nesta entrega.
- O gatilho automático continua limitado à branch de infraestrutura. Uma publicação pontual usa o SHA revisado, e o comando de deploy do gatilho volta ao modo build-only ao terminar.

## Cadastro, contas e pedidos

O ensaio externo está em `scripts/qa-beta-two-accounts.mjs`, com workflow `beta-two-accounts-once.yml`. Executa somente na abertura desta PR e após a URL servir o SHA esperado. Cria exatamente duas contas fictícias, sem confirmação por e-mail, e mantém senhas/cookies/tokens exclusivamente na memória do processo. Não exporta credenciais em logs ou artefatos.

Verifica sessão, login incorreto/correto, saída, duas lojas privadas, revisão concorrente, publicação, totais recalculados, idempotência, acompanhamento com token, confirmação/cancelamento de pedidos e recusa de acesso/alterações entre proprietários. Os pedidos são fictícios, em dinheiro, sem envio de WhatsApp ou cobrança. Ao terminar, os dois cardápios são retirados do ar e as sessões encerradas. O relatório público é sanitizado; sua execução externa deve ser conferida no Actions, não inferida dos testes locais.

## OCR: medida real, ainda parcial

Fonte pública: `https://4estylos.com.br/public/archives/CARDAPIO_PIZZARIA_2025.pdf`, SHA-256 `437c75008bda1d024215f2adcce0ce97fccbabb42e237a330219cc8f340816c1`, páginas 11 e 19. Referências: oito pizzas e treze bebidas.

- Base anterior: **6/21** nomes + preços exatos e aptos à importação automática.
- Leitura atual: **13/21** nas mesmas referências. Isso não significa OCR comercial concluído.
- Corrigidos agrupamento pela base das letras, marcadores, códigos M/G deformados, cabeçalhos misturados e confiança do número separada da do símbolo monetário.
- Menus escuros recebem comparação de contraste local. Até doze linhas incertas por foto recebem uma segunda leitura local. Leituras financeiras conflitantes permanecem para revisão; não se inventa vírgula, tamanho ou preço.
- Fotos, PDFs e dados brutos ficam fora do Git. Nenhuma chamada paga de IA foi executada.

Reprodução: `node --experimental-strip-types scripts/benchmark-public-menu-pdf.mjs`. Uma cópia local verificada do mesmo PDF pode ser indicada em `QA_MENU_PDF_PATH`. A medição usa Tesseract real e imagens rasterizadas; não comprova câmera nem desempenho em Android físico.

## Asaas exclusivamente Sandbox

O build independente declara `PEDIDO_BILLING_SANDBOX_ONLY=true`, `PEDIDO_BILLING_PROVIDER=asaas` e `ASAAS_ENV=sandbox`. A política recusa chaves/modo de produção e não permite fallback para Stripe. `PEDIDO_BILLING_ENABLED` permanece desligado enquanto falta a chave Sandbox.

Foi criado no Worker um segredo criptograficamente aleatório `ASAAS_WEBHOOK_TOKEN`, sem imprimir seu valor. **`ASAAS_API_KEY` do Sandbox está ausente**. Portanto, nenhuma assinatura externa, fatura ou pagamento foi criado nesta etapa. O token poderá ser rotacionado junto ao registro do webhook quando a chave estiver disponível.

O acesso fictício é restrito aos IDs explicitamente listados no segredo `PEDIDO_BILLING_SANDBOX_TEST_OWNERS`. Somente essas contas podem validar publicação/acesso controlados por pagamento fictício. As demais contas beta e o histórico de produção não recebem acesso financeiro por faturas Sandbox.

Passaram testes com workerd/D1 reais locais, usando transportes Auth/Asaas simulados, além da suíte de domínio/rotas: criação idempotente, autenticação do webhook, consulta ao estado do provedor, duplicatas, isolamento de proprietários, pagamento pendente/confirmado, cancelamento com período pago preservado, estorno, evento antigo e rollback atômico. **Isso não substitui eventos recebidos do Asaas externo.**

Próxima ação necessária: adicionar uma chave exclusiva do Asaas Sandbox em `ASAAS_API_KEY` no Worker. Não enviar a chave no chat nem no Git. Com ela disponível, registrar o webhook Sandbox em `/api/billing/asaas/webhook`, sincronizar o token, habilitar apenas o Sandbox e executar pagamento fictício/cancelamento/estorno nas contas de homologação. Não usar chaves de JurisAuto nem alterar o webhook comercial do Sites.

## Android

O CI executa Chrome com Pixel 7 emulado. Isso cobre viewport, toque emulado e fluxo responsivo; instalação PWA, câmera, notificações e retomada em Android físico continuam precisando de um aparelho disponível. Não declarar essa etapa física concluída a partir do CI.

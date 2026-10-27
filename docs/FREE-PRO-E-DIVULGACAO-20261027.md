# Free, Pro e divulgação — 27/10/2026

## Escopo solicitado e comportamento

Admin oferece somente **Free**, **Pro** e **Suspender conta**. Free e Pro podem ser liberados por **10, 30, 60 ou 90 dias**, sem criar cobrança. Motivo, revisão e histórico preservados; o histórico distingue Free/Pro. Pagamentos antigos e contratos anteriores permanecem registrados. A suspensão impede novos pedidos, preservando acesso do titular, histórico e pedidos já em atendimento. Uma assinatura paga vigente não perde benefícios por uma liberação Free de menor alcance.

**Verificar loja** aparece junto de cada pizzaria no cadastro do cliente. Abre os dados publicados e o recebedor Pix para conferência. O admin pode iniciar uma análise mesmo sem solicitação prévia do dono; iniciar a análise não aprova. A aprovação exige confirmação explícita e motivo, protege a revisão/identidade/publicação atual e registra as duas ações. Free/Pro não equivale a loja verificada. A fila anterior de verificações e denúncias continua disponível.

**Free** começa com 10 dias para novos clientes, sem encurtar prazos concedidos. Há duas rodadas de divulgação: a primeira após cadastrar produtos; a segunda no sexto dia. Cada rodada tem duas sugestões a partir de produtos disponíveis, sem inventar desconto, bebida, tamanho ou margem. O dono confere preço e validade no editor antes de criar uma promoção no rascunho. Nada é publicado ou enviado para redes automaticamente.

Cada rodada pode preparar um texto/visual com IA e duas fotos ilustrativas. As quatro fotos do kit têm reserva própria, compartilhada pela conta, sem retirar a franquia anterior de imagens gerais. Textos e artes reutilizam a criação em Instagram/Facebook (1080 × 1080), Instagram Story/WhatsApp Status (1080 × 1920), com nome/preço/link escritos pelo aplicativo. O dono confirma a representação da foto e do preço; o download consulta o cardápio publicado e bloqueia dados desatualizados. Repetir download não chama um modelo. O mapa mostra a organização e os dados que merecem correção, incluindo nomes longos e horários incompletos. Prévia e aplicação ao rascunho são explícitas; preços, Pix, contato e publicação não são alterados pela proposta visual.

**Pro** continua R$49/mês para novas contratações (ID financeiro `essencial` preservado). Divulgação à vontade com textos e artes reutilizáveis; criação com IA; **20 novas imagens por conta e por semana**, de segunda 00:00 a segunda 00:00 em Brasília. Novas lojas, login, renovação e extensão da cortesia não reiniciam a semana. Contratos legados preservam pagamentos e unidades; sua IA também passa à semana de 20 imagens. Criações automáticas têm idempotência, proteção de origem/CSRF/propriedade e limite operacional do provedor. O teto global estimado continua 20 créditos, sem compra de saldo ou aumento do teto; pode limitar novas criações quando esgotado. Divulgação local reutilizável continua disponível.

## Assinar antes de terminar o teste

O vencimento inicial da nova assinatura Asaas é registrado na intenção e fica no final do período gratuito restante. Como o Asaas usa datas civis, o término com hora é arredondado para a próxima meia-noite de Brasília, preservando cada segundo do benefício. A fatura pode ser paga antes. Após confirmação canônica do pagamento, o Pro fica ativo e o acesso vai até um mês após esse vencimento; a recorrência do provedor segue a mesma referência. Não basta aumentar apenas o acesso local. O teste não é zerado ou reiniciado. Estorno remove o direito pago correspondente e preserva os registros do período gratuito.

Intenções anteriores sem o novo vencimento registrado seguem seu acordo original e não mostram promessa de dias extras. Não alteramos faturas existentes silenciosamente. Repetições conciliam a mesma intenção, sem outro POST de criação; se já paga, retornam assinatura ativa. A cobrança real e sua renovação externa ainda precisam ser conferidas pelo titular: os cenários automatizados financeiros usam provedor simulado.

Fontes oficiais consultadas em 27/10/2026: [Criar assinatura](https://docs.asaas.com/docs/criando-uma-assinatura), [Atualizar assinatura](https://docs.asaas.com/reference/atualizar-assinatura-existente) e [FAQ](https://docs.asaas.com/docs/faq-assinaturas). `nextDueDate` ancora o primeiro vencimento; alterar a recorrência não altera vencimentos de faturas já geradas. Nenhuma nova cobrança real foi criada pelo desenvolvimento.

## Primeiro caso: conceitos da EFATA

A pedido do proprietário, foram geradas quatro imagens **reais pelo recurso de geração desta conversa**, a partir dos ingredientes e nomes visíveis no cardápio público da EFATA. Não são fotos reais dos produtos da loja. O kit privado reconhece a loja e os quatro nomes públicos correspondentes, mostra os primeiros dois conceitos e libera a segunda rodada no sexto dia. Se os nomes/contexto não correspondem, usa o fluxo geral em vez de assumir outra identidade. Nenhum dado privado, pedido, Pix, senha ou contato foi enviado ao gerador.

Os arquivos originais foram preservados e os derivados WebP de 1080 pixels servem ao aplicativo:

- `public/assets/efata-calabresa-v1.webp`
- `public/assets/efata-frango-v1.webp`
- `public/assets/efata-mussarela-v1.webp`
- `public/assets/efata-presunto-v1.webp`

Conceitos já preparados não chamam Lovable novamente ao abrir a página. A reserva geral de quatro fotos do kit serve aos demais clientes. Estimativa interna: quatro fotos × 0,16875 crédito ≈ 0,675 crédito; vinte fotos Pro ≈ 3,375 créditos por semana, antes dos textos. São estimativas internas com reserva, não preço de venda nem consumo confirmado na conta Lovable. Nesta etapa, nenhuma geração real Lovable, compra, aumento de saldo ou envio a redes foi executado.

Prompt comum: fotografia publicitária quadrada premium, ilustrativa, para a pizzaria brasileira EFATA; massa tostada natural, luz quente de forno, tons creme/terracota, enquadramento utilizável em redes. Sem letras, logo, números, preços, selos, embalagens, pessoas ou marcas de terceiros. Não incluir ingredientes além dos listados.

Prompts específicos: (1) calabresa, molho de tomate, mussarela, cebola, azeitonas e orégano; (2) frango desfiado, molho, mussarela, catupiry, orégano e azeitonas, sem milho/bacon; (3) molho, mussarela, orégano e azeitonas, sem tomate fresco/manjericão; (4) molho, mussarela, presunto cozido, orégano e azeitonas, sem prosciutto cru/cebola. As imagens foram inspecionadas; o titular ainda deve conferir se representam seus produtos antes de usar.

## Dados, testes e publicação

Migrações aditivas 0022/0023: campanhas por conta/período/rodada, vencimento financeiro registrado, origem da franquia das fotos e distinção Free/Pro no acesso/auditoria. Nenhuma chave, conta ou sessão é substituída. O teste completo limita a concorrência a quatro arquivos para evitar esgotamento do executor, sem retirar cenários ou asserções.

Testes novos cobrem datas/fuso/fim do mês, semana Pro, quatro durações para ambos os planos, suspensão, dois kits, quatro imagens, claims de uso único, concorrência, devolução antes do claim, retomada sem repetição paga e preservação integral do cardápio. O ensaio financeiro percorre vencimento futuro, pagamento antecipado, Pro imediato, repetição, webhook duplicado e estorno. Chrome verifica interface, prévia, quatro formatos PNG, preço publicado alterado, botão de verificação real e seleção simplificada. Geração de IA e respostas visuais de alteração de plano no Chrome são simuladas; o backend desses fluxos é exercitado separadamente por testes de integração.

O código foi integrado ao `main` pelo [PR #136](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/136), merge `1434211f9059549a8ba2751588b01ef8355d80d5`. O commit de aplicação validado é `8842b30d2eb5bafa88ddf803aba3c8dfdfc85d96`; sua árvore é `a2c38138bd4e5ec8fdf688b8ca8802b4b7544ad2`, igual à árvore do merge.

Resultados finais aprovados nesse commit:

- [742 testes, tipos, metadados de migração e build](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40436679996).
- [Chrome completo e kit de divulgação](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40436679642), com ambos os jobs concluídos com sucesso. O kit percorre revisão de fotos, prévia, quatro downloads PNG, preço desatualizado bloqueado, botão de verificação e seleção Free/Pro.
- [Windows](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40436679682).
- [Conversa de pedidos](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40436679805).
- [Disponibilidade pública de cadastro](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40436679783), sem criar conta.

O artefato final do kit é `chrome-qa-40436679642-1-welcome-kit`, ID `12704582152`, SHA-256 `e05c0f5984f0460314c4857029237ea3454df8bbffea49336ecc976d8a53419b`, com resumo, capturas do admin/kit em celular e os quatro downloads. A última correção também testa explicitamente um pedido visual como “Quero uma imagem marcante com a minha cor.”: essa frase vira contexto do kit e não desvia a etapa de textos para o fluxo de imagem do Studio.

**A nova publicação não foi concluída.** O ambiente de execução se desconectou durante o empacotamento e passou a retornar “No usable execution environment is available”. Não houve novo salvamento de versão nem deploy desta etapa. O Sites confirmou projeto ativo e última versão 102 depois da integração do código. O site público continua com a v102 (logo/sessão e dados por imagem); as novas opções deste documento ainda não aparecem em produção.

Android físico, um novo e-mail real concluindo a troca de senha e uma cobrança/renovação externa real do Asaas continuam sem homologação externa; não foram substituídos pelos testes simulados. Nenhuma alteração de verificação, plano, publicação ou pedido foi aplicada à loja real EFATA.

## Retomada exata da publicação

Não refazer o desenvolvimento nem reverter o código integrado. Ler o fluxo oficial do Sites e o contexto atual antes de operar. Não criar outro site, trocar provedor, chaves, ambiente ou domínio para contornar a indisponibilidade.

1. Projeto existente: `appgprj_6ac6d3ea9f7881918f315a156338ed52`, audiência pública, revisão do ambiente 20. Público: https://pizzaria-on.netlify.app; backend: https://forno-cardapios.waves4845.chatgpt.site. O gateway Netlify não precisa de novo deploy.
2. A produção v102 é `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_6b9038cb58748191ab19d41f9be5c852`, deployment `appgdep_6adff7c8350c8191b8e41abed276a01c`. Fonte oficial dessa versão: `8c0d28c9df4bbb1474a177d6fda42668f58529cf`.
3. Quando o ambiente estiver disponível, recuperar o checkout em `/workspace/scratch/9812d5225ea5/pizzaria-retomada-20261026` ou abrir novamente a fonte existente pelo helper oficial `site-workflow.mjs`. O repositório nativo é do provedor `cloudflare_artifact`, ramo `main`, remoto `https://git.chatgpt-team.site/856f87e8-f0aa-4bb7-83ee-2921cd7172fe/appgprj_6ac6d3ea9f7881918f315a156338ed52.git`. A SHA do GitHub não substitui uma SHA desse remoto.
4. O último envio nativo efetivamente confirmado antes da queda foi `dfacb6487d906983ee254c9c882825e07f75b5b8`, árvore `775b78c70440f9dce81e1fdc09859100d3a2f973`. Ele antecede a correção final do contexto visual do kit e **não é o pacote final**. Outra execução do helper estava em andamento, mas seu resultado não foi observado; conferir o HEAD remoto, sem assumir sucesso ou falha.
5. Comparar o código/árvore com o `main` atual do GitHub, preservando mudanças posteriores. A referência de aplicação aprovada é a árvore `a2c38138bd4e5ec8fdf688b8ca8802b4b7544ad2`; o commit posterior deste registro altera apenas documentação.
6. Preparar tipos/build e pacote da mesma fonte, confirmar o push nativo, salvar uma nova versão usando a SHA realmente enviada e o pacote correspondente; então publicar essa versão e conferir o resultado. A execução interrompida pretendia gerar `/workspace/scratch/9812d5225ea5/pizzaria-free-pro-reviewed.tar.gz`, mas a existência e correspondência desse arquivo não foram confirmadas.
7. Após o deploy, validar os dois domínios, navegação autenticada/retorno do WhatsApp, data em Brasília, botão Verificar loja, Free/Pro com os quatro prazos e o kit privado sem publicar promoções, aprovar a loja real ou gerar cobrança. Conferir migrações aditivas 0022/0023; não executar limpeza/reset de dados.

Não há segredos neste registro. Usar uma nova credencial nativa de curta duração pelo fluxo oficial quando necessário; não reaproveitar tokens em mensagens, scripts públicos ou workflows do GitHub.

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

**Publicado na v103 em 27/10/2026, às 07:16:18 de Brasília.** A interrupção do ambiente foi resolvida na retomada seguinte. O checkout nativo foi aberto pelo helper oficial, e as quatro diferenças em relação ao GitHub foram reconciliadas antes do build. Tipos e build local passaram. A árvore final conferida é `bf0b0bf62327b9faf1ddb68e012d02f937abe425`, igual à do GitHub `c499cfa792f73a3f1c69bacd221bd980e6472057`; a aplicação corresponde aos 742 testes/Chrome/Windows aprovados acima, com o registro posterior apenas documental.

A publicação foi confirmada pelo Sites com status `succeeded`, audiência pública e ambiente revisão **20**, preservados. Os novos recursos já estão em produção. Não houve novo deploy do gateway Netlify.

## Evidências da publicação concluída

- Público conferido no Chrome: https://pizzaria-on.netlify.app/
- Backend confirmado pela implantação: https://forno-cardapios.waves4845.chatgpt.site
- Fonte oficial enviada: `2daf1813c9838ae200f988fb7aa1ff0029cda07b`.
- Versão: `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_c62941b211d881919fb6d8ca2452dd93`.
- Implantação: `appgdep_6ae079d51ad48191b20755e7b019802b`, concluída em `2026-10-27T10:16:18.218609+00:00`.
- Pacote local: `/workspace/scratch/9812d5225ea5/pizzaria-free-pro-final-20261027.tar.gz`; SHA-256 `8ee94e854e29d4b39fe35192241d8402dcacc86b950426f2f16420d6b39264e1`, 13.187.069 bytes. O arquivo foi produzido pelo helper a partir da fonte acima.
- Armazenamento normalizado do Sites: SHA-256 `aa4a1ac63fd6a3d069187e1432fcb3afbc76174aa005fd6af6abe25c97173bbf`, 28.569.600 bytes, 686 arquivos. A diferença é do formato normalizado, não de código.
- O pacote contém as quatro imagens EFATA e as migrações aditivas 0022/0023. Após o deploy, a visão do banco confirmou 40 tabelas, incluindo `trial_campaigns`; nenhum reset/limpeza foi executado.

Conferência pública após o deploy:

1. A página inicial exibiu Free com duas rodadas de duas sugestões, quatro fotos e textos/artes; Pro por R$49/mês, textos/artes ilimitados e 20 novas imagens por semana; assinatura antecipada preservando os dias restantes.
2. A calculadora pública foi usada de verdade: custo R$20 e margem real de 50% produziram preço R$40/sobra R$20. A troca para o Profissional preservou os valores. Ao mudar para acréscimo e preencher 50%, mostrou preço R$30/sobra R$10 e margem real de 33,3%.
3. O cardápio EFATA abriu no endereço https://pizzaria-on.netlify.app/p/efata-pizzaria, com sete sabores, preços públicos e aviso de loja ainda não verificada. Não aprovamos a loja, concedemos plano, publicamos promoções nem enviamos mensagens em nome do cliente.
4. Na consulta dos logs dos dez minutos finais, os quatro eventos retornados eram 404 de `robots.txt`/`sitemap.xml` por crawler, com nível `info` e outcome `ok`; não houve exceção de Worker nesses eventos. Isso não constitui monitoramento contínuo ou prova de ausência de qualquer erro.
5. Botão administrativo e kit completo continuam cobertos pelo Chrome isolado e testes de integração; não houve sessão administrativa real nesta última conferência pública.

## Continuidade e limites restantes

Esta etapa está publicada: não refazer os planos nem a implementação, não voltar ao pacote anterior `dfacb6487d906983ee254c9c882825e07f75b5b8`. O ponto local ativo é `/workspace/scratch/9812d5225ea5/pizzaria-publicacao-20261027`; o checkout antigo `pizzaria-retomada-20261026` foi preservado e contém alterações de ensaio anteriores.

Android físico, um novo e-mail real concluindo a troca de senha e uma cobrança/renovação externa real do Asaas continuam sem homologação externa; não foram substituídos pelos testes simulados. A próxima validação deve distinguir esses fluxos das provas automatizadas, preservando contas, sessão, dados e o ambiente atual. A EFATA ainda precisa conferir a representação das imagens e aprovar suas promoções e mudanças de visual pelo fluxo normal.

O registro posterior desta publicação muda apenas documentação no GitHub. Não exige outro deploy; a fonte de produção e seus identificadores acima permanecem válidos.

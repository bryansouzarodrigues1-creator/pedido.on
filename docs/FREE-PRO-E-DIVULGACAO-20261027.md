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

Resultado final de CI, publicação e evidência visual será registrado após concluir. A base publicada anterior é a v102 (logo/sessão e dados por imagem). Android físico e um novo e-mail real concluindo a troca de senha continuam sendo verificações externas; não foram substituídos pelos testes de navegador.

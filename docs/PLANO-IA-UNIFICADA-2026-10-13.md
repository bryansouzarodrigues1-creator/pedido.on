# Plano integrado: assistente, leitura, custos e administração
Data: 13/10/2026. Fonte: requisitos confirmados do proprietário e prompt das seções 1–13. Continuação literal das seções 13+ de outra conversa **não integralmente disponível** nesta PR. Não assumir aprovações que não foram dadas.

## Estado base
- Sites público registrado na v28, `main` commit `a2b2e42a9911`. GitHub NÃO publica automaticamente no Sites.
- A PR #13 é draft; o admin Pro/cortesia/suspensão e onboarding IA-first não estão no ambiente público.
- Geração Lovable texto+imagem, OCR Tesseract local, histórico de criações, PWA/Web Push, fluxo de pedidos, categorias e preços, promoções e admin analítico já existem. Reutilizar.
- Asaas apenas PR #1 isolada, sem cobrança real. Resend sem domínio verificado, não declarar envio de recuperação pronto.

## O que a presente branch implementa
1. Admin único de condição comercial por conta, com normal, cortesia Essencial/Pro/Rede (7/30/90 dias ou até revogação), suspensão, razão, versão, trilha de auditoria, reativação e garantia de não rebaixar plano pago superior. Não confundir com comprovante de pagamento. Migração aditiva 0012.
2. Após criação da primeira pizzaria, abrir o mesmo `Criar com IA`, com briefing de estilo preenchido e entrada rápida ao OCR da aba Cardápio; sem chamada de modelo automática.
3. Na mesma interface `StudioChat`, classificar dúvidas comuns sobre bordas, Pix, entrega, promoção, produtos, planos, importação e pedidos com respostas baseadas no código existente. Navegar para a aba correspondente sem chamar Lovable.
4. Edições explícitas de nome e cores/tema passam pelo preview do estúdio existente, pelo mesmo `proposalPatch`, e só chegam ao rascunho com confirmação do dono; a publicação continua separada.
5. Recortes candidatos para screenshots fornecidos pelo próprio pizzaiolo: coordenadas Tesseract delimitam a linha, e uma amostra local de até 384 pixels por lado busca regiões com cor/textura à esquerda ou à direita. Espaços vazios e regiões de cor uniforme não viram fotos; produtos vizinhos limitam a busca. Exigir seleção visual, direito de uso e confirmação antes do upload para R2. Fotografias monocromáticas, layouts complexos e texto mal reconhecido podem exigir envio manual. Nunca aplicar imagens sem revisão nem alegar reconhecimento do alimento. Ver [validação local](FECHAMENTO-MVP-2026-10-13.md).

## Políticas econômicas propostas — NÃO ativadas
- **Trial:** sete dias, sem plano gratuito permanente e sem bloquear contas antigas; fazer cobrança e expiração apenas após Asaas e QA.
- **Cotas candidatas:** 7 imagens e 100 textos por conta no trial inteiro, medidos por execução concluída com retenção de falhas ambíguas e proteção idempotente. As cotas **per owner** não devem bloquear por outra conta usar o limite diário global; substituir limite global de quantidade por um guard de orçamento financeiro e limitações antiabuso, só quando existir medição.
- Custo de referência **fornecido pelo usuário, não conferido em fatura atual:** 0,135 Run credit/imagem, 0,002/texto curto. Estimativa do trial: 7×0,135 + 100×0,002 = **1,145 crédito por pizzaria**; dez pizzarias = 11,45, quarenta = 45,8, **sem infraestrutura, retry, visão, texto extenso ou desenvolvimento**.
- 30 imagens novas a 0,135 consumiriam **4,05 créditos por pizzaria**, antes de refações. Trinta fotos importadas, editadas e recortadas localmente **não** equivalem a trinta gerações. Não lançar 30 gerações automáticas.
- Antes de alterar `imageLimits` e `studioLimits`, validar saldo/consumo atual Lovable, pedir orçamento fechado e implementar ledger de crédito por conta + reserva atômica + job idempotente + orçamento global. Nunca comprar créditos nem forçar Max.

## Lotes seguintes, priorizados
### A — segurança do admin e QA no celular
Backup D1, aplicar 0012 apenas após aprovação de release, verificar proteção da conta administradora e separação entre plano pago, cortesia e suspensão, testar duas pizzarias e pedidos existentes. Exportação CSV semanal agregada e auditada, sem dados pessoais, depois.

### B — importação por arquivos
OCR local recebe até 8 imagens por lote; permitir repetir lote até 30 fontes/itens preservando progresso. PDFs do dono exigem pipeline PDF.js separada e teste de memória; não fingir que o leitor atual já suporta PDF. Fotos associadas por posição são hipóteses, nunca prova. iFood/99Food apenas screenshots voluntários, sem scraping; integrações oficiais são fase distinta.

### C — assistente operacional
Ampliar a roteador tipado de intenções locais: trocar título, cor, slogan, procurar funções, consultar textos do catálogo. Alterações importantes só via operações autorizadas e prévia. Manter o botão/formulário manual para todos os casos. A IA de texto Lovable atende criatividade, não serve para confirmar Pix, estoque, preços ou pedidos.

### D — trial/Asaas e custos reais
Definir planos e franquias pelas margens observadas, depois integrar assinatura Asaas (não Pix da pizza). Preço R$39,90 é hipótese, NÃO substituir preços atuais Essencial 49, Profissional 89, Rede 149 sem nova decisão. Envio de senha via Resend depende do remetente verificado.

### E — analytics verificáveis
Funnel cadastro -> loja criada -> cardápio publicado -> primeiro pedido -> primeiro pagamento SaaS -> renovação. Medir OCR por lotes e falhas, uso por dono e custo IA *estimado* separado do medido. Relatório semanal CSV (só totais agregados). Sem inventar dados de terceiros.

## Liberação
Esta branch não deve ser mesclada automaticamente. Rodar CI completo, inspecionar as imagens/recortes em Android, migrations, QA real de login/tenant/checkout/estado financeiro, e só então reconciliar com trabalho Work da hospedagem Sites. Não modificar produção silenciosamente.

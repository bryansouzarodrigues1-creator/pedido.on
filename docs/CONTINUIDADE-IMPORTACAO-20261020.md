# Continuação da importação — 20/10/2026

A retomada confirmou a v76 pública, fonte Sites `571d8905221c81407d8ff18d9964a91e65020285`, árvore `bb26f3644ba70b6caecba60fba33c5ec32465da0`, correspondente à PR #74 integrada em `13f3618aa5c1f4c9fa8d16de99a11189312b2aae`. A implantação `appgdep_6ad7ce9f6e68819195bbb051d702abc6` terminou com sucesso às 17:29 de Brasília; audiência pública, ambiente revisão 13. Os títulos antigos da documentação que diziam produção v69 estavam atrasados. Chrome `39491215446`, Windows `39491215480`, autenticação/pedidos `39491215479` e benchmark `39491215488` passaram no head final da PR #74.

Foram confirmadas e corrigidas três lacunas adicionais:

- A prévia do painel ignorava fotos recém-confirmadas até o upload. Agora ela mostra os recortes JPEG confirmados dos produtos selecionados, somente em memória. O rascunho continua sendo validado e recebe URLs persistentes apenas após o upload e a confirmação existentes.
- A transferência direta de um projeto antigo para a conta copiava os nomes salvos pelo leitor anterior. Agora a cópia do convidado é reconstruída a partir da fonte preservada antes de salvar no destino e limpar a origem. Esta releitura não é aplicada aos produtos editados de lojas existentes.
- Um link sem produtos podia mostrar o catálogo ilustrativo na primeira prévia, mas ficar vazio após recarga. Uma fonte enviada permanece sem produtos quando a coleta não retorna itens; o aviso de recuperação aparece na prévia e após reabrir. A resposta já obtida é reutilizada durante a sessão.

Os primeiros 526 testes da base v76 e TypeScript passaram. Três regressões novas de prévia/transferência e seus cenários existentes passaram (17 verificações focadas). A regressão Chrome de resposta vazia usa transporte simulado, sem execução externa Apify. Resultados finais serão registrados após os testes e a publicação.

O PDF original de sete páginas foi reaberto nesta sessão e a página de destaques foi renderizada para comparação visual. O teste digital anterior mediu 48/48 nomes/preços e três fotos individuais; isso não significa 48 fotos nem OCR geral perfeito. O benchmark de fotos anterior continua em 13/21 preços exatos. Fotografias compartilhadas e conflitos de preço continuam em revisão.

Apify segue pendente de resultado real e credencial própria no servidor. O contrato atual do Actor foi relido; nenhuma nova coleta paga foi disparada e nenhuma flag foi ativada. Os testes simulados não comprovam extração real iFood. Não há migração, alteração de credenciais, cobrança, geração IA ou envio de mensagem nesta continuação.

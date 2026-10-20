# PDF original e prévia — 20/10/2026

Candidata em validação. Produção ainda v69. Base recuperada da versão Sites v74 (`42fa47e0ae809922d5e7889384c5ab457f254148`).

O PDF Forno & Manjericão original foi reaberto com PDF.js: 48/48 nomes e preços corretos, nenhum produto extra. São 45 entradas prontas e três em revisão por duplicidade/conflito; as duas Margheritas têm valores diferentes no próprio arquivo. A conferência não inventa tamanhos. O diagnóstico de imagem local encontrou as três fotos individuais da página 2; imagens compartilhadas ou ambíguas continuam para revisão.

A prévia usa os produtos do documento, inclusive preços sem tamanho como informação de revisão. A publicação do produto continua exigindo tamanho válido. O dono escolhe um dos modelos; uma escolha existente é preservada quando atualiza o conteúdo. Fotos associadas aparecem em todos os 12 layouts; originais permanecem no aparelho e o painel oferece conferência/recorte. A aplicação de fotos usa o upload privado já existente e a confirmação do dono. Nenhuma foto é gerada nesta leitura.

Correções adicionais da retomada: prévia com rolagem acessível, sem máscara que ocultava valores; releitura do texto guardado do convidado, sem tocar no rascunho editável ou na loja publicada; aviso para reenviar PDFs antigos quando as colunas já foram perdidas; substituição transacional das páginas ao reenviar o mesmo PDF, conservando a leitura anterior em caso de falha; testes Chrome atualizados para exercer a escolha explícita.

Validação até este checkpoint: 520 testes completos e dois novos testes de recuperação passaram; TypeScript passou. PDF.js original: 48/48; associação geométrica das três fotos verificada localmente. Build, CI Chrome/Windows, publicação e comparação dos sete cadastros serão registrados após conclusão. Android físico não foi testado.

Apify: integração do servidor implementada, protegida por configuração/limites e desativada por padrão. Testes de transporte são simulados. Os três ensaios reais anteriores continuam em zero produtos; não há importação real de catálogo concluída. O servidor segue sem APIFY_TOKEN e sem flags de ativação. Nenhuma nova execução paga, mudança de ambiente, migração, cobrança ou mensagem externa nesta retomada.

O ensaio adicional detectou e corrigiu uma regressão: a heurística de duas colunas agora só recebe texto digital e rejeita duas colunas supostas quando há três conjuntos de produtos. O benchmark digital anterior voltou a passar, o PDF original continua 48/48 e a medição OCR permanece 13/21 preços exatos. O aviso de sucesso anterior também é limpo no início de uma nova importação, e o teste aguarda o fechamento da revisão após a persistência.

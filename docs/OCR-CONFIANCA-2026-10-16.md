# OCR: associação de preços e revisão — 16/10/2026

**Continuação v45:** o Chrome do GitHub confirmou uma falha adicional quando apenas uma linha das colunas estava alinhada. A correção usa evidência repetida de produtos/preços em cada lado; 354 testes e dois casos de OCR no navegador passaram na candidata. Publicação às 22:28:23 UTC, fonte `912223a732c851d8ca3c1be80ccd8c3d86b26f8c`. A avaliação de duas páginas de cardápio público real foi insuficiente; a Parte 2 continua aberta. [Resultados e limitações](QA-CHROME-CI-2026-10-16.md).

Atualização de liberação: PR #28 integrada em `6af785a6144758dd7a107b5d66d3efd059bc472f` após CI `38971079784` aprovado; **v44 publicada** em 16/10 às 21:47 UTC. A rodada final de navegador continua pendente porque o Rodrigues está offline. Os limites das imagens reproduzíveis e de Android abaixo permanecem válidos.

Continuação sobre main `9c70dbc931a40f94ed7ef57d1bc4f50f940096bd`, com a v43 publicada. Reaproveita Tesseract local, coordenadas das palavras, armazenamento IndexedDB e a revisão já existente. Não há novo provedor, geração paga, migração ou mudança de dados publicados.

## Problemas reproduzidos e corrigidos

- Dois valores diferentes para G sobrescreviam o primeiro sem aviso; o mesmo ocorria em bebidas e bordas. O campo conflitante agora fica vazio e exige revisão. Uma terceira repetição não apaga o conflito. Repetir o mesmo valor continua permitido.
- Um cabeçalho P/M/G podia associar o preço GG ao G quando a linha trazia P/G/GG. Os espaços dos tamanhos desconhecidos são preservados; o leitor só associa os valores explicitamente conhecidos e exige revisão individual. **O cardápio operacional continua oferecendo P/M/G. Esta mudança não adiciona GG ao carrinho.**
- A média de confiança da linha escondia um número de baixa confiança. A confiança dos valores passa a ser considerada separadamente e sobrevive ao armazenamento/reabertura.
- Um sinal de menos isolado podia desaparecer como ruído, transformando preço negativo em positivo. Sinais relevantes são conservados; negativos, valores incompletos e números com unidades não se tornam preços positivos truncados.
- Fotos sobrepostas ofereciam o mesmo produto duas vezes. A cópia clara pode ser importada uma vez; duplicatas ficam sem seleção. Valores diferentes entre versões exigem escolha, sem eliminar a fonte de nenhuma delas.
- Colunas com títulos desalinhados misturavam nomes e valores. Espaços repetidos entre linhas com produtos/preços dos dois lados agora ajudam a separar colunas. Espaços de uma tabela P/M/G não são tratados como colunas de produtos. Uma linha isolada que misture produtos ou condições de preço exige revisão e não usa o cabeçalho para adivinhar valores.
- Frete e controles como “Ver mais” deixaram de aparecer como produtos.

O mecanismo usa os avisos e a confirmação individual já presentes no leitor. Não publica, não altera o rascunho automaticamente e não substitui preços existentes sem a ação de importação confirmada.

## Verificação realizada

**348 testes do aplicativo aprovados, zero falhas e zero ignorados**, além de TypeScript e build oficial Sites. São 17 testes novos: 16 de associação/confiança/colunas/duplicatas e um de persistência da confiança no IndexedDB. Os casos principais falharam antes das respectivas correções. A CI deve confirmar o commit antes de integrar/publicar.

Tesseract real executado no Linux em **oito imagens reproduzíveis**, sem chamada a modelo: tabela, duas colunas, títulos desalinhados, JPEG inclinado/escurecido e quatro disposições com fotografia de pizza à esquerda/direita, produtos próximos ou sem fotografia. Foram conferidos **30 itens e 38 campos de preço**, sem itens extras ou ausentes nessas amostras. Nos quatro primeiros cenários, 355–561 ms após carregar o worker; nos de foto, 360–647 ms nesta execução. Esses números não medem celular.

As expectativas verificam nome, tipo e todos os preços de cada item da amostra, além dos recortes de fotografia. [Métricas sanitizadas](QA-OCR-CONFIANCA-2026-10-16.json). Reprodução:

```sh
pnpm test
pnpm typecheck
node --experimental-strip-types scripts/check-menu-ocr.mjs
node --experimental-strip-types scripts/check-menu-photo-ocr.mjs
```

## Limites e próximos testes

As imagens acima são amostras reproduzíveis; não são cardápios de clientes reais. Os arquivos antigos recuperados nesta continuação eram capturas de explicações sobre iFood. A busca por cardápios públicos encontrou PDFs, mas o download necessário para executar OCR não foi concluído. Não contar essas consultas como homologação de imagens reais.

O Desktop Commander ficou offline antes desta rodada. Falta exercitar as novas regras na revisão móvel do navegador e no Android físico, com fotos reais de baixa nitidez, colunas de alturas diferentes, tabelas extensas, complementos e limites de memória/bateria. Não se afirma suporte operacional a GG ou importação completa de grupos de adicionais.

Na PR #25, uma auditoria isolada reproduziu aceitação de `available:false`, status `PAUSED` e grupos de opções como objeto. Esses caminhos precisam ser corrigidos separadamente antes de integrar a ampliação pública. Um objeto `price.value` sem contrato de unidade comprovado também não permite afirmar importação fiel de catálogos reais. HTTP 403 continua sendo bloqueio, sem tentativa de contorno.

Contas, sessões, preços, Pix, Asaas, cotas e configurações comerciais não foram modificados por estas correções. Google, recuperação de senha, teste grátis fiscalizado, ciclo financeiro e homologação com dois celulares continuam com os limites registrados no relatório de lançamento.

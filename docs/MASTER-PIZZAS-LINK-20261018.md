# Link compartilhado da Master Pizzas

A mensagem enviada pelo dono em 18/10/2026 era recusada no formulário antes de qualquer consulta externa. O validador aceitava apenas um hífen entre palavras, enquanto o caminho real da loja contém `master-pizzas---buzios-sao-jose`.

A correção aceita sequências de hífens entre palavras e preserva o caminho original. Remove apenas parâmetros de rastreamento na URL canônica. Texto promocional do compartilhamento, inclusive em linhas separadas, não vira produto, nome confirmado, endereço ou horário. Host HTTPS iFood, credenciais ausentes, porta, estrutura da rota, UF e UUID continuam validados.

## Verificação e limites

- 433 testes locais, checagem TypeScript e build aprovados. Três regressões novas cobrem a mensagem exata, limites de validação e a rota real com resposta externa controlada.
- O teste Chrome usa a mensagem exata e uma resposta de bloqueio interceptada no navegador. Confere consulta no mesmo campo, caminho com três hífens preservado, alternativas de arquivo/texto visíveis, continuidade até a prévia e ausência de dados inventados. Não grava contas, cardápios ou pedidos na hospedagem.
- O diagnóstico externo faz somente GET anônimo da URL pública real. Às 22:26:01 UTC de 18/10/2026 retornou HTTP 403, zero produtos e nenhum metadado verificável. A correção do validador não libera o catálogo protegido pelo iFood.
- Teste de interface controlado e consulta externa real são provas distintas. Não anunciar importação real completa, conector oficial ou validação em Android físico.

Resultados finais de publicação e CI em `EVIDENCIA-MASTER-PIZZAS-20261018.json`.

Sites v57 publicado às 19:30:30 de Brasília, fonte `fdf4fd7d15606302c9a93bafe698dde1716732c1`, ambiente 13. PR #64 e mirror #21 integrados após verificações aprovadas. Chrome `39172453189` passou nas nove suítes locais e seis públicas, incluindo a mensagem exata em ambos os ambientes. Os três critérios da regressão passaram, com zero erros; a captura pública foi inspecionada. Windows, autenticação/pedidos e mirror também passaram. Os sete cadastros completos continuam iguais após a rodada pública. A segunda consulta externa, no runner às 22:33:33 UTC, confirmou HTTP 403 sem produtos ou metadados.

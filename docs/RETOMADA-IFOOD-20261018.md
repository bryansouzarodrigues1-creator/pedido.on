# Compartilhamento, nome e retomada do iFood

A captura das 20:08 de 18/10/2026 mostra a v57 reconhecendo o link, mas sem importar o catálogo. Também mostra uma pergunta desnecessária: o nome comercial presente no compartilhamento havia sido descartado.

## Comportamento corrigido

- O nome da legenda do compartilhamento vira uma sugestão com acentos e pontuação preservados. O dono confirma com “Usar este nome” ou edita; nenhum nome é aplicado silenciosamente.
- Mensagem original, sugestão e resultado da consulta ficam no rascunho. Atualizar a página não repete a consulta nem perde a escolha pendente.
- Rascunhos antigos com apenas URL podem oferecer o rótulo do endereço como sugestão explícita. Ele pode conter bairro ou grafia sem acento; não é tratado como nome verificado.
- Endereço, horários e telefone nunca são inventados a partir do caminho. Dados de página pública continuam exigindo confirmação; telefone só vira WhatsApp mediante escolha explícita.
- Alternativas de PDF/foto/texto ficam recolhidas. Ao fornecer produtos ou um arquivo válido, o aviso de conteúdo ausente é removido; mensagem e referência da loja continuam guardadas.
- O mesmo campo permanece montado durante a confirmação. Nenhum cadastro, pedido ou cobrança é criado pelo teste público.

## Limite real e caminho oficial

A consulta anônima da Master Pizzas retornou HTTP 403 na rodada anterior. Nesta rodada, uma extração independente TinyFish da mesma URL retornou `bot_blocked`, sem produtos ou dados de loja. Reconhecer o link e sugerir seu nome não equivale a importar o catálogo.

A documentação oficial disponibiliza Catalog API para produtos e Merchant API para dados da loja e horários. As chamadas exigem autorização. O portal informa cadastro de integradora com CNPJ válido e CNAE de tecnologia, aplicação funcional e homologação para produção; depois disso é necessário acesso autorizado às lojas. Esta rodada não criou aplicativo iFood nem recebeu credenciais para esse conector.

Referências oficiais consultadas em 18/10/2026:

- https://developer.ifood.com.br/pt-BR/
- https://developer.ifood.com.br/en-US/docs/food/guides/modules/catalog/endpoints
- https://developer.ifood.com.br/en-US/docs/food/guides/modules/merchant/endpoints

O próximo trabalho de integração depende de um aplicativo iFood autorizado para os módulos Catalog e Merchant e do vínculo com uma loja de teste. Não exibir um botão de conexão funcional sem esse backend. Não solicitar senha iFood do restaurante nem transformar um bloqueio em produtos fictícios.

## Verificação

Passaram 440 testes locais, TypeScript e build. A regressão de interface usa resposta externa controlada e verifica a mensagem exata, persistência após reload, confirmação por botão, edição, produtos colados e continuidade até a prévia. PDF e OCR usam as bibliotecas reais nos demais cenários; autenticação externa e iFood positivos simulados devem continuar identificados como simulados. Não houve Android físico nesta etapa.

Publicação final v59 confirmada às 20:20:01 de Brasília, fonte `2d380acf54f0538a4379efd3846d185d72228fe6`, implantação `appgdep_6ad5540a065081918d2590b828890326`, ambiente 13. A v58 publicou o mesmo fluxo antes da proteção final para nomes de URL longos ou inutilizáveis. PR #65 e mirror #22 integrados. Chrome `39175964192` passou nas nove suítes locais e seis públicas, incluindo retomada e confirmação por botão com zero erros. Captura pública inspecionada, sete cadastros completos iguais; Windows, autenticação/pedidos e mirror também aprovados. A consulta real no runner retornou 403 novamente às 20:23 de Brasília, sem produtos ou metadados. [Evidências](EVIDENCIA-RETOMADA-IFOOD-20261018.json).

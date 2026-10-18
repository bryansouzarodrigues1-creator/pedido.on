# Forno Azul de Teste — cenário fictício do fluxo inicial

Todos os dados abaixo são fictícios. Não enviar mensagens, publicar a loja ou criar cobranças com estes dados. O link presente na fixture JSON é interceptado somente no QA; não corresponde a uma loja real.

| Campo | Valor de teste |
| --- | --- |
| Nome | Forno Azul de Teste |
| Endereço | Rua Fornalha de Teste, 137, Bairro Fictício, Armação dos Búzios - RJ |
| WhatsApp | (22) 90000-0000 |
| Horários | Terça a domingo, 18h às 23h30 |
| Visual | Azul do mar e amarelo de queijo, fotos grandes e letras legíveis |
| Cardápio | Oito pizzas em três tamanhos e três bebidas, com nomes, ingredientes e preços específicos |

Arquivo de importação: `scripts/fixtures/cardapio-forno-azul-teste.txt`. Dados estruturados e briefing completo: `scripts/fixtures/owner-intake-forno-azul.json`.

## Cenários

1. Descrição completa: nome, endereço, WhatsApp e horários são reconhecidos em uma resposta. O fluxo não pede os mesmos dados novamente. Foto/arquivo anexado ou a opção de cadastrar depois resolve a origem dos produtos.
2. Link com dados públicos estruturados: o dono confere nome, endereço, horários e telefone encontrados. Dados já informados têm prioridade. O telefone não vira WhatsApp automaticamente. Após confirmação, o fluxo pergunta só o que falta e oferece opções de visual.
3. Link bloqueado: o link é guardado, nenhum dado comercial é inventado e as perguntas restantes têm respostas rápidas e possibilidade de preencher depois. Texto, TXT/CSV e prints continuam disponíveis.

A conversa inicial não menciona créditos, chamadas pagas ou economia de geração. Dados conhecidos ficam numa seção recolhida para conferência e edição.

A leitura pública usa dados estruturados do negócio na página aceita do iFood. Endereço corporativo do rodapé, rótulos do link, horários inválidos e múltiplas lojas conflitantes não preenchem dados do dono. A integração oficial continua dependendo de aplicação/loja autorizadas. Um GET externo da URL real fornecida no projeto é registrado separadamente; respostas de teste não são evidência de catálogo real importado.

As gravações de QA usam somente a pizzaria fictícia. Nenhuma conta real foi criada. Os três cenários passaram no Chrome com Pixel 7 emulado, execução `39146567482`, com contraste mínimo de 4,5 nos dados encontrados e sem caixa de rolagem interna. Não é teste em Android físico. Também passaram os 417 testes, TypeScript/build e os CIs Windows e auth/pedidos. Os testes públicos ocorreram na v49 anterior à publicação; a v51 foi confirmada pelo resultado nativo do Sites.

A v51 foi publicada em 18/10/2026 às 13:51:06 de Brasília, preservando o ambiente 13 e todos os sete registros de pizzarias existentes. O GET real da Aione retornou 403 às 13:50; nenhum produto, endereço ou horário real foi importado nessa consulta. O vídeo `fluxo-forno-azul-teste.mp4` identifica permanentemente os dados fictícios e a resposta do link simulada. [Registro de implantação e evidências](EVIDENCIA-FLUXO-OPCOES-20261018.json).

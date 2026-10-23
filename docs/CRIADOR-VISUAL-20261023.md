# Criador visual: primeira coleção utilizável

Pedido de 23/10/2026: corrigir nome, consulta do link, prévias vazias, descoberta dos modelos e conclusão do cadastro.

## Comportamento

- Descrição recomenda localmente um modelo, sem chamada a modelo de linguagem nem geração por visitante. Quatro sugestões iniciais e botão **Ver todos os 80 modelos**, com busca; as 252 identidades antigas continuam válidas para lojas e projetos já salvos.
- Campo de nome sempre visível na prévia. Mais formas naturais de confirmar o nome, sem incorporar a instrução de visual ao nome comercial.
- Link no fluxo rápido passa pela consulta existente, uma vez por envio. Contador de segundos e limite da consulta (até 1 min 40 s considerando configuração e leitura). Dados públicos encontrados exigem confirmação. Bloqueio/erro termina a espera e oferece PDF/fotos/texto.
- Sem produtos reais, a prévia exibe três pizzas, fotos e preços de demonstração com aviso explícito. A transformação é apenas visual: esses produtos e capa não entram no cadastro, rascunho, leitura recuperada nem compartilhamento como produtos reais.
- Produtos e fotos reais já fornecidos têm prioridade. Não associamos foto gerada ao sabor real de uma pizzaria. Capa ilustrativa aparece identificada enquanto não há capa própria.
- Salvar abre os dados da pizzaria e e-mail/senha do acesso existente. Compartilhamento temporário continua como opção secundária de teste.
- Removida a consulta real repetida ao iFood do workflow geral de Chrome. Testes do criador usam uma resposta controlada; não confundem isso com importação real.

## Imagens — lote 1

Quatro fotografias geradas com a ferramenta Imagegen integrada, sem chave/API ou serviço Lovable. Guardadas em `public/assets/pizza-demo-{artesanal,noturna,praia,familia}.webp`, em 1200 × 800, total inferior a 750 KB. As 80 opções são modelos HTML editáveis usando os componentes reais; não são 80 imagens novas ou fotografias de clientes.

Prompt comum: fotografia comercial realista de pizza para modelos editáveis pizzaria.on, composição paisagem 3:2; sem texto, interface, logo, marca d'água ou bordas. Ativo ilustrativo de demonstração.

| Arquivo | Prompt de cena |
| --- | --- |
| pizza-demo-artesanal.webp | Margherita artesanal, borda aerada tostada, mozzarella, tomate e manjericão; mesa de madeira escura, brilho de forno a lenha, luz quente, espaço para título editável à esquerda. |
| pizza-demo-noturna.webp | Pepperoni com mozzarella e manjericão; prato preto sobre pedra carvão, iluminação lateral quente, fundo escuro e espaço para título. |
| pizza-demo-praia.webp | Pizza de queijo, tomate assado e manjericão; pedra clara, linho azul e amarelo, luz costeira natural e espaço claro para título. |
| pizza-demo-familia.webp | Calabresa com cebola, azeitona e mozzarella; fatia separada, mesa creme, guardanapo xadrez vermelho, luz natural acolhedora. |

## Verificação e limites

603 testes locais e TypeScript passaram durante a implementação, incluindo 80 IDs/composições, nomes naturais, prioridade dos produtos reais e isolamento dos exemplos. Chrome, Windows e publicação aprovados; resultados e limites registrados abaixo.

Base reconciliada exatamente com a árvore `f2b90eebaf7aa5beadeccd0d86d047e33574c8d6` da main (`fb5eddd5e7a5df38e348293a502e1a149251eb47`), incluindo PRs #91/#92 do outro chat. A entrega de relatório de bloqueio foi preservada; não há reescrita das contas, esquema ou produtos de produção.

O último ensaio externo do iFood segue HTTP 403 e zero produtos. Esta correção de interface não vence bloqueios externos nem comprova extração completa de fotos e opções. Não houve nova consulta real nesta etapa. Nenhuma migração, cobrança, mensagem, alteração de chave ou compra de créditos.


## Publicação concluída — 23/10/2026, 13:45 de Brasília

Versão Sites **83** publicada com status `succeeded`, ambiente revisão **13**, fonte `80c9f0e0e28f83ef14a43bf6c34c378c3d8d4c67`, árvore `d54e2298d3e4316eaa5f4c3327474f6ed8f64d65`, implantação `appgdep_6adb8f010ee4819189552a52d74ad664`. PR principal **#93** e espelho **#47** integradas. O espelho inclui as quatro fotos também na pasta pública do Lovable e testes do criador atualizados.

Passaram **603 testes**, TypeScript, build, Chrome, Windows, autenticação/pedidos e build/testes do frontend Lovable. Chrome [39988570240](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39988570240), Windows [39988570243](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39988570243), auth/pedidos [39988570248](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39988570248), mirror [39988579805](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/39988579805). Oito cenários do criador, consulta por resposta simulada, PDF/OCR, carrinho e entrega de bloqueio aprovados; screenshots da galeria de 80 e preços/fotos inspecionadas. Pixel 7 emulado, sem teste em Android físico.

Produção: `/healthz` e `/criar` responderam **200**. As quatro fotos públicas foram baixadas e comparadas byte a byte com os arquivos revisados. Os **sete cadastros completos** foram comparados antes/depois e permaneceram idênticos; sem migração ou escrita de teste em produção.

Lovable recebeu publicação do commit de merge `ac0741b7bf83e995cfa227a8ec95c20d36ed6e86`, deployment `5c3c9eaa-2da3-4133-9852-8428ef34d3fe`; resposta inicial da API `pending`. A disponibilidade pública foi confirmada por GET em `/criar` e nas quatro fotos novas, todas 200 e idênticas à fonte. Nenhuma nova geração ou crédito Lovable foi usado.

[Aplicativo](https://forno-cardapios.waves4845.chatgpt.site/criar) · [Lovable](https://pizzaria-on-estilos.lovable.app/criar) · [Evidência sem dados privados](evidence/criador-visual-20261023.json).

A evidência de Chrome público da CI ocorreu antes da v83, na versão anterior. A nova candidata passou no Chrome isolado; depois da publicação houve checagem HTTP dos dois domínios e das novas fotos, não criação de clientes reais. A primeira rodada detectou a regra de colunas do carrossel e a altura da prévia; foram corrigidas antes de publicar. O último resultado real do iFood continua **403/zero produtos**, sem nova tentativa nesta etapa.

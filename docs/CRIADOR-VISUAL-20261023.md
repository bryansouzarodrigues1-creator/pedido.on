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

603 testes locais e TypeScript passaram durante a implementação, incluindo 80 IDs/composições, nomes naturais, prioridade dos produtos reais e isolamento dos exemplos. Chrome/Windows e publicação devem ter seus resultados reais registrados após concluir.

Base reconciliada exatamente com a árvore `f2b90eebaf7aa5beadeccd0d86d047e33574c8d6` da main (`fb5eddd5e7a5df38e348293a502e1a149251eb47`), incluindo PRs #91/#92 do outro chat. A entrega de relatório de bloqueio foi preservada; não há reescrita das contas, esquema ou produtos de produção.

O último ensaio externo do iFood segue HTTP 403 e zero produtos. Esta correção de interface não vence bloqueios externos nem comprova extração completa de fotos e opções. Não houve nova consulta real nesta etapa. Nenhuma migração, cobrança, mensagem, alteração de chave ou compra de créditos.

# Assistente do dono — Pro

Adição solicitada em 29/10/2026, sobre a v109. O dono mantém o editor completo em todos os planos. O Pro acrescenta o assistente que prepara mudanças de cardápio, preços, promoções, disponibilidade, horário, informações, visual e textos para revisão. O atendente dos consumidores continua separado e não recebe privilégios de edição.

## Caminho econômico

1. Pedidos claros são tratados por regras da própria plataforma. Não criam tarefas de IA nem consomem reservas: promoção de um produto/tamanho, mudança de preço, reajuste percentual das pizzas, pausa/retorno de um produto, horário, endereço/cidade, taxa de entrega, pedido mínimo, abertura/fechamento e entrega/retirada. Nome e estilos já conhecidos são reaproveitados.
2. Para cadastrar uma pizza ou bebida com nome, tamanho e preço explícitos, o assistente monta a prévia sem inventar ingredientes, fotos ou novos preços. Categoria ambígua e informações faltantes ficam para conferência no editor.
3. Quando faltam produto, tamanho, preço ou validade, o assistente pede somente esses dados. Nomes parecidos e seleção contraditória não escolhem um sabor automaticamente. Datas são apresentadas em Brasília; valores incompletos não viram descontos inventados.
4. Textos e visual criativos podem usar o modelo editorial já publicado, após o botão **Usar IA para esta ideia**. Envia a loja e os produtos relevantes, limitando a um produto quando escolhido. Reutiliza tarefas de uso único, idempotência, franquia de texto e orçamento global existentes. Não gera outra imagem, não amplia limites e não chama o construtor Lovable.
5. Comandos não reconhecidos oferecem exemplos ou o editor. O modelo publicado não foi transformado num agente irrestrito: ele gera somente os campos editoriais do contrato existente. Preços, promoções e configurações são compilados pelas regras locais. Pedidos com várias ações são divididos para revisão; combos usam o editor de composição já existente.

## Controle do proprietário

O botão **Assistente do dono · Pro** fica no resumo do painel e abre o recurso junto do Estúdio. A prévia mostra cada antes/depois e pode abrir o cardápio com a proposta. **Usar alteração no rascunho** altera somente o estado local; salvar/publicar usa os controles normais, com revisão otimista. Se o rascunho mudar depois da prévia, aplicar fica bloqueado até preparar novamente. Campos já completados são preservados nessa nova preparação.

O servidor confirma sessão, propriedade da pizzaria e Pro ativo a cada pedido, incluindo ações diretas. O Essencial mantém todos os editores manuais e a divulgação já contratada. Suspensão ou expiração não permite novas solicitações do assistente. Dados de conta, assinatura, senha, verificação e recebedor Pix usam seus controles específicos; não são alterados pelo assistente.

`POST /api/restaurants/[id]/owner-control` exige origem e CSRF. Snapshot e opções seguem os esquemas existentes da loja; imagens precisam pertencer à pizzaria. O modelo só pode devolver visual e textos validados pelo contrato atual. Saídas com preço, Pix ou outros campos fora do esquema são recusadas; falhas ambíguas não são repetidas automaticamente.

## Verificação e limites

- 792 testes do conjunto local passaram antes da verificação em navegador; tipos aprovados. Os novos cenários incluem preços exatos, promoções incompletas, nomes parecidos, validade, reajustes, edição literal, planos/propriedade/CSRF, zero geração em ações diretas, reutilização de chamada e recusa de saída indevida do modelo.
- A verificação Chrome usa uma conta oficial local e um Pro sintético, em D1 descartável. Confere formulário/centavos, prévia sem gravar, bloqueio de prévia antiga, aplicação local, publicação explícita e perda do recurso após voltar ao Essencial, mantendo o editor manual.
- IA externa é simulada nos testes. Não houve geração real ou edição paga no Lovable; o serviço continua com seu contrato publicado. A inferência real por este novo painel ainda precisa de homologação autorizada.
- Nenhuma migração, cobrança, alteração de sessão, chave, conta real ou cardápio de cliente é parte da implementação. Pesquisa/integração FLUX e testes físicos de Android continuam com suas dependências anteriores.

## Evidências da entrega

O cenário dedicado passou no Chrome em 29/10/2026, usando D1 e identidade local descartáveis. As quatro verificações confirmaram preparo sem gravação, campos de valor/data em Brasília, bloqueio de prévia antiga, aplicação somente no rascunho, publicação explícita e recusa no Essencial. As telas foram conferidas a 320, 412, 768 e 1280 px.

O cenário usa um banco separado das suítes anteriores, mantendo o limite atual de uma pizzaria publicada no Pro. A primeira execução compartilhada recebeu a recusa correta de uma segunda publicação; o isolamento foi corrigido sem ampliar permissões ou mudar os planos.

- Código funcional testado no GitHub: `87a55417dd19fa6cfbefe130a9630b358fa94af5`.
- Chrome dedicado: job `123486895928`, run `40885151507`, artefato `12901449042`; quatro verificações e zero erros.
- Tipos/build locais e 792 testes aprovados; 17 regressões finais passaram após os ajustes de interface e plano.
- [Relatório estruturado](EVIDENCIA-ASSISTENTE-DONO-20261029.json).
- [PR #149 — estado final dos checks, fonte e publicação](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/149).

A inferência real pelo novo assistente continua sem homologação nesta etapa: os testes de integração com IA usaram transporte/modelo simulados, com idempotência e limites reais do aplicativo.

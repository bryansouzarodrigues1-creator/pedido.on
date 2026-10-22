# Robô próprio de cardápio — 22/10/2026

O criador real e a extensão 0.4.0 já estão publicados em `https://pizzaria-on-estilos.lovable.app`. O guia `/extensao` oferece o download; o criador apresenta “Baixar extensão e exportar meu cardápio”. Não houve reconstrução do fluxo ou nova geração Lovable nesta continuação.

A nova execução `tools/ifood-capture-runner/` reutiliza o extrator e os formatadores da extensão. Uma tarefa abre o link numa sessão anônima descartável, rola os produtos visíveis e gera TXT/JSON para revisão. O workflow manual permite executar no GitHub Actions, sem instalar a extensão no computador do cliente e sem contratar servidor permanente. Ele utiliza a cota de Actions existente.

Não é um serviço automático já conectado ao botão de importação. Nenhuma rota pública, fila de produção ou infraestrutura paga foi ativada. Uma captura acessível ainda precisa ser validada com cardápio real completo. Um bloqueio do iFood deve aparecer como `blocked`, com zero produtos exportados.

## Verificação desta entrega

- Políticas locais: URL canônica, restrição de rede/escritas, itens virtualizados, preços conflitantes, limite de 200 e TXT interpretado pelo leitor real.
- Chrome em CI: DOM real com carregamento durante rolagem, lista virtualizada, centavos, 403/429, CAPTCHA, login, página vazia, orçamento de tempo/rolagem e redirecionamento inseguro. Respostas desses cenários são sintéticas.
- Consulta pública separada: link da Master Pizzas fornecido anteriormente pelo proprietário, uma tentativa sem login e sem alteração de dados. Resultado em 21/10/2026 às 21:10:44 de Brasília: HTTP **403**, `blocked`, zero itens e zero produtos exportados. Execução [39698042443](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39698042443), commit `12257424661cfa1cf88e6fbf4650fe9c1e1afede`. Os 12 cenários sintéticos em Chrome passaram, além de 570 testes locais de backend e TypeScript. Artefato `12390588843`, SHA-256 `747b1da53f1773de13e6ef146175155b25f8234af8e6c5a68b73d131a6fdf9d4`.

O backend publicado permanece na v81; contas Supabase, sessões, D1/R2, pedidos e dados das pizzarias não são alterados pelo runner. O espelho de código continua no repositório conectado ao Lovable.

## Uso

[Guia completo e limites](../tools/ifood-capture-runner/README.md). O TXT produzido entra no criador por arquivo ou colagem; pizzas sem tamanho continuam aguardando escolha, e preços ambíguos não são promovidos a valores confirmados. `capture-review.json` preserva pendências para inspeção.

O primeiro uso comercial deve priorizar a extensão no computador do responsável quando ela consegue abrir a loja. A execução remota oferece uma tentativa por link e relatório verificável; não elimina bloqueios do provedor.

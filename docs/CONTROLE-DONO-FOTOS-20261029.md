# Controle do cardápio e fotos pelo assistente Pro

Continuação da v110, preservando o projeto, contas, sessões e dados existentes. A edição manual permanece completa no teste e no Essencial com acesso ativo. O assistente do dono exige Pro no servidor e no painel.

## Alterações

- O dono pode pedir para trocar a foto de um produto, a capa ou o logo. O assistente pede o produto quando necessário, recebe uma imagem JPG/PNG/WebP de até 2 MB ou reutiliza uma foto da própria loja. A prévia mostra a imagem anterior e a escolhida. Também aceita remover uma imagem.
- O upload grava somente o arquivo; não muda o rascunho salvo nem o cardápio público. **Usar alteração no rascunho** aplica a proposta localmente; salvar/publicar continua nos controles existentes do painel.
- Pedidos literais de novo nome de produto, destaque, slogan, descrição da loja, WhatsApp e Instagram usam funções locais, sem chamar um modelo. Nomes de produtos duplicados e seleções contraditórias pedem revisão. Os dados e valores não informados são preservados.
- A API valida também as imagens da proposta, impedindo usar arquivos de outra pizzaria. O editor manual continua salvando fotos em planos sem o assistente.
- Alterar os campos de uma solicitação invalida a proposta anterior. O dono precisa preparar novamente antes de aplicar.
- Inclui a recuperação de arquivos após publicação da PR #151: uma única recarga GET, com trava por aba, preservando sessão e rascunhos. Não repete alterações, pagamentos ou gerações; recuperação de senha e URLs com tokens ficam nos controles manuais.

## Uso

Painel → **Assistente do dono · Pro**. Exemplos:

- “Troque a foto da Margherita” → enviar ou escolher foto → preparar → conferir → usar no rascunho.
- “Troque a capa” ou “Remova o logo”.
- “Mude o nome da Margherita para Marguerita da Vovó”.
- “Destaque a Calabresa” ou “Retire a Calabresa do destaque”.
- “Mude o slogan para Da nossa família, para a sua.”

## Validação e limites

Testes exercitam as rotas e o armazenamento descartável: upload, prévia, isolamento entre lojas, bloqueio sem Pro, edição manual no Essencial e preservação da versão pública. A suíte Chrome inclui enviar uma imagem sintética, conferir a prévia, aplicar foto/nome e publicar explicitamente, além da recuperação única após falha simulada de módulo.

Texto criativo e visual continuam usando o serviço editorial existente quando solicitados. Geração de uma imagem nova continua no Estúdio. Não houve chamada ao construtor Lovable, geração real, compra de créditos ou operação financeira. O assistente atua nos recursos da própria loja; não executa código livre nem altera privilégios da plataforma.

## Resultado confirmado

**v111 publicada em 29/10/2026 às 15:52:58 de Brasília**, ambiente revisão 20 e audiência pública preservados. Endereço em uso: https://pizzaria-on.netlify.app/ . PRs [#151](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/151) e [#152](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/152) integradas.

- **799/799 testes locais**, zero falhas; tipos e build oficial aprovados. Os testes usam serviços externos simulados.
- [Chrome](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40933440837): core, welcome-kit e owner-control aprovados. O assistente passou em sete verificações, incluindo upload, prévia sem gravar, nome/foto, publicação explícita, bloqueio no Essencial e recuperação única após falha de módulo. Quatro larguras: 320/412/768/1280 px.
- [Windows](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40933440912): tipos, regressão completa e build aprovados.
- Artefato Chrome do assistente `12923721620` conferido por SHA-256 `85030a62e87223451a8e2211089b64a8891d618bbbc5719ecf344a9913f23cfc`. Resumo com sete verificações aprovadas, zero erros; captura móvel da prévia inspecionada.
- Fonte funcional GitHub `ddc504918da9462f65bfb2a1435db36ca655e5e9`, merge `e2d35c65a6e2d395b5e65313f4a28a9ed16f807b`. Árvore `20b1682d6382755d9578afe52c5944175b1d361c`, igual à fonte nativa publicada `ed543c9a0c7a0c0b16bac615752dbfb9ee5bdcef`.
- Versão salva `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_207ca769d7d481919404807a9a386c0e`; implantação `appgdep_6ae395efa8888191949c03cb6ce71fc0` com resultado nativo `succeeded`.

A prévia gerenciada local recusou a conexão; os ensaios interativos novos ocorreram no Chrome isolado do GitHub com identidade, loja, concessão Pro e imagem sintéticas. Nenhuma conta de cliente, operação financeira, mensagem externa ou geração paga foi usada. Android físico e sessão real de cliente em produção continuam fora desta homologação. A atualização seguinte de documentação não muda o aplicativo da v111.

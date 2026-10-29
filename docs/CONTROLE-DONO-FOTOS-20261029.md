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

Resultados finais e versão publicada serão registrados após a conclusão das verificações.

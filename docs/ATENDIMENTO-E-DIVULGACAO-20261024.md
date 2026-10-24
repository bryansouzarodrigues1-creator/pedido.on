# Atendimento por link e divulgação diária

## Fluxo do cliente

- PDF, TXT/CSV e fotos continuam sendo lidos no aparelho, com revisão de produtos, preços, tamanhos e fotos.
- A opção **Solicitar trazer meu cardápio via link** substitui a tentativa automática. A entrada pública guarda apenas o endereço validado da loja neste navegador e leva à conta. Ainda não promete uma solicitação enviada nessa etapa.
- Depois de entrar ou criar a pizzaria, o painel abre o formulário com o link guardado. O responsável informa WhatsApp com DDD, confirma a loja e autoriza contato. Só **Enviar solicitação de cardápio** cria o registro privado.
- O cliente vê protocolo, recebimento e andamento, pode cancelar e recebe o catálogo para revisão. O prazo é combinado no atendimento; não existe prazo automático inventado. A entrega não altera o rascunho nem publica preços ou fotos.
- Colar mensagem de compartilhamento inteira do iFood é aceito; somente uma loja e seu endereço canônico vão ao atendimento. Nome de URL é sugestão para confirmar, nunca dado verificado.

## Atendimento do administrador

Em **Administração → Importações assistidas** (`/admin/importacoes`), veja link, protocolo, WhatsApp autorizado e observação. Abra a loja solicitada, expanda e confira as categorias disponíveis e use a extensão existente. Gere um código de uso único, envie fotos e entregue o catálogo. Os mesmos controles de identidade da loja, validade, limites e propriedade permanecem. O conteúdo pode ser parcial se a origem não exibir todos os itens; confira as pendências. Nenhuma mensagem ao WhatsApp é enviada automaticamente.

O cliente acompanha a entrega no painel; Web Push só funciona quando já habilitado e autorizado. Isso não é WhatsApp automático nem captura remota homologada. Os módulos oficiais e do runner são preservados para trabalho futuro, mas não são anunciados como caminho automático do cliente.

## Aplicativo

O convite aparece no topo da entrada e do painel, independentemente da importação. O X o move ao fim da página e persiste sem expiração no armazenamento desse navegador. Recarregar, trocar de tela ou entrar na conta mantém a preferência; limpar dados do navegador a remove. Quando o navegador oferece instalação nativa, o botão usa esse convite. Nos demais casos mostra instruções. Não abre prompts, solicita permissões ou instala sozinho. Atualização do aplicativo continua separada e respeita rascunhos em edição.

## Ideias para vender hoje

Após os produtos importados entrarem no rascunho, **Cardápio** mostra sugestões diárias de sabores e um combo. **Ofertas** também contém as sugestões e o editor existente. Elas variam pelo dia de Brasília, sem tarefa agendada, sem chamadas a modelos e sem consumo de tokens. São sugestões por regras; não fingem usar dados de demanda ou margem.

O cliente pode conferir preço, itens e validade, salvar a oferta no rascunho e publicá-la. Nenhum desconto é aplicado sozinho; o combo começa na soma dos preços atuais. Textos para WhatsApp/Status e PNGs de 1080×1080 e 1080×1920 usam nome, preço e fotos dos produtos existentes. Produtos sem foto usam composição de cores e texto, sem inventar uma fotografia. A versão pública é consultada ao compartilhar, para recusar preços ou fotos divergentes. Sugestões de combo só são divulgadas pelo estúdio existente depois da aprovação/publicação da oferta.

## Validação

Testes locais de regras, rotas reais em workerd/D1/R2 com identidade simulada e compilação; CI Chrome inclui a solicitação, consentimentos, fila do administrador, entrega de fotos/catálogo, revisão e isolamento, além de sugestões, aprovação, persistência do X, textos e os dois PNGs. O ambiente de prévia gerenciado não ficou acessível no navegador nesta rodada; não foi substituído por servidor improvisado.

Registrar os resultados finais de CI e a versão publicada antes de considerar a entrega concluída. Sem captura iFood real, envio de WhatsApp, instalação física no Android, geração paga, cobrança, migração ou alteração de contas/chaves.

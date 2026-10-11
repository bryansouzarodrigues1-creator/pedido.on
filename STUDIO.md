# Criar com IA

O painel tem uma área única **Criar com IA** para visual/textos, logo, capa, perfil e foto de produto. A demonstração pública em `/demo/estudio` usa somente estilos prontos, sem chamadas pagas.

## Uso

1. Escolher o que criar e, no caso de foto, um produto cadastrado.
2. Escrever a ideia ou usar o exemplo. Uma imagem é solicitada diretamente, sem gerar texto antes.
3. O painel salva o rascunho antes de enviar o pedido para a IA.
4. Conferir o resultado e escolher **Usar no cardápio**.
5. **Publicar/Atualizar** no painel é a ação que disponibiliza a mudança aos clientes.

Os estilos prontos estão numa opção recolhida e não usam o limite de IA. A interface começa com IA quando ela está habilitada; a cota só é usada após um pedido explícito. Fotos ilustrativas usam o nome e a descrição cadastrada. O dono deve conferir se a imagem corresponde ao que vende.

## Proteção e limites

- Rotas administrativas exigem sessão, propriedade, origem e CSRF válidos.
- O modelo de texto recebe marca e até 12 produtos, sem Pix, clientes, pedidos, preços ou credenciais.
- Retorno JSON estrito: somente estilo, cor, frase e descrições. IDs inválidos/duplicados e mudanças de preços/pagamentos são rejeitados.
- Imagens válidas PNG/JPEG/WebP de até 5 MB vão para o R2 da loja. Aplicação conserva os textos e preços atuais; prévia antiga não sobrescreve alterações recentes.
- Texto: 20 por proprietário/mês e 20/dia na plataforma. Imagem: 3 por proprietário/mês e 2/dia na plataforma. Criar outra pizzaria não multiplica a cota do dono.
- Request ID idempotente, token de uso único, hash, expiração e reserva atômica no D1. Nenhum retry pago automático. **Ver resultado** repete o mesmo ID e reaproveita o resultado quando disponível.
- O Worker usa `redirect: "manual"`; tokens não são encaminhados a redirects. `redirect: "error"` não funciona no runtime de produção.
- `attempt: cancelled` indica falha anterior ao claim ou saldo recusado com devolução. `failed` indica falha após claim; `pending` indica pedido em andamento. O cliente distingue esses estados sem avisar desconto quando ele não ocorreu.

## Integração ativa

Serviço: https://pedido-on-estudio.lovable.app. Rotas `/api/pedido-on/studio` e `/api/pedido-on/image`; chave gerenciada somente no servidor. Nenhum segredo vai para o app ou navegador. Stripe permanece uma etapa independente, desativada.

93 testes do aplicativo passaram, com provedores simulados e dois testes em workerd. Um texto e uma imagem reais passaram no serviço, com claim simulado no teste interno. A conexão dos dois endpoints foi confirmada em produção via saúde. O ciclo completo na loja autenticada e a revisão visual do celular continuam pendentes; não confundir esses níveis de validação.

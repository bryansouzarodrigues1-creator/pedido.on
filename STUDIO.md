# Criar com IA

O painel tem uma área única **Criar com IA** para visual/textos, logo, capa, perfil e foto de produto. A demonstração pública em `/demo/estudio` usa somente estilos prontos, sem chamadas pagas.

## Uso

1. Escolher o que criar e, no caso de foto, um produto cadastrado.
2. A criação começa em **Imagem para a pizzaria**: a ideia segue diretamente ao gerador de imagens, sem texto intermediário. “Gere algo marcante de pizza de queijo” cria uma arte horizontal que pode ser usada como capa. Pedidos de logo/perfil/foto são reconhecidos; uma foto exige escolher um produto da própria loja. Trocar o tipo de criação conserva a ideia escrita.
3. O painel salva o rascunho antes de enviar o pedido para a IA.
4. Conferir o resultado e escolher **Usar no cardápio**.
5. **Publicar/Atualizar** no painel é a ação que disponibiliza a mudança aos clientes.

**Cores e textos do cardápio** é uma escolha explícita para sugestões de texto e parâmetros, sem prometer uma imagem. Pedidos de arte ou de imagem enviados por um cliente antigo a essa rota são recusados antes de gastar texto. Os estilos prontos estão recolhidos e não usam IA. Não há substituição automática de uma imagem por prévia do cardápio.

O prompt visual do dono segue completo ao serviço. As cores e o estilo atuais são referências secundárias e não substituem a aparência pedida. Fotos ilustrativas usam os alimentos informados no produto e no pedido do dono, sem acrescentar ingredientes por conta própria. O dono confere a fidelidade antes de usar.

## Proteção e limites

- Rotas administrativas exigem sessão, propriedade, origem e CSRF válidos.
- O modelo de texto recebe marca e até 12 produtos, sem Pix, clientes, pedidos, preços ou credenciais.
- Retorno JSON estrito: somente estilo, cor, frase e descrições. IDs inválidos/duplicados e mudanças de preços/pagamentos são rejeitados.
- Imagens válidas PNG/JPEG/WebP de até 5 MB vão para o R2 da loja. Aplicação conserva os textos e preços atuais; prévia antiga não sobrescreve alterações recentes.
- Texto: 20 por proprietário/mês e 20/dia na plataforma. Imagem: 3 por proprietário/mês e 2/dia na plataforma. Criar outra pizzaria não multiplica a cota do dono.
- Request ID idempotente, token de uso único, hash, expiração e reserva atômica no D1. Nenhum retry pago automático. **Ver resultado** repete o mesmo ID e reaproveita o resultado quando disponível.
- O Worker usa `redirect: "manual"`; tokens não são encaminhados a redirects. `redirect: "error"` não funciona no runtime de produção.
- `attempt: cancelled` indica falha anterior ao claim ou saldo recusado com devolução. `failed` indica falha após claim; `pending` indica pedido em andamento. O cliente distingue esses estados sem avisar desconto quando ele não ocorreu. Falhas não são transformadas automaticamente em resultados locais; estilos prontos são escolhidos explicitamente.

## Integração ativa

Serviço: https://pedido-on-estudio.lovable.app. Rotas `/api/pedido-on/studio` e `/api/pedido-on/image`; chave gerenciada somente no servidor. Nenhum segredo vai para o app ou navegador. Stripe permanece uma etapa independente, desativada.

134 testes do aplicativo e typecheck passaram nesta correção. Um teste integrado atravessa o pedido exato do celular, rota de imagem, autorização de uso único, handler Lovable, bytes e aplicação explícita ao rascunho, com modelo e armazenamento externos simulados. Três gerações reais de texto do proprietário foram comprovadas no Sites/D1 em 11 e 12/10/2026. O ciclo real de imagem autorizada, R2 e aplicação ao rascunho ainda depende da validação em produção. O serviço não precisou de outro build Lovable nesta etapa.

# Estúdio da pizzaria

O painel possui um chat com duas modalidades explicitamente distintas. **Estilos** funciona sem modelo, usando layouts, cores e uma chamada fornecida pelo dono. **IA** usa o serviço Lovable somente quando habilitado no servidor. O protótipo publicado nesta atualização mantém a IA de textos desabilitada até a etapa de ativação autorizada.

## Experiência

1. Abrir **Minha loja → Abrir o estúdio**. A demonstração pública está em `/demo/estudio`.
2. Escrever a direção desejada e, se necessário, selecionar um produto.
3. Conferir layout, cor, chamada, descrição e imagem proposta na prévia.
4. Uma imagem exige clicar em **Gerar uma imagem**. Nunca é gerada automaticamente por uma mensagem. A IA sugere um briefing, sem fingir que a imagem existe.
5. **Aplicar ao rascunho** preserva a loja publicada. **Salvar e publicar**, no painel, continua sendo a ação que publica o cardápio.

Logo, perfil e capa usam o serviço de imagens existente. Fotos ilustrativas de produtos exigem a versão atualizada do serviço e a ativação do estúdio. Imagens de produtos usam o nome e os ingredientes cadastrados; o dono deve revisar a fidelidade da foto antes de publicá-la. Os dois protocolos continuam sujeitos às cotas existentes.

## Segurança e limites

- As rotas administrativas exigem sessão, propriedade da pizzaria e origem/CSRF válidos.
- O modelo recebe somente marca, até 12 produtos e até 4 mensagens curtas de contexto. Não recebe Pix, pedidos, clientes, comprovantes, preços ou credenciais.
- O retorno é um JSON estrito. Somente layout, cor, chamada e descrições podem mudar. IDs desconhecidos, IDs duplicados e alterações de preços/pagamentos são rejeitados. A seleção de produto também é conferida no servidor.
- Imagens ficam no R2 da loja; aplicar a imagem não altera nomes, preços ou ingredientes. A prévia usa a base capturada da loja e não pode sobrescrever alterações feitas depois dela.
- Cota de texto: 20 tentativas por proprietário/mês, 20/dia na plataforma e proteção de frequência. Criar outra loja não multiplica a cota. Cota de imagem preservada: 3 por proprietário/mês e 2/dia na plataforma.
- Cada solicitação paga possui um ID idempotente, token de uso único armazenado como hash, expiração e reserva atômica no D1. Conferir a mesma tentativa não faz outra chamada ao modelo. Não há repetição automática de uma geração.
- Erros antes do claim não consomem a cota. Rejeição explícita 402 devolve a tentativa. Falhas ambíguas após o claim permanecem contadas para evitar chamadas pagas repetidas.

## Ativação posterior

A fonte do serviço está em `services/image-service` no repositório GitHub. O novo endpoint `/api/pedido-on/studio` está preparado nessa fonte, mas precisa ser construído e publicado na Lovable. O serviço usa apenas a chave gerenciada `LOVABLE_API_KEY` no servidor, um modelo fixo e limite de 1800 tokens de saída. O custo exato deve ser medido na plataforma; limites de tentativas não equivalem a um teto financeiro.

Após publicação e testes autorizados, configurar `PEDIDO_STUDIO_ENDPOINT` e `PEDIDO_IMAGE_ENDPOINT` com as URLs verificadas e `PEDIDO_STUDIO_ENABLED=true`. A chave da Lovable nunca vai para o aplicativo principal nem para o navegador. O gateway de cobrança da plataforma segue desativado e é uma etapa independente.

Testes usam SQL das migrações e provedores simulados; não gastam créditos. Não comprovam geração real, custo ou qualidade visual das imagens. O guia de ativação do GitHub registra a etapa paga ainda pendente.

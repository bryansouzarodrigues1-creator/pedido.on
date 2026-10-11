# Chat integrado por pedido (beta)

O cliente **não cria uma conta**. Seu link privado de acompanhamento contém um token criptograficamente aleatório no fragmento `#`, cujo hash já é validado pelo servidor antes de acessar mensagens. Nunca colocar o token na URL da API, no texto do chat, em logs ou analytics.

- Conversa só é aberta após a criação do pedido. Mensagens permanecem no D1 ligadas ao pedido; o dono autenticado enxerga apenas conversas de sua própria pizzaria.
- Cliente e pizzaiolo têm uma caixa de mensagens com atualização automática a cada ~6 segundos **com a página aberta**.
- O WhatsApp aparece como link menor, para conversa externa ou após encerramento.
- Texto até 1000 caracteres; proteção de tamanho, limite de chamadas e teto de 100 mensagens por pedido. A interface trata falha de conexão.
- Quando o pedido é entregue ou cancelado, chat fica em modo leitura e o WhatsApp segue disponível.
- `drizzle/0008_order_chat.sql` adiciona a tabela `order_messages`; não executá-la antes de backup e checagem da tabela 0007.
- **Ainda não há Web Push** nem notificações quando o PWA está fechado; não comunicar essa promessa.
- **O chat não exige IA**, não chama Lovable e não consome créditos de geração.
- Sem migração D1 e deploy confirmado, a funcionalidade não estará disponível no site público.

## Checklist de lançamento

1. Validar CI, casos de posse do pedido, invasão entre lojas e chat de pedido encerrado.
2. Aplicar a migração nova na base correta após backup, inspecionar `drizzle` journal e sem sobrescrever dados.
3. Atualizar a hospedagem do site com esta revisão.
4. Testar simultaneamente nos dois celulares (cliente com link privado, pizzaiolo logado); verificar envio, leitura, comportamento após fechar navegador e fallback WhatsApp.
5. Definir retenção das mensagens e aviso de privacidade antes de escalar para muitas pizzarias.

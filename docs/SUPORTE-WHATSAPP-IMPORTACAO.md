# Suporte WhatsApp — solicitações de importação

## Canal único, configurável

O contato público de suporte do Pizzaria.on é lido de `PEDIDO_SUPPORT_WHATSAPP` no ambiente do servidor (Cloudflare). **Não grave números reais de atendimento diretamente em componentes, testes ou no repositório.**

Formato aceito: telefone móvel brasileiro, com DDD, como `+55 (DD) 9XXXX-XXXX` ou `55DD9XXXXXXXX`. O backend valida e normaliza para o formato internacional sem símbolos; número ausente ou inválido nunca vira um link fictício.

Configurar no ambiente de teste primeiro, verificar o nome do número na interface do proprietário e o link `wa.me`. Depois, somente com aprovação, configurar também o ambiente público. A configuração não envia mensagens.

## Fluxo

1. O dono acessa o importador de cardápio: primeiro pode enviar PDF/fotos; caso contrário, escolhe “Solicitar que tragam meu cardápio”.
2. O contato oficial aparece na área de ajuda, se estiver configurado. O cliente pode abrir o WhatsApp oficial diretamente.
3. Para enviar a solicitação, o cliente informa um WhatsApp com DDD e confirma separadamente a autorização para uso daquele número no atendimento.
4. O número é salvo **somente** na solicitação autenticada, com data do consentimento. A administração vê o contato na fila `/admin/importacoes` e usa “Responder pelo WhatsApp” para iniciar **manualmente** a conversa.
5. Não há disparo automático para o número do cliente, e nenhuma integração com WhatsApp Business API nesta mudança.
6. Notificações push de “cardápio recebido para revisão” são opcionais e separadas do atendimento por WhatsApp. Não afirmar que uma mensagem WhatsApp foi enviada se ninguém a enviou.
7. O cliente confirma preços (inclusive diferenças do iFood) e fotos antes de salvar/publicar.

## Segurança e operação

- O WhatsApp do solicitante não aparece em URLs públicas, logs de navegação ou em páginas de outras pizzarias.
- O painel administrativo exige autenticação e autorização de plataforma.
- O backend rejeita telefones inválidos e solicitações sem consentimento explícito.
- A migração D1 0016 inclui `contact_whatsapp` e `contact_consent_at`: **somente aplicá-la num ambiente de testes até a homologação de PR #77 + #79**.
- A PR #79 e o site público permanecem separados enquanto CI, revisão funcional e configuração do número não forem concluídos.
- O número configurado será visível aos proprietários que acessarem a área de suporte; o contato dos proprietários fica restrito a eles e ao administrador.

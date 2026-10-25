# WhatsApp do suporte com oito dígitos — 25/10/2026

O proprietário confirmou em capturas do WhatsApp um contato de suporte com oito dígitos depois do DDD. A validação anterior exigia nove e ocultava o canal. O corretivo preserva exatamente o número informado; não acrescenta nem remove dígitos do assinante.

`normalizeSupportWhatsApp` aceita DDD e assinante de oito ou nove dígitos, com ou sem o prefixo brasileiro. O servidor usa essa função para `PEDIDO_SUPPORT_WHATSAPP`; apresentação e links `wa.me` usam a mesma política. A validação de celulares em cadastro de pizzarias e solicitações continua em `normalizeBrazilWhatsApp`, sem alteração.

O contato real fica apenas na configuração de runtime do servidor. Não inserir o número no GitHub, em exemplos ou fixtures. Verificar sintaxe não comprova que uma conta existe no WhatsApp, nem comprova identidade; nesta entrega a confirmação do destino foi fornecida pelo proprietário.

O botão **Solicitar recuperação pelo WhatsApp** abre um atendimento. Não envia mensagens sozinho, revela senhas, aprova recuperação, altera contas ou cria sessão. Permanecem os requisitos da issue #116 para recuperação exclusiva pelo titular; SMTP, MFA e passkeys não são ativados por este corretivo.

Os testes usam números sintéticos e cobrem preservação dos dígitos, apresentação, URL do WhatsApp, DDD 55, formatos malformados e a resposta do Worker isolado com D1/R2 locais. Não consultam a existência de números no WhatsApp e não modificam contas reais. A evidência de publicação e a conferência pública devem registrar separadamente versão, ambiente aplicado e destino do botão, sem publicar o contato em documentação.

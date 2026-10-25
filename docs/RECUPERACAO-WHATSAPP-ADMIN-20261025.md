# Recuperação de acesso pelo WhatsApp — 25/10/2026

- Mudança preparada em código: a página /esqueci-senha mostra a alternativa **Solicitar recuperação pelo WhatsApp** quando o envio de e-mails estiver inativo, desde que o ambiente do backend Sites já tenha um número brasileiro válido em `PEDIDO_SUPPORT_WHATSAPP`. No login, "Esqueci minha senha" permanece acessível.
- O navegador usa `wa.me` com texto de solicitação e o e-mail que o próprio cliente optar por escrever. Não inclui senha, token, convite ou código.
- O responsável pelo suporte **precisa comprovar a titularidade por contato previamente registrado**; número novo alegando ser o dono não é comprovação suficiente.
- O administrador não pode visualizar senha antiga, porque Supabase Auth não a armazena de modo legível. O painel administrativo recebe explicação e atalho para gestão de usuários no Supabase existente; **não foi criada uma API secreta de redefinição de senhas dentro do site**.
- Se for necessário redefinir administrativamente, isso exige acesso autorizado à ferramenta segura do provedor, identificação do dono e senha nova forte. Não usar `1234567`; o produto requer pelo menos 12 caracteres e a senha nova deve ser criada pelo cliente assim que recuperar o acesso.
- O recurso de recuperação por e-mail permanece desligado até haver SMTP verificado; o novo WhatsApp não o ativa.
- **Estado de publicação:** alterações nesta branch não representam implantação verificada em `https://pizzaria-on.netlify.app`. Backend Sites deve receber o código e o número de suporte deve estar configurado. Validar via telefone no site real e corrigir antes de divulgar.
- Não houve alteração de contas, senhas, banco, cadastro ou pagamento.

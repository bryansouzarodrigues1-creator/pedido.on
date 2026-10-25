# Recuperação de acesso pelo WhatsApp — estado em 25/10/2026

A interface e o backend foram publicados na v91. O botão **Solicitar recuperação pelo WhatsApp** depende de `PEDIDO_SUPPORT_WHATSAPP`; esse número oficial continua ausente no ambiente Sites (revisão 14) e não foi encontrado no histórico. Nunca usar números de testes, clientes ou outros projetos para preencher essa configuração.

- O canal abre uma conversa de suporte e não comprova identidade nem cria sessão.
- O cliente pode escrever o e-mail de cadastro na mensagem. Senhas, tokens e códigos não são incluídos.
- A política final da PR #117 substitui a orientação anterior: o administrador não visualiza, escolhe ou recebe senhas dos pizzaiolos e não deve redefini-las pelo provedor como parte do suporte do produto. O atalho para gerir usuários do Supabase foi removido do painel.
- A recuperação sem senha atual continua pendente da [issue #116](https://github.com/bryansouzarodrigues1-creator/pedido.on/issues/116): exige MFA recente no administrador e um fator independente previamente verificado do titular. A aprovação administrativa isolada não deve permitir assumir uma conta.
- A recuperação por e-mail permanece desativada até a entrega SMTP ser comprovada.
- A alteração normal de senha pelo titular mantém a exigência de senha atual. Nenhuma conta ou senha real foi alterada nos testes.

[Publicação, testes e pendências](PUBLICACAO-ACESSO-20261025.md) · [Política de recuperação pelo titular](OWNER-ONLY-PASSWORD-RECOVERY-20261025.md)

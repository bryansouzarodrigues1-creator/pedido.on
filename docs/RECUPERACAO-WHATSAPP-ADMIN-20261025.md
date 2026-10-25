# Recuperação de acesso pelo WhatsApp — estado em 25/10/2026

A interface e o backend estão publicados na **v92**. `PEDIDO_SUPPORT_WHATSAPP` foi configurado no runtime (revisão 15) com o contato confirmado pelo proprietário. O botão **Solicitar recuperação pelo WhatsApp** e seu destino exato foram conferidos na Netlify e no Lovable. O formato de oito dígitos depois do DDD é preservado, sem acrescentar dígitos. Não gravar o número real no GitHub; usar somente a configuração do servidor.

- O canal abre uma conversa de suporte e não comprova identidade nem cria sessão.
- O cliente pode escrever o e-mail de cadastro na mensagem. Senhas, tokens e códigos não são incluídos.
- A política final da PR #117 substitui a orientação anterior: o administrador não visualiza, escolhe ou recebe senhas dos pizzaiolos e não deve redefini-las pelo provedor como parte do suporte do produto. O atalho para gerir usuários do Supabase foi removido do painel.
- A recuperação sem senha atual continua pendente da [issue #116](https://github.com/bryansouzarodrigues1-creator/pedido.on/issues/116): exige MFA recente no administrador e um fator independente previamente verificado do titular. A aprovação administrativa isolada não deve permitir assumir uma conta.
- A recuperação por e-mail permanece desativada até a entrega SMTP ser comprovada.
- A alteração normal de senha pelo titular mantém a exigência de senha atual. Nenhuma conta ou senha real foi alterada nos testes.

[Publicação, testes e pendências](PUBLICACAO-ACESSO-20261025.md) · [Política de recuperação pelo titular](OWNER-ONLY-PASSWORD-RECOVERY-20261025.md)

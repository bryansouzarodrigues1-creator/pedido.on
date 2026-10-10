# pedido.on — pedidos com Pix e aprovação

## Para a pizzaria

1. Entre no painel e abra **Minha loja → Entrega e pagamento**.
2. Marque **Receber Pix antes do preparo**. Escolha o tipo de chave, copie a chave registrada no banco e informe o titular.
3. Use **Salvar e atualizar** para publicar as mudanças.
4. Abra **Vendas**, ative os alertas e mantenha o painel aberto.
5. Quando chegar um comprovante, abra **Conferir e aprovar**. Compare o valor com a entrada no banco.
6. Se recebeu, marque a confirmação bancária, informe o prazo em minutos e aprove. Se houver um problema, explique o motivo e peça novo comprovante ou cancele.
7. Atualize para **Em preparo**, **Saiu para entrega** e **Concluído**. Na retirada, conclua ao entregar ao cliente.

O comprovante é privado. Um arquivo enviado não confirma sozinho que a pizzaria recebeu o dinheiro. Cancelamento não faz devolução automática.

## Para quem pede

1. Monte a pizza e informe contato e entrega/retirada.
2. Escolha Pix e confirme o pedido. Não precisa criar conta.
3. Abra **Acompanhar meu pedido**, copie a chave e confira no banco o valor e o titular antes de pagar.
4. Volte à página e toque em **Já paguei · enviar comprovante**.
5. Aguarde a conferência da pizzaria. A aprovação e a previsão de chegada aparecem no mesmo link.
6. Guarde o link privado para acompanhar as próximas etapas. Se a pizzaria recusar o comprovante, confira a mensagem e envie o arquivo correto.

Arquivos aceitos: JPG, PNG, WebP ou PDF, até 5 MB. O link de acompanhamento dura 30 dias. O painel e o cliente recebem atualizações em até aproximadamente oito segundos com a conexão disponível.

## Testar sem pagar

Abra `/demo/pedidos`. A demonstração mostra a tela do cliente e o painel da pizzaria lado a lado. Simule o envio de um comprovante, confirme a conferência no painel e escolha o prazo. Não use uma chave nem um comprovante real nessa demonstração.

## Ativação do acesso

O código aceita Google e e-mail/senha. O cadastro direto não envia confirmação nem depende de SMTP. O e-mail é usado somente na recuperação de senha; Google tem sua configuração OAuth separada. O procedimento e os testes estão em `ATIVACAO.md`. O estado mais recente da plataforma está em `docs/CONTINUAR.md`.

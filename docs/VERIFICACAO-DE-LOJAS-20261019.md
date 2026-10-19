# Verificação da loja e relatos de compradores

Publicada na **v65 em 19/10/2026, às 13:03:15 de Brasília**, ambiente 13. Fonte Sites `aa9f94d9e3cc309fdfe06a089ccb731d0670713f`, implantação `appgdep_6ad63f27afa88191a3551bd68e627dd2`. PR principal [#69](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/69) e mirror [#26](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/26) integradas. [Evidência estruturada](EVIDENCIA-VERIFICACAO-DE-LOJAS-20261019.json).

## Comportamento

- Cadastro, edição, prévia e publicação do cardápio continuam disponíveis. Publicar não aprova a loja.
- Sem aprovação, inclusive para contas antigas, o comprador monta o carrinho e envia itens, quantidades, observações e valores para o WhatsApp da pizzaria. O site não grava esse carrinho como pedido, pagamento ou comanda. A mensagem pede confirmação da loja, entrega e pagamento.
- O formulário não oferece pagamento, Pix, comprovantes ou finalização pelo site enquanto a loja não está aprovada. O servidor rejeita tentativas diretas, inclusive com campos falsos de aprovação.
- No painel, em **Pedidos** ou **Pizzaria → Verificação da loja**, o dono publica seus dados e usa **Solicitar verificação da loja**. As informações já cadastradas são reaproveitadas; uma nota é opcional.
- Em **Administração → Verificações e denúncias**, a conta administradora confere a loja, registra a referência/motivo e declara a conferência. Só então aprova, pede correção ou suspende a verificação. Nenhuma loja existente recebe aprovação automática.
- Após aprovação, os pedidos pelo site, Pix e comprovantes usam o fluxo já existente de endereço, preço no servidor, comprovante privado e conferência humana do recebimento.
- Mudar nome, endereço, cidade, WhatsApp ou configuração/chave/titular do Pix publicado exige nova solicitação. Preços, produtos, horários e aparência não invalidam a análise.
- A suspensão oculta o Pix também nos links privados de pedidos antigos e impede novos comprovantes e novas aceitações/confirmações de pagamento. Histórico, atendimento, cancelamento e cumprimento de pedidos já confirmados permanecem disponíveis.
- **Denunciar loja / problema** está no rodapé do cardápio e no acompanhamento privado. O relato recebe protocolo, fica restrito à administração e pode ser analisado/arquivado com justificativa. Relatos não aprovam nem suspendem automaticamente a loja.

## Proteções e dados

As tabelas `store_verifications`, `store_verification_events` e `store_reports` são criadas pela migração aditiva `0015_abnormal_robin_chapel`. Os dados editáveis do cardápio não contêm autoridade para aprovar uma loja. Solicitações exigem sessão do proprietário e CSRF; decisões exigem a conta administradora, CSRF e versão atual. A trilha de aprovação é gravada na mesma transação da decisão.

Pedidos e comprovantes conferem a mesma aprovação/publicação dentro da escrita: uma suspensão ou republicação concorrente impede a gravação. Um arquivo R2 enviado durante essa disputa é removido. As chaves Pix não são publicadas no HTML do cardápio; o acompanhamento privado devolve a chave somente enquanto a loja está liberada.

Relatos limitam tamanho e frequência, aceitam um contato opcional, não recebem documentos bancários e usam um identificador derivado do IP com segredo do servidor para limitar abuso. Repetir a mesma solicitação não duplica o protocolo. O administrador acessa as últimas 100 solicitações e relatos pela interface. Os relatos não são enviados automaticamente por e-mail ou WhatsApp.

Verificação é uma análise manual da plataforma. Não é garantia de entrega, de idoneidade permanente nem de recebimento bancário. Um pagamento direto negociado no WhatsApp continua fora do processamento do site.

## Validação reproduzível

- `pnpm test`: regressões existentes e casos novos de falsificação de aprovação, isolamento de proprietários, CSRF, solicitação/aprovação, alterações de identidade/Pix, suspensão, privacidade e denúncias.
- `scripts/check-order-ticket-worker.test.mjs`: rotas reais em workerd/D1/R2 descartáveis, com login/sessão do aplicativo; somente o transporte Supabase é simulado. Inclui revisão administrativa e denúncia.
- `scripts/check-store-safety-browser.mjs`: Chrome do GitHub Actions, Pixel 7 emulado e larguras 320/412/1280. Loja Forno Azul de Teste, carrinho WhatsApp interceptado, solicitação do dono, aprovação, pedido fictício/Pix, denúncia, análise e suspensão.
- TypeScript e build Sites. Sem envio de mensagem, transferência Pix, geração paga ou Android físico.

Contas, sessões, restaurantes existentes, assinatura Asaas e configurações externas são preservados. A importação oficial iFood permanece no estado anterior, aguardando as autorizações externas descritas em `IFOOD-AUTORIZADO.md`.

## Resultado e pendências da rodada

Passaram **472 testes locais, TypeScript e build**. O cardápio existente respondeu HTTP 200, exibindo WhatsApp e denúncia. A leitura passou a normalizar os campos novos de cardápios antigos antes da renderização e do checkout, sem alterar o JSON armazenado. A falha 500 também foi reproduzida na v63 anterior; a v64 foi revertida durante a investigação e substituída pela v65. Os sete cadastros completos permanecem iguais; as três tabelas novas estão vazias.

Os workflows Chrome `39282288748`, Windows `39282288802`, auth/pedidos `39282288818`, chat `39282288774` e mirror `39282291275` permanecem **queued**, sem etapas executadas na última consulta. A implementação e o GET real foram validados; a nova rodada visual não foi concluída, e não há teste em Android físico. Consultar os resultados antes de registrar aprovação do CI.

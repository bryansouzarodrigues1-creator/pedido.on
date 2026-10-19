# Verificação da loja e relatos de compradores

Publicada na **v67 em 19/10/2026, às 14:50:20 de Brasília**, ambiente 13. Fonte Sites `610a912f56c950d28cc7e32e5ae8d5e78967ace0`, árvore `f5c649999b5672bf18cf9a428441a8e042dfcdde`, implantação `appgdep_6ad6583de59c8191af22f401a6e8066e`. PR principal [#70](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/70) e mirror [#27](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/27) integradas. [Evidência estruturada](EVIDENCIA-VERIFICACAO-DE-LOJAS-20261019.json).

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

## Resultado final e limites

Passaram **472 testes**, TypeScript e build Sites. O Chrome concluiu **11 suítes locais e 7 públicas**, incluindo os **6 cenários completos de verificação**: carrinho WhatsApp sem pedido/Pix, solicitação do dono, aprovação administrativa, pedido fictício com Pix privado, denúncia com protocolo/análise e revogação bloqueando novamente pedido/Pix/comprovante. O último cenário conferiu também larguras 320/412/1280. As capturas de aprovação, Pix fictício, protocolo e cardápio após suspensão foram inspecionadas. Zero erros no resumo do fluxo.

Os controles de pagamento, categoria da denúncia e decisões administrativas agora têm nomes acessíveis associados explicitamente ao rótulo visível. O teste do aviso após suspensão usa a região de status, preservando o texto explicativo filho. Não foram relaxadas as asserções de segurança. O guardião offline do mirror foi atualizado para a migração revisada 0015: **16 migrações e 30 tabelas**, com **5 testes**, rejeição de migrações não revisadas e proteção contra sobrescrita.

CI aprovado: Chrome `39296703580` (artefato `12209232040`), Windows `39296703881`, auth/pedidos `39296703739` e mirror `39296711101`. Merges finais: principal `fdca3f262fd43f34d477184605ba8d40ec4da60f`, mirror `692123dd4b11afd94ba91d8944e82403048275ab`. A v66 foi somente salva; a publicação final é a v67.

O cardápio existente respondeu **HTTP 200**, com WhatsApp e denúncia visíveis. Os **sete cadastros completos** continuam iguais, o ambiente permanece na revisão 13 e as três tabelas novas continuam vazias. Nenhuma loja real foi aprovada automaticamente. A normalização de cardápios antigos acontece na leitura, sem regravar o JSON. O erro 500 também existia na v63; a v64 foi revertida durante a investigação e substituída pela v65 antes desta correção final.

**Limites reais:** Pixel 7 foi emulado no Chrome; não houve teste em Android físico, pagamento bancário, mensagem enviada ou geração paga. O teste local usa D1/R2 descartáveis e identidade simulada; o teste público bloqueia mutações. A importação oficial real do iFood permanece desligada, aguardando as autorizações externas descritas em `IFOOD-AUTORIZADO.md`.

# Administração por pizzaria — 27/10/2026

## Problema e navegação

A fila antiga removia a opção de aprovação quando a loja já estava recusada, desverificada ou com dados alterados. O formulário sobrava com duas negativas parecidas. Agora a fila e o cadastro usam o mesmo controle: **Verificar loja** e **Desverificar loja**. Verificar inicia uma conferência atual no servidor e exige confirmação dos dados/vínculo/Pix antes da decisão. A versão da análise e a identidade publicada continuam protegidas contra alterações concorrentes. Desverificar retira somente a liberação de pedidos/Pix pelo site.

Em **Administração → Clientes e pizzarias → Abrir atendimento completo**, cada loja tem:

- Verificação da loja, separada do acesso da conta.
- **Dar teste grátis**, **Liberar Pro** e **Suspender conta**. Free e Pro aceitam 10, 30, 60 ou 90 dias; a confirmação mostra a ação e o período. Observações são opcionais, com motivo padrão registrado quando não preenchidas. Não cria cobrança. Suspensão preserva acesso ao histórico; a reativação usa teste/Pro.
- **Cardápio**: link público, prévia da versão publicada e do rascunho, produtos/preços e fotos atuais. A prévia usa os componentes reais em modo simulado e não envia pedidos.
- **Imagens e textos**: histórico paginado de imagens, textos/layouts, leituras e kits de IA, fotos da equipe e divulgações arquivadas. Mostra concluídos, falhas e tentativas devolvidas; não retorna chaves, hashes de autorização ou sessões. O administrador pode ver imagens privadas de negócio da loja; outros clientes e visitantes continuam sem acesso.
- **Orientar e enviar conteúdo**: orientações criativas para as próximas criações, fotos/artes prontas e textos promocionais. A equipe identifica seus envios. Orientações podem ser pausadas e reativadas com versão; histórico preservado.

## Conteúdo de apoio e IA normal

Uma nova tabela aditiva `restaurant_support` guarda o autor, tipo, destino, conteúdo, estado, datas, versão e chave de idempotência. Fotos JPG/PNG/WebP até 5 MB são conferidas pelo conteúdo e guardadas no R2 da pizzaria. Nomes de arquivo e URLs externas não controlam o destino de armazenamento. Os envios geram uma notificação interna; nenhum WhatsApp/e-mail/post externo é enviado pelo desenvolvimento.

O dono encontra o material em **Cardápio → Aparência**, acima do Estúdio, e recebe um convite na página de pedidos. Pode baixar/copiar, escolher onde usar a imagem e aplicá-la ao rascunho. Salvar e publicar continuam explícitos. As fotos da equipe também aparecem como fundos salvos em Ofertas. Chegada de conteúdo é consultada ao voltar ao app, ao focar a janela e periodicamente enquanto visível; não recarrega a página nem substitui o rascunho.

A IA mantém os mesmos serviços, chaves, franquias, reservas e claims de uso único. As últimas quatro orientações ativas entram como contexto criativo subordinado ao pedido do dono e aos ingredientes cadastrados, sem autorizar mudanças financeiras ou operacionais. A imagem respeita o protocolo atual de até 3.000 caracteres; notas adicionais são encurtadas para caber, preservando o pedido original. Um pedido completo grande demais é recusado antes da reserva. Reabrir uma tentativa já concluída devolve a criação existente.

Enviar uma foto/texto pronto ou consultar o histórico não chama um modelo e não desconta imagens. Não há geração real para testar, compra, novo saldo, aumento do teto global ou alteração de configuração nesta etapa.

## Histórico das divulgações

Nas próximas cópias/downloads, o aplicativo registra o texto canônico da oferta publicada e, para artes, a imagem PNG efetivamente exportada. A API valida dono, CSRF, origem, revisão publicada e produto/promoção atual; deduplica o mesmo conteúdo. Guardar o registro é separado da geração e não usa IA. Uma falha de gravação avisa, mas não impede baixar/copiar a divulgação já pronta.

Artes locais anteriores que nunca foram salvas no servidor não podem ser recuperadas retroativamente; essa limitação aparece no histórico. Imagens/textos/kits já persistidos continuam acessíveis. Leituras antigas de cardápio deixam de ser apagadas automaticamente após 30 dias para preservar sua consulta administrativa.

## Validação e publicação

Dez testes novos de integração passaram: autorização, privacidade, origem/CSRF, upload e repetição, formatos/tamanho, contexto de IA e limite de protocolo, pausa/versionamento, aplicação somente ao rascunho, paginação, arquivo PNG/caption sem consumo e ciclos de verificação a partir de estados recusado/desverificado/dados alterados.

A suíte completa, o Chrome e a publicação ainda estão em preparação. O Chrome inclui o caso exato da fila recusada, os botões verificar/desverificar/verificar novamente, ações de conta com quatro prazos, prévia real, histórico das artes, upload/texto/orientação reais em D1/R2 descartável e recebimento/aplicação no rascunho pelo dono. Respostas de IA e do seletor de plano são simuladas; o servidor de plano é testado separadamente. Nenhuma conta real é modificada pelos ensaios.

Registrar aqui o commit final, os resultados e a versão/deploy efetivos ao terminar. A versão anterior em produção é a v103. Android físico, nova recuperação completa por e-mail real e cobrança/renovação externa reais continuam sem homologação.

# Administração, PWA e operação — 12/10/2026

**Publicado — v26, 12/10/2026:** fonte Sites `6629ea2cfa6c73130d06d07f7ee742cf3588944b`, versão `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_e37b0a5043348191ba8594d36c755045`, implantação `appgdep_6acd6779fb848191bbd72d892c9a196e` concluída às **23:04:53.326 UTC (20:04 no Brasil)**. Ambiente revisão **8**, audiência pública. PR #9, #10 e #11 integradas. Main de código `d7f72054cb933b085131d251cd8be8d38c30d56c` antes deste registro; PR #11 merge `da4045ac454e36dc8135bc82eedd57cc521ef44c`. GitHub e Sites não se atualizam automaticamente entre si.

Administração em /admin apenas para a conta existente fixada como segredo; PWA instalável com ícones, atualização protegida e shell offline; Web Push por aparelho e fila criptografada; carrinho antes de endereço/bairro/consulta; taxas/regras definidas pelo dono; aceite operacional separado da conferência Pix; Minhas criações recupera imagens/textos sem modelos; trial começa uma vez na primeira pizzaria de novos cadastros, com fiscalização **desativada até a cobrança**. Nenhum backfill ou corte de contas anteriores.

Migrações 0009, 0010 e 0011 confirmadas no D1 (19 tabelas); 0007/0008 preservadas. As **14 tabelas de negócio anteriores permaneceram iguais** após a v25; a v26 remove somente alertas antigos duplicados e com endereço no navegador, deixando o Web Push com texto genérico. Chave de sessão, Supabase, banco/R2, preços/Pix, cotas de IA preservados. Sem créditos Lovable/OpenAI ou mensagens de e-mail nesta etapa.

Passaram **175 testes**, typecheck, build/empacotamento e preparação/check Netlify. Após o ajuste final, 12 testes de administração/push/entrega, typecheck e build passaram. Criptografia/assinatura em workerd e SSR do menu são reais; transporte push, serviços Auth/modelo e adaptadores D1/R2 dos testes são simulados. Em produção: início, calculadora, offline, manifesto e arquivos PWA responderam 200; admin/status e notifications negaram anônimos com 401. A v23 teve redirecionamento de offline.html, corrigido na v24 para /offline; não repetir esse erro.

**Etapas humanas e comerciais ainda pendentes:** testar câmera, toque, instalação, atualização com rascunho, notificação com painel fechado e fluxo em dois celulares. Resend listou nenhum domínio; recuperação precisa de remetente/SMTP e entrega/link real validados. Asaas PR #1 continua separada, com políticas puras apenas: faltam integração/checkout/webhook/credenciais próprias e teste de pagamento/renovação/cancelamento. Não usar chaves JurisAuto, comprar domínio ou ativar fiscalização/cobrança sem finalizar essa etapa. Netlify continua preparada e entra após o gateway. Ver [registro completo](ADMIN-PWA-OPERACAO.md).



## Publicações confirmadas

- v22: correção de cancelamento OCR, 153 testes, fonte Sites c70c717808546b357385aaee76c7ba3b8edf9a85; PR #9 integrada em c67aa050cc52af42730f81a22ee9dc92d5a69136.
- v24: administração e PWA, fonte cfe3734bc3f8f1bd00376fc04d42f93379e4a675. Versão appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_58a8ec6362c08191bbf94af7cbd5fadd; implantação appgdep_6acd5aa9d554819180b0c7a0e195ad04 concluída em 22:10:10.828 UTC. PR #10 integrada em 5a61441deaaaaadb02e3b95e5aabe608ec896329. Ambiente revisão 7, audiência pública.
- A v23 foi substituída após detectar em produção um redirecionamento de /offline.html. A rota pública /offline foi corrigida. /offline, os três PNGs e o favicon foram lidos em produção com 200; admin/status e notifications negaram acesso anônimo com 401. As 14 tabelas de negócio foram comparadas, iguais, após a primeira publicação.
- A implementação posterior de entrega, histórico e trial ainda exige registrar a versão retornada pelo Sites; não presumir o número antes da publicação.

## Administração

/admin e /configuracao são protegidos no servidor. A conta existente escolhida fica fixada por PLATFORM_ADMIN_ACCOUNT_ID, como segredo da hospedagem; nenhuma identidade ou chave é gravada no Git. A identificação por e-mail do acesso interno permanece como fallback apenas quando não houver uma conta fixa. Cadastros e user_metadata não concedem papel administrativo.

Contagens e situação das integrações ficam na área privada. Não há páginas administrativas separadas, novo domínio ou novo banco. As instruções antigas de importação OpenAI e Stripe foram removidas da área visível.

## PWA e avisos

Manifesto mantém id /app e scope /. Há ícones PNG 192/512 e maskable, instalação Android, orientação iOS, versão do shell por hash, atualização mediante ação do usuário e tela offline pública. APIs, páginas de conta, pedidos, comprovantes e respostas autenticadas não são guardados em cache. A atualização fica bloqueada durante alterações/criação no painel.

A migração 0009 acrescenta push_subscriptions e push_deliveries. Cada proprietário inscreve até cinco aparelhos com consentimento; endpoints/chaves são criptografados no D1 com a chave de sessão existente. O transporte usa VAPID e aes128gcm. Endpoints são restritos a serviços reconhecidos; redirects não são seguidos. Notificações têm texto genérico, sem nome, endereço, telefone ou mensagem do cliente na tela bloqueada.

Novos pedidos, comprovantes, mensagens do cliente e consultas manuais de endereço disparam avisos. Eventos por aparelho são únicos. Tentativas são limitadas a três, com timeout, atraso e fila persistente. O envio pós-resposta usa waitUntil com orçamento limitado; pendências que excedem esse orçamento são retomadas por eventos posteriores, não por um cron autônomo. Não prometer entrega garantida ou instantânea.

GET/POST/DELETE/PATCH notifications exigem conta, e as mutações exigem origem/CSRF. Teste informa aceitação pelo serviço, que não prova recebimento. Inscrições 404/410 são removidas; logout revoga a inscrição da sessão e desinscreve o aparelho. Troca de senha revoga inscrições da conta.

## Entrega e pagamento do pedido

O cliente navega e monta carrinho sem cadastro ou espera. No checkout, informa endereço, WhatsApp e bairro, opcionalmente localização. Bairros/taxas são definidos pelo dono e publicados explicitamente; o servidor confirma a taxa. O bairro é informado pelo comprador — não há geocodificação ou prova de localização física.

Um bairro habilitado tem aprovação automática por regra; bairro desconhecido pode exigir decisão manual ou ser recusado. A decisão manual registra endereço, contato, taxa, versão e validade. Mudanças de área/taxa invalidam aprovações automáticas antigas. A taxa confirmada é usada no servidor e exige conferência do total antes de registrar o pedido. Retirada dispensa consulta.

A migração 0010 acrescenta somente colunas nullable em delivery_checks e orders. Aceitar um pedido Pix grava aceite operacional e mantém pagamento pendente. Comprovante sozinho não confirma dinheiro; preparar só fica permitido após a ação explícita de conferência no banco. A ação antiga confirm permanece compatível e exige a mesma conferência.

A chave/titular Pix não vão no payload público do cardápio. A chave do pedido é lida pelo acompanhamento privado depois de aprovação de entrega e criação do pedido. O Pix é recebido pela pizzaria, sem mistura com a assinatura SaaS.

## Criações salvas

GET creations exige propriedade da pizzaria. Lista no máximo vinte resultados por página, com cursor; não devolve prompt, token ou capability. Imagens devem pertencer ao caminho de mídia dessa loja. Recuperar não chama modelos, altera cota ou escreve no rascunho. Aplicar é uma ação do dono e publicar continua separado. Foto de produto exige escolher um produto atual; texto com produto removido exige revisão.

## Teste gratuito

A migração 0011 acrescenta account_trials. Novos cadastros por convite recebem um registro; os sete dias começam uma única vez na primeira pizzaria. Login, logout, outra loja e repetição não reiniciam o prazo. Não há backfill ou interrupção de contas anteriores. Fiscalização por PEDIDO_TRIAL_ENFORCED está implementada, mas permanece desativada até a integração de cobrança ser validada. Não declarar trial comercial completamente ativo.

## Verificações e etapas humanas

Passaram 175 testes antes do empacotamento posterior, incluindo SSR real do menu, taxa/contato e separação aceite/Pix, histórico/isolamento, trial/persistência e assinatura/criptografia reais em workerd. D1/Auth/R2 e transporte push dos testes automatizados são adaptados/simulados. Câmera, instalação, atualização com rascunho, recebimento com painel fechado e fluxo com dois celulares ainda precisam de teste no aparelho; o navegador de QA do fluxo Sites está indisponível.

Resend listou nenhum domínio de envio. Recuperação não foi liberada nem houve e-mail enviado: falta configurar remetente/SMTP e comprovar recebimento/troca de senha. Não comprar domínio sem decisão.

Asaas PR #1 permanece separada: são políticas de segurança, não checkout/migração/webhook prontos. Faltam credenciais específicas do Pedido.on, integração do gateway e teste real de pagamento/renovação/cancelamento. Não usar chaves JurisAuto. Netlify permanece preparada, sem migração; vem após o gateway. Nenhum crédito Lovable/OpenAI foi consumido nesta etapa.

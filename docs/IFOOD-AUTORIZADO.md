# Importação autorizada do iFood

O link público continua aceitando mensagens compartilhadas de qualquer pessoa. Ele não prova que o visitante administra a loja, e a página pública pode bloquear a leitura. A conexão oficial é uma alternativa para o responsável autorizar a importação dos dados da própria loja.

## Estado da integração

Código implementado com autorização distribuída, importação pontual e revisão. **Ainda não ativado com credenciais reais.** O cadastro do aplicativo no iFood e a verificação pessoal no portal estão pendentes. Testes automatizados usam transporte fictício, inclusive quando executados no runtime real de Workers. Não houve importação autenticada de uma loja real.

## Configuração do aplicativo

1. Entrar ou criar a conta em [iFood Developer](https://developer.ifood.com.br/pt-BR/sign-up). Telefone, verificação pessoal e informações da empresa devem ser preenchidos pelo titular.
2. Preparar um aplicativo **distribuído**, com os módulos **Merchant** e **Catalog** para leitura. A documentação exige homologação para acesso às lojas de produção; confirmar os requisitos aplicáveis ao cadastro antes de anunciar disponibilidade.
3. Cadastrar `IFOOD_CLIENT_ID` e `IFOOD_CLIENT_SECRET` exclusivamente no ambiente de servidor. Reutilizar `AUTH_SESSION_KEY` existente, sem substituí-la. Nunca enviar essas credenciais para código cliente, GitHub, logs ou conversa.
4. Validar com a loja de teste disponibilizada pelo iFood e depois com o responsável por uma loja autorizada. Ativar `PEDIDO_IFOOD_ENABLED=true` somente na validação controlada. O diagnóstico administrativo indica configuração; isso não comprova homologação nem acesso real.
5. Conferir produtos, preços por tamanho, endereço e horários. Confirmar que o telefone recebe pedidos por WhatsApp. Documentar a primeira importação real antes de anunciar a integração como operacional.

Quando a configuração está desligada ou incompleta, a interface não apresenta um botão de conexão que não possa iniciar a autorização. PDF, TXT/CSV, fotos, HTML salvo e texto continuam disponíveis.

## Fluxo implementado

- No mesmo compositor ou leitor existente, colar o link e escolher **Conectar minha loja no iFood**, quando disponível.
- O servidor pede um código temporário ao iFood. O responsável abre **Autorizar no Portal do Parceiro**, escolhe/autoriza a loja e copia o código de retorno.
- O código é trocado no servidor. A leitura confere o identificador exato da loja do link e consulta dados cadastrais, horários e o catálogo de delivery ativo. A conclusão também confere o link da tela, para impedir trocas de loja entre abas.
- A interface pede confirmação dos dados e dos produtos. Campos já preenchidos são preservados. Telefone nunca vira WhatsApp automaticamente. A importação de produtos só salva no rascunho após revisão; publicação continua explícita.
- Não é necessário criar uma conta Pizzaria.on para começar a revisão no compositor público. A autorização do responsável ocorre no próprio iFood.

## Proteções e limites

O verificador temporário fica em cookie HttpOnly, Secure e SameSite=Lax, criptografado com AES-GCM, vinculado ao CSRF e à finalidade desta importação. Expira em até dez minutos; o código de retorno não é guardado no navegador. Tokens de acesso e renovação não são persistidos nem retornados ao cliente. Recarregar a página retoma uma autorização válida no mesmo navegador, enquanto o rascunho continua no armazenamento já existente.

Somente o domínio fixo `merchant-api.ifood.com.br` recebe credenciais. Redirecionamentos são recusados, respostas têm limite de tamanho e tempo, e há limites por IP e globais. GETs de Merchant/Catalog não alteram o iFood. Os dois POSTs de OAuth apenas iniciam/trocam a autorização. Não há pedidos, preços atualizados no provedor, cobranças ou sincronização contínua.

O catálogo deve conter um único contexto DEFAULT ativo. A documentação apresenta duas rotas de categorias: usa-se primeiro a rota com catálogo; o fallback sem catálogo só é aceito se o vínculo das categorias for inequívoco. Itens resumidos são detalhados por `/items/{itemId}/flat`, com no máximo quatro chamadas simultâneas e 200 detalhamentos. São aceitas até 30 categorias, 500 produtos e 60 mil caracteres para revisão. Paginação ou formatos não reconhecidos não são tratados como importação completa.

Pizzas exigem preços explícitos de tamanho e sabor, e massa/borda obrigatória precisa ter opção sem acréscimo. Pausas e preços DEFAULT são respeitados; preços ambíguos, combos e adicionais incompatíveis são sinalizados. Tamanhos fora de P/M/G e pizzas com mais de dois sabores precisam de ajuste manual. O importador não transfere automaticamente imagens externas, regras de entrega ou adicionais pagos. Horários sobrepostos ou inválidos ficam pendentes em vez de virarem horários inventados.

Não há migração, novo cadastro, alteração de assinatura ou mudança de chave interna nesta implementação. Apenas os limites de requisição usam a tabela `rate_buckets` existente. Cookies de autorização não substituem a sessão da conta.

## Validação reproduzível

`pnpm test` cobre a conversão de pizza, o leitor real de revisão, isolamento das duas contas fictícias, CSRF/origem, expiração, adulteração, finalidade do cookie, loja divergente, limites, redirecionamentos e respostas grandes. Há um teste com **workerd e D1 reais**, mas transporte iFood simulado.

O Chrome no GitHub Actions cobre retomada após recarga, confirmação de endereço/horários, confirmação separada de WhatsApp e prévia de três produtos fictícios. A conta existente recebe produtos revisados sem sobrescrever seus dados. A parte pública intercepta todas as escritas da aplicação. Pixel 7 emulado não equivale a um aparelho Android físico.

## Fontes oficiais verificadas

- [Autenticação distribuída](https://developer.ifood.com.br/en-US/docs/food/guides/modules/authentication/distributed)
- [Solicitar acesso às lojas](https://developer.ifood.com.br/en-US/docs/getting-started/first-steps/request-access)
- [Merchant e horários](https://developer.ifood.com.br/en-US/docs/food/guides/modules/merchant/endpoints)
- [Catalog v2](https://developer.ifood.com.br/en-US/docs/food/guides/modules/catalog/endpoints)
- [Pizza e preços por tamanho](https://developer.ifood.com.br/en-US/docs/food/guides/modules/catalog/guides/pizza)
- [Contextos e disponibilidade](https://developer.ifood.com.br/en-US/docs/food/guides/modules/catalog/guides/multisetup)
- [Homologação Merchant](https://developer.ifood.com.br/en-US/docs/food/guides/modules/merchant/homologacao)

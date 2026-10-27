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

Nas próximas cópias/downloads, o aplicativo registra o texto canônico da oferta publicada e, para artes, uma cópia da imagem exportada. A API valida dono, CSRF, origem, revisão publicada e produto/promoção atual; deduplica o mesmo conteúdo. Guardar o registro é separado da geração e não usa IA. Uma falha de gravação avisa, mas não impede baixar/copiar a divulgação já pronta.

Artes locais anteriores que nunca foram salvas no servidor não podem ser recuperadas retroativamente; essa limitação aparece no histórico. Imagens/textos/kits já persistidos continuam acessíveis. Leituras antigas de cardápio deixam de ser apagadas automaticamente após 30 dias para preservar sua consulta administrativa.

## Validação concluída

A PR [#139](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/139) foi integrada em `e9f0bb7de59af434a9e069ee1493d7d5200a2253`. O commit final ensaiado é `d8059edff82ea69be8fb3fc8e53105fad8cfb816`, árvore `109b6d5679adeed595e69271d455d7ffd36641d9`. A publicação posterior da mesma árvore está registrada abaixo.

Todos os cinco workflows desse commit terminaram com sucesso:

| Prova | Resultado |
| --- | --- |
| [Autenticação/pedidos, tipos, schema e build](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40497152137) | **754 testes, 754 aprovados, zero falhas**; TypeScript aprovado; 41 tabelas, geração do schema sem diferenças; builds da aplicação e preparação/conferência Netlify aprovados |
| [Chrome](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40497152015) | **core e welcome-kit aprovados** |
| [Windows](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40497152186) | Aprovado |
| [Chat de pedidos](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40497152045) | Aprovado |
| [Cadastro público](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40497152113) | Disponibilidade aprovada, sem criar conta |

Os doze cenários novos de integração cobrem autorização e privacidade, origem/CSRF, idempotência, formatos/tamanhos, contexto criativo de IA e limite de protocolo, pausa/versionamento, aplicação somente ao rascunho, paginação, arquivamento sem consumo e verificação a partir de estados recusado, desverificado e dados alterados.

O Chrome usa navegador real e D1/R2 locais descartáveis. Reproduz a fila recusada, verificar/desverificar/verificar novamente, as ações Dar teste grátis/Liberar Pro/Suspender conta com os quatro prazos, ambas as prévias, histórico de arte quadrada e vertical/caption, upload de imagem/texto/orientação e recebimento pelo dono, com aplicação apenas ao rascunho local. O registro persistido da loja não muda antes de salvar. Recarregar o kit não cria nova geração; alterar um preço publicado impede exportar uma oferta antiga. Respostas da IA e do seletor visual de plano são simuladas; as APIs de plano são verificadas separadamente. Nenhuma conta real foi alterada.

Artefatos do Chrome, consultáveis pela execução acima e sujeitos à retenção do GitHub:

- Atendimento/kit: `12731840428`, SHA256 `cfa2feaba7212cbfd654aff7b31815ce879e53de91cc9cf7c7a27c37afa3e0b5`.
- Core: `12730763380`, SHA256 `0048854cbf47c9c1359ef2291a38155bc251fd4e0b617ffc80c8eaf0023d84e3`.

As telas equivalentes do admin foram inspecionadas visualmente no ensaio anterior à última correção de transporte. O artefato final foi confirmado pelo CI; sua inspeção visual local não foi repetida após a indisponibilidade do ambiente.

### Falha real encontrada e corrigida no ensaio

Um PNG vertical de **1.648.487 bytes** era bloqueado pelo tratamento de formulários do framework antes de chegar à API; um quadrado de 969.901 bytes passava. Aumentar apenas o limite da rota não resolvia a barreira de formulário de 1 MB.

Fotos/artes agora usam envelope binário limitado, com metadados UTF-8 e os mesmos controles de origem, CSRF, propriedade e conteúdo. A regressão inclui um arquivo acima de 1 MB e o Chrome final confirmou o envio/arquivamento da arte vertical. Não foi aumentado o limite global do proxy nem modificado o gateway Netlify.

Arquivos até 4 MB são preservados byte a byte; maiores recebem uma cópia WebP otimizada para o envio/arquivo, mantendo intacto o PNG original baixado pelo cliente. O envio manual aceita foto de até 5 MB; a cópia sai do navegador abaixo do teto público. A rota de arquivamento admite até 10 MB em acesso direto, sem aumentar o limite público.

## Publicado e conferido — v104

A interrupção do ambiente foi resolvida. O helper oficial reabriu a fonte nativa existente; nove arquivos desatualizados foram reconciliados com a main integrada. Os **1.005 arquivos** corresponderam byte a byte à fonte do GitHub. TypeScript e o build do pacote final passaram novamente; nenhuma dependência ou configuração de serviço foi alterada.

| Identificação | Valor |
| --- | --- |
| Versão | **104** |
| Projeto | `appgprj_6ac6d3ea9f7881918f315a156338ed52` |
| Versão salva | `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_ff323a9c2f708191a264733c9c989bcf` |
| Implantação | `appgdep_6ae0a78c1cb4819180a714c10a942e79` |
| Resultado | **succeeded** |
| Concluída | **27/10/2026, 10:31:19 de Brasília** (`2026-10-27T13:31:19.676685+00:00`) |
| Fonte nativa empurrada | `20a4c8769879daaf8c8bc302aa27dc338b9494dd` |
| Fonte GitHub equivalente na publicação | `494c8c4b491944b343438380fe82c6d386ff6c7e` |
| Árvore idêntica nas duas fontes | `29e4266c4e80dca3fdde29c01e534a1add143eab` |
| SHA256 do pacote gzip local | `b863e7521c64658a1aba0f106f34c947b6d5ce1d23a4426d8b1c466c193d68c5` |
| Ambiente | Revisão **20**, audiência **pública** preservada |
| Site nativo | https://forno-cardapios.waves4845.chatgpt.site |
| Endereço público | https://pizzaria-on.netlify.app/ |

A fonte antiga `5006badf3f6613e7824e8509f071aa894e18d9c6` não foi implantada. O pacote novo contém o transporte binário que passou no Chrome, além de toda a PR #139. O gateway Netlify não precisou de nova implantação.

### Conferência posterior à publicação

- `pnpm check:netlify --live https://pizzaria-on.netlify.app` aprovado: gateway assinado, dados, início, calculadora anônima e saúde/conexão de textos e imagens. A consulta não gerou IA.
- Banco de produção inspecionado por metadados: **41 tabelas**, incluindo `restaurant_support`. Nenhuma leitura de linhas/dump ou limpeza foi necessária.
- Novas APIs de atendimento, acessadas sem sessão pelo gateway, retornaram **401**; a página privada da pizzaria redirecionou ao login com **307**. As três respostas mantiveram `no-store`.
- Chrome real no endereço Netlify: início carregado e hidratado, formulário e opções de importação ativos, oferta Free/Pro visível; cardápio público da EFATA com **sete opções**.
- Carrinho da EFATA conferido sem dados pessoais nem envio: Calabresa grande **R$49,99**, entrega de **R$8,00**, total **R$57,99**. Selecionar retirada removeu a taxa, voltando a **R$49,99**. O item foi removido ao terminar; não foi criado pedido.
- Consulta dos logs recentes não mostrou 5xx ou falhas de execução; apareceram quatro GETs de robôs com 404 em `robots.txt`/`sitemap.xml`, fora dos fluxos alterados.
- Uma consulta HTTP Python direta à origem nativa recebeu 403/código 1010. A publicação nativa foi confirmada pelo Sites e a conferência pública ocorreu pelo gateway e Chrome; esse cliente HTTP direto não foi homologado.

### Onde usar

Em **Administração → Clientes e pizzarias → Abrir atendimento completo**, o administrador encontra Verificar/Desverificar, teste grátis/Pro/suspensão e as três áreas Cardápio, Imagens e textos, Orientar e enviar conteúdo. A fila antiga também passou a usar os controles claros de verificação.

O dono recebe materiais de apoio no painel e em **Cardápio → Aparência**; decide o uso no rascunho e depois salva/publica. Conteúdos não são aplicados automaticamente à loja pelo desenvolvimento.

A sessão administrativa real não estava disponível no navegador desta retomada; decisões reais de verificação/plano e upload para um cliente real não foram executados em produção. Esses fluxos passaram nos ensaios isolados descritos acima. Android físico, nova recuperação completa por e-mail real e cobrança/renovação externa reais continuam sem homologação.

A documentação posterior desta publicação é uma alteração somente documental no GitHub e não requer nova implantação do aplicativo.

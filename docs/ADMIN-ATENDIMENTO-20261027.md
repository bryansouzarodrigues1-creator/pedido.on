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

## Validação concluída — publicação pendente

A PR [#139](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/139) foi integrada em `e9f0bb7de59af434a9e069ee1493d7d5200a2253`. O commit final ensaiado é `d8059edff82ea69be8fb3fc8e53105fad8cfb816`, árvore `109b6d5679adeed595e69271d455d7ffd36641d9`. Não confundir integração do código com publicação.

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

## Produção e retomada da publicação

**Ainda não publicado.** Em 27/10/2026, a consulta do Sites confirmou produção ativa, pública e ainda na **v103**, publicada em `2026-10-27T10:16:18.218609+00:00` (07:16 de Brasília). A página antiga da fila continua visível nessa versão.

O ambiente de execução ficou indisponível antes de concluir a preparação do pacote final. As alterações interrompidas foram recuperadas e validadas pelo GitHub, e integradas na PR #139. Não presumir que o build local interrompido terminou. O pacote nativo anterior foi criado, mas **não foi salvo como versão nem implantado**:

- Última fonte nativa preparada: `5006badf3f6613e7824e8509f071aa894e18d9c6`.
- Árvore dessa fonte: `f1db8f968e6a481fc5d4de439694332edd4b3524`.
- **Não publicar esse pacote:** ele antecede o transporte binário e continua sujeito à falha de formulário.
- A fonte final do GitHub, com árvore `109b6d5679adeed595e69271d455d7ffd36641d9`, inclui a correção que passou no Chrome.
- Projeto existente: `appgprj_6ac6d3ea9f7881918f315a156338ed52`. Preservar audiência pública e ambiente; não alterar sessão, serviços, segredos ou bases para contornar a interrupção.

Quando o ambiente voltar:

1. Ler o estado atual do mesmo projeto e abrir a fonte pelo helper oficial Sites; preservar alterações locais antigas. Buscar a main atual do GitHub e comparar toda a árvore. Uma restauração anterior do ambiente trouxe um snapshot antigo.
2. Aplicar a main integrada ao checkout nativo existente e garantir que a correção binária esteja presente, junto dos testes e da documentação. Usar credencial nova; não reaproveitar tokens antigos nem colocá-los em código/logs/workflows.
3. Rodar tipos/build do pacote final pelo fluxo oficial e gerar **nova fonte empurrada e novo arquivo correspondentes**. O SHA do GitHub não substitui o SHA da fonte nativa do projeto.
4. Salvar a versão com esse SHA exato, publicar pelo Sites e aguardar o resultado terminal. A migração 0024 é aditiva; não executar reset ou limpeza de dados.
5. Conferir o site nativo e o gateway Netlify, a navegação pública, imagens e sessões. Registrar a nova versão, deployment, SHA e resultado; até essa confirmação, manter o estado “não publicado”.

Na v103, a alternativa imediata para aprovação está em **Administração → Clientes e pizzarias → Verificar loja**, junto da pizzaria, e não no seletor antigo da fila. A conferência pede observação com ao menos oito caracteres e a confirmação dos dados/vínculo/Pix; depois, **Confirmar verificação da loja**. Não aprovar automaticamente um cliente pelo desenvolvimento.

Android físico, nova recuperação completa por e-mail real e cobrança/renovação externa reais continuam sem homologação. Os testes desta entrega não substituem essas verificações externas.

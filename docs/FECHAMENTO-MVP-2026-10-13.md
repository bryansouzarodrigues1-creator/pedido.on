# Pedido.on — candidata ao beta, 13/10/2026

## Estado e decisões preservadas

O Site continua público na **v28**. A base GitHub é `a2b2e42a991132a7eaa90de4aecf6de1e18c46b3`. O trabalho desta etapa atualiza a **PR #13**, na branch `feat/admin-entitlements-ai-first-run`, a partir de `6629895c0ea207376e19356b3cb1c43ec0e44ea6`. Continua em rascunho, sem merge, migração remota ou publicação.

Supabase Auth identifica os donos; D1 guarda negócio e sessões; R2 guarda imagens e comprovantes. Cadastro público direto, cliente sem login, preços/Pix da pizzaria, carrinho/entrega/chat, PWA e conta administradora permanecem no fluxo existente. Não foi reativado convite nem CAPTCHA.

Meta comercial: fechar o desenvolvimento principal até **16/10/2026**, para um beta com **5–10 pizzarias reais**, medindo cadastro → loja configurada → cardápio publicado → primeiro pedido → interesse em pagar. O registro de sete dias existe, mas a fiscalização continua desligada. Não divulgar expiração/billing como concluídos. Sete imagens e 100 textos são proposta; cotas reais permanecem 3 imagens/dono/mês, 2 imagens/dia global, 20 textos/dono/mês e 20 textos/dia global.

## Rodada de estabilidade — continuação a partir de c2e8df5

- A importação parcial mantém **todos** os itens deixados para depois, inclusive os que já têm preço válido. Há uma ação explícita para descartar a leitura guardada.
- Texto colado, ajustes e escolhas de atualização são guardados neste aparelho. Avisos são deduplicados e os checkpoints antigos continuam legíveis. Geometria, linhas, tamanho do texto e datas inválidas são rejeitados na retomada.
- Voltar às fotos não elimina a revisão. Ao reler, ajustes são reaproveitados somente nos trechos cuja fonte não mudou; a geometria vem da leitura nova. Rotacionar invalida caixas antigas. Fotos retiradas deixam de fornecer itens.
- O botão de importação agora espera a gravação confirmada no servidor **do rascunho**. Falha de conexão, revisão concorrente ou proprietário errado não autorizam limpar a leitura. O cardápio público e o Pix permanecem iguais até publicação explícita pelo dono.
- Escritas IndexedDB são ordenadas por pizzaria, incluindo exclusão; sair da aba salva o checkpoint mais recente. O PWA considera o leitor aberto/ocupado uma atividade pendente. São proteções locais, não garantia de armazenamento quando o navegador o bloqueia.
- Acompanhamento prioriza a chave do link privado e suporta bloqueio de acesso a localStorage/sessionStorage. A tela real foi renderizada em teste com bloqueio **simulado**; não houve teste interativo em Android. Ao trocar o pedido, o componente é reiniciado por ID.
- Salvamento/importação/publicação compartilham uma trava contra ações simultâneas; operações do painel têm timeout, sem repetição automática da escrita.

## Correções da primeira rodada

1. **Ajuda contextual:** importação tem prioridade sobre palavras genéricas como foto, produto, preço e borda. A orientação para PDF informa que o leitor atual recebe capturas JPG/PNG/WebP; não promete importação nativa de PDF. Ajustes locais e pedidos criativos mantêm seus caminhos existentes.
2. **OCR de capturas:** fragmentos isolados de baixa confiança provenientes das fotos não ampliam a caixa do produto nem passam a fazer parte de seu nome. Preços separados, títulos incertos e linhas inteiramente incertas continuam disponíveis para revisão.
3. **Fotografias do cardápio:** a caixa OCR delimita o produto, mas a fotografia é procurada em uma amostra pequena da imagem local por cor e textura. Isso permite encontrar a foto distante do texto, evita recortes em branco e limita a busca pelos produtos vizinhos. Prévia preserva a proporção. Confirmação de associação/direito de uso continua obrigatória antes do upload para o endpoint R2 existente.
4. **Auditoria administrativa:** decisões registradas no mesmo instante aparecem da mais recente à mais antiga. Suspensão não interrompe o atendimento dos pedidos que já existem.

Não há reconhecimento semântico do alimento. Fotografias monocromáticas, caixas OCR incorretas, fotos sobrepostas e layouts complexos podem exigir envio manual. As capturas de QA repetem a mesma fotografia do repositório para avaliar posição/recorte; não comprovam identificar sabores diferentes. Nada é aplicado automaticamente ao rascunho ou publicado.

## Evidências locais

| Verificação | Evidência | Limite da prova |
| --- | --- | --- |
| Suíte do aplicativo | **210 testes aprovados**; typecheck e build aprovados | Serviços externos simulados nos testes de rotas |
| Migração 0012 | Executada em workerd/D1 local após 0000–0011; preservou dados e as **19 tabelas anteriores**, incluindo pedidos, sessões e trial; adiciona duas tabelas; reaplicação e `foreign_key_check` passaram | Sem leitura/migração de produção; dados fictícios |
| Admin e concorrência | Dono comum/anônimo, CSRF inválido, origem externa e alteração da própria conta negados; duas decisões com a mesma versão resultaram em 200/409 e um evento; falha na auditoria reverteu a mudança de acesso | D1 e SQL reais, identidade externa substituída por identidades locais |
| Cortesia e assinatura | Plano pago Rede não foi rebaixado por cortesia Essencial; expiração volta à política vigente; nenhuma assinatura foi modificada | Credenciais fictícias; nenhuma chamada a gateway |
| Pedidos durante suspensão | Novos pedidos/publicação bloqueados; pedido antigo continuou com acompanhamento, comprovante privado, chat, conferência Pix, preparo, entrega e conclusão; outra loja permaneceu isolada | Rotas reais com adaptadores D1/R2 e identidade simulados |
| OCR convencional | Tabela, duas colunas e JPEG inclinado/escurecido reconheceram produtos, preços P/M/G, bebida e borda | Imagens reproduzíveis, processamento no computador |
| OCR e fotos | Quatro capturas: direita, esquerda, produtos próximos e sem foto; **12 produtos/preços** corretos; nove recortes cobriram a foto inteira sem tocar fotos vizinhas; fonte sem foto gerou zero candidatos | Tesseract real e inspeção dos PNGs; não são prints reais de plataformas |
| Retomada e importação | Texto sem foto, importação parcial, 30 reaberturas consecutivas, escrita seguida de exclusão, falha de escrita, metadados inválidos, seleção explícita e revisão da mesma fonte passaram | IndexedDB emulado; retenção depende das condições do navegador |
| Gravação do rascunho | Fluxo esperou confirmação; gravou só produtos selecionados, manteve cardápio público/Pix e preservou os itens restantes; conflito de revisão e outro dono negados | Código real das rotas, identidade/D1/R2 simulados |
| Link privado restrito | Renderização da tela real com acesso a storage negado manteve Pix e chat; token não apareceu no HTML | SSR e restrição simulados, sem navegador interativo |
| Netlify | Preparação e verificação estática aprovadas | Sem implantação ou mudança de domínio |

As quatro capturas com OCR e recorte levaram aproximadamente **0,26–0,50 segundo por imagem** nesta execução, depois de carregar o leitor. Não é medição de Android, rede ou primeira carga. Os relatórios e PNGs são regeneráveis em `.sites-runtime/`, sem dados de clientes. Nenhum crédito Lovable/OpenAI, imagem nova de IA ou e-mail foi consumido/enviado.

Comandos de reprodução:

```sh
pnpm test
pnpm typecheck
pnpm build
node --experimental-strip-types scripts/check-menu-ocr.mjs
node --experimental-strip-types scripts/check-menu-photo-ocr.mjs
pnpm build:netlify
pnpm check:netlify
```

O CI da PR executa esses passos. Os logs com `Request failed Error` nos dois cenários negativos de D1 são esperados: ausência da migração e falha forçada da auditoria; os testes conferem a resposta e a integridade dos dados.

## O que falta para decidir a publicação

- **Três cardápios reais**, com dificuldade diferente e um print fornecido pelo dono: nomes, tamanhos/preços, associação de fotos, revisão parcial, texto colado, retomada após fechar/reabrir, falha de rede ao importar e múltiplos lotes. Sem novos modelos pagos.
- **Dois celulares**, usando contas e pedidos fictícios: cadastro, importação/câmera, salvar/publicar conteúdo de teste, carrinho, bairro/taxa, aceite, Pix, chat e entrega. Conferir admin com duas contas.
- **PWA:** instalação, reabertura/offline, atualização com rascunho e notificação com painel fechado. A emulação não substitui esse teste.
- **Recuperação de senha e operação do beta:** entrega/link reais continuam pendentes. Definir suporte seguro para contas de teste; não anunciar assinaturas completas.

O ambiente desta execução não expôs o controle de navegador exigido pelo fluxo Sites. Nenhum servidor de preview foi iniciado e a interface autenticada não foi testada interativamente. A revisão visual ocorreu apenas nos PNGs produzidos pelo teste local.

## Ordem de liberação e reversão — preparada, não executada

1. Conferir novamente main, head/CI da PR e versão/audiência Sites. Resolver qualquer alteração posterior sem sobrescrever trabalho ou dados. Manter a PR em rascunho até a QA móvel.
2. Com autorização concreta para liberação, gerar e conferir backup privado de D1 e inventário/cópia R2; preservar Supabase, `AUTH_SESSION_KEY`, secrets, sessões e audiência. Não guardar dumps, comprovantes ou segredos no GitHub.
3. O pacote Sites copia `drizzle/` e seu journal. **O código que lê `account_access` exige 0012 antes de servir tráfego.** A falta da tabela retornou 500 no teste local. Conferir a migração aditiva pelo fluxo oficial e abortar a liberação se ela falhar. Não executar migração manual remota por antecipação.
4. Integrar apenas o head revisado; abrir/reconciliar a fonte Sites pelo helper oficial, preparar o pacote correspondente e publicar a versão retornada. GitHub não publica o Site automaticamente.
5. Conferir sem modelos pagos: cadastro direto, loja existente, pedido/Pix/chat, endpoints privados, PWA, concessão/suspensão/restauração entre contas de teste. Não aumentar cotas nem ativar fiscalização/cobrança nesta publicação.
6. Se necessário, reverter o aplicativo para a **v28 preservada**. As tabelas aditivas 0012 permanecem: não fazer down-migration destrutiva ou restaurar um dump sobre pedidos novos. Suspensões/concessões novas não são reconhecidas pelo código v28; revisar seu estado operacional antes de voltar ao público.

Asaas permanece em PR separada. Resend, cobrança/renovação/cancelamento/estorno, orçamento financeiro global, relatório CSV, PDF avançado e integrações oficiais iFood/99Food ficam nas etapas comerciais posteriores.

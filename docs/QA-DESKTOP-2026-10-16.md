# QA no Desktop Commander — 16/10/2026

Esta rodada substitui o bloqueio de navegador registrado na [auditoria inicial](AUDITORIA-IA-FIRST-2026-10-16.md). O Rodrigues ficou online e os testes foram executados no Chrome instalado no Windows. O código da PR #26 foi aberto em uma cópia isolada do repositório original, com Workers, D1 e R2 locais. Não foi criado outro repositório remoto nem outro Site.

Base auditada: `20f1f15024487680f7d4673229871a34f0f6696d`, com as correções desta revisão. Produção continua na v41 e main em `b5b58ea9471f241b4b39f1a2675e160edb4e0a01`. As evidências sanitizadas estão em [QA-DESKTOP-2026-10-16.json](QA-DESKTOP-2026-10-16.json).

## Problemas corrigidos

1. **Erro de hidratação em /criar.** A página envolvia `Brand`, que já é um link, em outro link. O navegador reparava o HTML e o React encontrava uma árvore diferente; o overlay de erro interceptava os cliques. O console identificou os dois elementos `a`. A correção remove somente o invólucro redundante. A entrada voltou a inicializar sem erros e os 13 cenários seguintes passaram.
2. **Confirmação antecipada na calculadora.** O botão informava “Cálculo salvo” enquanto a gravação ainda dependia do timer de 300 ms. A prova na v41, após aguardar a inicialização, registrou a mensagem de sucesso com `stored: false`. A gravação explícita agora acontece antes do sucesso. Se o armazenamento falha, o texto explica que o cálculo está apenas na página e oferece baixar a cópia.
3. **Briefing longo e cota no Estúdio.** A soma de briefing e refinamentos pode exceder o limite de 1.600 caracteres de texto ou 600 de imagem. O cliente agora bloqueia esse envio antes de criar a requisição e conserva o texto, com orientação para resumir. A interface também mostra uma criação da cota e o saldo disponível antes da geração. Um teste novo reproduziu a ausência da validação e passou após a correção. O navegador conservou 1.693 caracteres, bloqueou o envio e exibiu o saldo ao resumir; a disponibilidade foi simulada, sem chamar o provedor.
4. **Texto da capa.** A confirmação usa “Capa adicionada” e “Guarde”, de acordo com o botão “Guardar rascunho”.

Contas, preços, cotas, dados financeiros, chave de sessão e migrações de produção não foram modificados. As 15 migrações existentes foram aplicadas somente ao banco local de QA.

## Verificações concluídas

| Escopo | Resultado e limite |
| --- | --- |
| Suíte do aplicativo | 331 aprovados, zero falhas, zero ignorados; TypeScript e build oficial Sites aprovados |
| Entrada no navegador | 13/13 cenários reproduzíveis; zero erros de JavaScript na execução final |
| Estúdio no navegador | Mensagem longa preservada e envio bloqueado; aviso de uma criação da cota; zero chamadas ao provedor |
| Calculadora no navegador | 4/4: gravação imediata, recuperação, aviso de falha de armazenamento e download com/sem armazenamento |
| Tela pequena | Larguras 320, 360 e 412 px; prompt de 1.570 caracteres; viewport reduzido a 480 px de altura; sem transbordamento horizontal do documento |
| Oito estilos | Duas rodadas de quatro, seleção e prévia ampliada dos oito; layouts, alturas de cabeçalho, disposição das fotos e fontes conferidos visualmente e por medidas |
| Desktop | Documento de 1.440 px sem transbordamento; galeria com duas colunas de 392 px |
| Anexos | TXT, CSV, foto do cardápio, logo e capa; remoção independente; marca fora do OCR; recuperação após recarregar e reabrir o Chrome |
| Refinamento | Pedidos sucessivos de verde/azul e composição compacta; preservação de cantos; pedido 3D conservado com aviso de limite |
| Armazenamento | Recuperação pelo IndexedDB quando localStorage está bloqueado; ambos bloqueados impedem navegação com falsa promessa de salvamento |
| Handoff | Nome explícito sem perguntar de novo; estilo, cor, refinamento e imagens no mesmo rascunho; produtos vazios, Pix desativado e publicação falsa |
| Aplicação da marca | Logo e capa enviados ao R2 local e gravados no rascunho pela ação “Guardar rascunho”; referências seguem disponíveis no aparelho |
| Handoff interrompido | Falha de quota simulada apenas na cópia dos anexos; botão de retomada após recarregar; uma pizzaria criada, zero duplicações |
| Supabase real | Dois cadastros de QA com domínio de teste reservado; acesso direto, sessão após reabrir Chrome, logout/login com senha real e preservação de `next` |
| Separação entre donos | Segunda conta não vê pizzarias da primeira; leitura de pedidos e tentativa de PUT de outro dono retornaram 404; rascunho original conferido sem alterações |
| Produção pública | Início, cadastro e demonstração abrem sem erros JavaScript; /criar ainda 404 por não ter sido publicado |
| Pedido demonstrativo publicado | Meio a meio, borda, quantidade, retirada, Pix com conferência manual, preparo, saída, conclusão e comandas de exemplo |
| Operação no backend local | Cliente anônimo e dono em dois contextos; pedido de R$ 142,00 calculado no servidor, recebido e concluído; banco com um pedido; cardápio local pausado ao terminar |
| Comandas locais | Vias de cozinha e entrega autenticadas; pedido concluído identificado como histórico e sem nova cobrança |
| PWA em produção | Manifesto standalone, service worker ativo, página “Vamos reconectar.” ao recarregar offline e retorno ao painel com a sessão ao restabelecer conexão |
| Trial em produção | Conta de QA com sete dias ativos; `enforced: false` confirmado, sem alteração de configuração |
| OCR no Chrome | Imagem sintética com quatro produtos, duas categorias e seis preços de tamanhos: associação correta; zero itens inventados; 928 ms nesta execução Windows |
| iFood público | Consulta real no caminho atual: `needs_content`, zero produtos; link preservado, mensagem de alternativa e quatro modelos disponíveis |

O handoff da candidata usou o mock de login local oficial do Sites. Cadastro, login, sessões e isolamento Supabase foram exercitados separadamente na produção. Não afirmar que o fluxo inteiro da candidata já foi homologado com Supabase na URL publicada. Os testes de pedido local e Pix demonstrativo não representam pagamento bancário ou pedido de cliente real.

As primeiras rodadas da automação exigiram corrigir expectativas do próprio teste: leitura do corpo após redirecionamento, uso de GET numa rota que só implementa PUT e tentativa de encontrar valor financeiro em uma comanda histórica. As verificações finais usam as rotas e regras efetivas. A calculadora aguarda o fim da inicialização e também confere o armazenamento imediatamente antes de recarregar, evitando confundir hidratação tardia com persistência.

## Reprodução dos testes de navegador

Use um preview local do projeto, Chrome já instalado e `playwright-core` em um diretório de ferramentas de teste. Os scripts aceitam somente origem de loopback, criam seus próprios perfis e não cadastram contas, publicam cardápios ou chamam geradores pagos.

Exemplo PowerShell:

```powershell
$env:QA_BASE_URL='http://localhost:5173'
$env:QA_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:QA_PLAYWRIGHT_MODULE='C:\caminho\das\ferramentas\node_modules\playwright-core'
node scripts/check-guest-browser.mjs
node scripts/check-calculator-browser.mjs
```

O caminho de ferramentas é absoluto e deve apontar para a instalação de QA disponível. `QA_BROWSER_OUTPUT` escolhe o destino das provas; o padrão fica em `.sites-runtime/`, ignorado pelo Git. `QA_HEADLESS=true` permite execução sem janela quando houver um Chrome compatível. O teste da entrada fecha e reabre o navegador para verificar persistência.

Verificações do aplicativo:

```sh
pnpm test
pnpm typecheck
```

## Pendências materiais

- **Publicação da candidata:** autorização de publicação ainda não identificada nesta conversa. Preparar a ordem #24 → #26, preservar a #25 separada e a audiência pública/bindings/ambiente. Conferir novamente cadastro e handoff na URL publicada antes de declarar a Entrega 1 homologada em produção.
- **Android físico:** teclado real, toque, instalação PWA, consumo de memória/bateria, câmera e notificações em aparelho intermediário. A emulação de viewport não substitui esses testes.
- **OCR de cardápios reais:** as fotos originais ainda não estão disponíveis no executor. A imagem reproduzível aprovada não comprova as estruturas reais que falharam anteriormente. GG, complementos, colunas difíceis e ruídos continuam na Entrega 2.
- **iFood:** esta rodada não incorpora a ampliação da PR #25. O catálogo real consultado não foi importado. API oficial depende de homologação/autorização do lojista.
- **Google e recuperação de senha:** desativados na configuração efetiva. Não foram apresentados como disponíveis nem habilitados sem validação.
- **Financeiro:** Asaas habilitado em produção; emissão, pagamento, webhook bancário, renovação e cancelamento reais não executados. Nenhuma cobrança foi emitida. As proteções com provedores simulados continuam cobertas pela suíte.
- **Teste grátis:** prazo registrado corretamente, mas cobrança obrigatória e corte após vencimento estão desativados em produção. O beta comercial depende da homologação e ativação deliberada desses controles.
- **IA paga:** saldos da conta de QA permanecem em zero uso de imagens/textos. Geração real, custo unitário e qualidade de refinamento externo não foram testados nesta rodada.
- **Briefing longo no Estúdio:** briefing de até 1.600 caracteres mais refinamentos de até 600 podem ultrapassar o limite de mensagem do Estúdio autenticado. A interface conserva o texto e pede um resumo dentro do limite antes de enviar. Não foi implementado resumo automático ou aumento de limites.
- **Operação real:** ainda faltam dois celulares físicos, entrega de push, WhatsApp enviado por um operador, impressora e fluxo completo de pedido numa pizzaria de beta. As mensagens não foram enviadas e nenhum pedido de produção foi criado.

Foram criadas duas contas de teste reservadas e um rascunho privado de QA na produção, por fluxos normais de cadastro; nenhum cardápio novo de produção foi publicado. A operação com pedido e os uploads de marca desta rodada ficaram no ambiente local. Não há credenciais, cookies, tokens de acompanhamento ou corpos privados no relatório versionado.

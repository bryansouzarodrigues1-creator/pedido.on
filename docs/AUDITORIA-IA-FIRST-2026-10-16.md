# Auditoria da Parte 1 — 16/10/2026

## Estado recuperado
Produção Sites v41, main `b5b58ea9471f241b4b39f1a2675e160edb4e0a01`. PR #24 aberta em `8535c87286abc8632906db57216fc1006a93f801`; PR #26 aberta em `00823049980d3d19c6052b0c4e926138366b3064`, que já inclui a #24. A fonte Sites foi aberta pelo fluxo oficial e a árvore inicial foi confrontada com a main. Nenhuma edição local anterior estava disponível no novo executor.

## Problemas corrigidos
- Refinamentos sequenciais passam a ser aplicados em ordem, sem uma cor antiga sobrepor a solicitação mais recente. Alterar cor/composição preserva os outros ajustes e os dados comerciais.
- Pedidos de criação de fotografias e animação não são confundidos com comandos gratuitos de geometria. O feedback descreve o limite dos modelos, conservando o pedido completo.
- Logo e capa podem ser removidos separadamente antes do cadastro; continuam separados das fotos de OCR.
- O briefing e a escolha possuem checkpoint redundante: localStorage e IndexedDB. Um armazenamento bloqueado não impede a recuperação quando o outro funciona. Se ambos falham, a interface avisa e não navega fingindo que salvou.
- A exclusão de um checkpoint adotado usa marcador no IndexedDB para impedir que uma falha na limpeza do localStorage ressuscite o projeto antigo.
- Ao criar a pizzaria, a tentativa é vinculada ao ID do rascunho. Se a transferência de anexos falhar, o painel oferece tentar novamente na mesma pizzaria, inclusive depois de recarregar. A leitura não pode ser transferida para outro rascunho.
- O formulário aguarda recuperar a escolha da etapa pública antes de pedir informações.
- Ajustes de CSS diferenciam cabeçalhos divididos e de capa na galeria, melhoram áreas de toque e quebra de texto, e empilham controles em telas estreitas. A aparência real ainda exige conferência.

## Verificação desta árvore
- 330 testes do aplicativo: 330 aprovados, zero falhas, zero ignorados.
- 22 testes direcionados de galeria, checkpoint, anexos e transição: 22 aprovados.
- O novo teste de refinamento reproduziu a falha anterior (verde persistia ao pedir azul) antes da correção.
- TypeScript e build pelo helper oficial Sites aprovados.
- OCR Tesseract real em imagens reproduzíveis: tabela, duas colunas e foto inclinada; respectivamente 4, 5 e 4 itens esperados. Nesta execução: 752, 502 e 615 ms após preparar o worker (379 ms). São medições do executor, não de Android.
- Recortes em quatro imagens reproduzíveis: direita, esquerda, produtos próximos e sem foto; 12 produtos, nove recortes com cobertura integral e sem sobreposição com foto vizinha; fonte sem foto não criou recortes.
- Identidade externa, transporte financeiro e modelos seguem simulados nos testes que usam fixtures. Não houve geração paga, cobrança ou validação de pagamento bancário real.

Reprodução:
```sh
pnpm test
pnpm typecheck
node --experimental-strip-types scripts/check-menu-ocr.mjs
node --experimental-strip-types scripts/check-menu-photo-ocr.mjs
```

## Limite concreto de QA
O navegador cloud pôde ser inicializado, mas o endereço oficial de preview recusou a conexão. O supervisor informa início e status ativo sem entregar a porta HTTP. O perfil local ausente foi configurado pelo helper oficial; reiniciar o supervisor após essa correção não restabeleceu a conexão. Não foi iniciado servidor alternativo ou instalada outra automação.

Os dispositivos Desktop Commander Rodrigues e Denilson estão offline. Não houve navegação funcional, inspeção visual dos oito modelos, teste de teclado Android ou homologação do cadastro em navegador.

O critério do proprietário exige QA visual real antes de integrar/publicar. Portanto a PR #26 permanece em rascunho; a #24 também não foi integrada, e a produção continua na v41. Não substituir essa evidência por CI aprovado.

## Sequência de liberação
1. Abrir esta candidata em preview/navegador funcional e conferir os oito estilos, mobile, prompt longo, adicionar/remover arquivos, recarregar e retornar do cadastro.
2. Usar conta de teste para conferir o nome, modelo, refinamento e anexos no rascunho, sem produtos fictícios ou publicação automática. Testar armazenamento bloqueado e recuperação de transferência.
3. Confirmar a configuração real de e-mail/Google e separar o provedor simulado das provas externas.
4. Integrar #24 primeiro, reconciliar #26 sem duplicar commits e conferir o head/CI resultantes.
5. Com QA e autorização de publicação aplicáveis, empacotar a mesma árvore no Sites, preservar projeto/audiência/bindings/ambiente e conferir a versão pública retornada.
6. Continuar o OCR com capturas reais do proprietário e a PR #25 separadamente. As imagens reproduzíveis desta auditoria não substituem catálogos reais ou integração iFood homologada.

Asaas, cotas, preços, trial, credenciais e esquema D1 não foram alterados por esta auditoria.


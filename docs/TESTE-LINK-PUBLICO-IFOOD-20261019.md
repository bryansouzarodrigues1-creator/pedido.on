# Teste real do link público iFood

Em **19/10/2026 às 15:23:55 de Brasília**, testamos os links públicos da Master Pizzas e Aione no Chrome padrão do GitHub Actions. O acesso foi anônimo e o navegador pôde executar os recursos normais de segurança do próprio site. **As duas lojas permaneceram no desafio de confirmação humana, com HTTP 403, zero produtos e nenhum dado cadastral recebido.**

| Loja fornecida pelo proprietário | HTTP inicial/final | Produtos | Endereço/horários recebidos |
| --- | --- | --- | --- |
| Master Pizzas - Búzios | 403 / 403 | 0 | Não |
| Aione Pizzas - Cabo Frio | 403 / 403 | 0 | Não |

O Chrome executou oito solicitações de segurança normais em cada loja, sem bloquear escritas comerciais tentadas (nenhuma foi tentada). A captura final da Master mostra a caixa **“Confirme que é humano”**. O teste não interage com esse desafio, não injeta cookies/tokens, não usa proxy ou stealth e não se autentica. A leitura HTTP independente da Master, às 15:18:06, também retornou 403.

## Reprodução e provas

- Script: `scripts/probe-public-store-chrome.mjs`; somente os dois links já fornecidos pelo proprietário.
- Workflow: `.github/workflows/public-ifood-probe.yml`.
- [Rodada final 39302118477](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39302118477), head `d247b661558f07ab0c40e4671423a5c5c16517cc`, Chrome `155.0.8059.39`.
- Artefato `12211294429`, SHA-256 `b16a836997afc092c7cea67db9e6284bda995217787de802ebe1df775383c4f0`, com resumo e capturas reais; retenção de 14 dias no Actions.
- [Evidência estruturada durável](EVIDENCIA-LINK-PUBLICO-IFOOD-20261019.json).

**Workflow concluído com sucesso significa diagnóstico executado, não cardápio importado.** A primeira rodada `39301747322` restringia recursos normais da verificação de segurança; é preliminar e foi substituída por esta rodada corrigida.

## O que a referência do Anota AI confirma

O [guia oficial de instalação do Anota AI](https://anota.ai/blog/baixar-anota-ai/), na seção “Importar cardápio do iFood”, descreve copiar o link público e iniciar a importação. Isso confirma a existência do recurso deles; o artigo não publica o mecanismo técnico nem garante acesso para outro importador. A [central de ajuda atual](https://anota.ai/ajuda/primeiros-passos/) também descreve autorização de importação e aproveitamento de cardápio, horários e endereço.

A descrição de “web scraping/parsing” no resumo do Google não demonstra como a infraestrutura do Anota AI obtém os dados. CNPJ é identificação da loja; não substitui autorização no conector oficial. Nenhuma tentativa de usar infraestrutura ou contas do Anota AI foi feita.

## Decisão

O leitor público existente continua utilizável quando uma página fornece dados estruturados claros. **Não houve evidência de um novo formato de catálogo a corrigir: o bloqueio aconteceu antes de o catálogo chegar.** Não marcar nome derivado da mensagem compartilhada como importação de produtos, nem prometer sucesso por apenas aceitar a URL.

O caminho automático preparado segue sendo o conector oficial, ainda dependente de cadastro/permissões externos e validação com loja autorizada. Quando o responsável consegue abrir a página normalmente no aparelho, arquivo salvo, PDF, texto ou fotos podem alimentar o leitor já existente, com revisão. Este ensaio não demonstrou importação só pelo link nas duas lojas.

Esta alteração adiciona apenas diagnóstico e documentação. O aplicativo público permanece na **v67**, com as configurações e os cadastros preservados. Não houve pedido, publicação de cardápio, pagamento, mensagem, cadastro de conta ou geração paga.

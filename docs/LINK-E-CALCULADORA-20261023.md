# Link iFood e calculadora por sabor — v85

Publicada em 23/10/2026 às **20:39 de Brasília** no projeto Sites existente, ambiente revisão **13**, sem trocar contas, banco ou imagens. Frontend Lovable também publicado, com a nova tabela confirmada por GET nos dois domínios.

- Principal: PR [#96](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/96), merge `8b80e68f3b5abbf66f876984b20a852daccf5e91`.
- Lovable: PR [#50](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/50), merge `18ffbd64a0318eb6b0064b46c94973e58f5f45b3`.
- Fonte funcional idêntica no principal e em `legacy/pizzaria-on-source`: árvore `2bcbc16664ee1767c97e3c20813c6d6327027c2c`.
- Fonte Sites `f27557cc91d13bcf8bdf5b8d7e338d37fa1738d8`, deployment `appgdep_6adbf0289c248191bff24b0874e55366`, sucesso confirmado. Arquivo SHA256 `a2ae61b000b1ddba96f0be13ce9c2f4d3bd0584746a71473c2ab351b303052d3`.
- Lovable deployment `856a514e-7ca3-4580-8d45-c4597ecb80b7`: API respondeu inicialmente `pending`; depois `/calculadora` retornou 200 com a tabela nova e o projeto informou o commit de merge acima, publicado e pronto. Não foi usada geração paga Lovable.

## Identificação e consulta do link

O campo agora identifica o endereço localmente, sem esperar pela rede. Mostra o nome e a região sugeridos pelo link, com aviso para conferir. Ao colar um link completo ou a mensagem padrão de compartilhamento no campo vazio, inicia uma única consulta; colagens duplicadas no mesmo instante não duplicam a chamada. Texto misturado com instruções continua podendo ser enviado pelo botão.

O link fica guardado no estado da conversa antes da consulta. Quando o catálogo não abre, o cliente ainda consegue confirmar ou corrigir o nome e continuar com sua prévia. Mensagens de falha e limite recebidas da API são preservadas; perda de conexão ou tempo esgotado não vira “link inválido”. O nome confirmado também sobrevive à recarga.

**Reconhecer a loja pelo endereço não equivale a extrair seu catálogo.** O teste novo usa o compartilhamento da Master Pizzas - Búzios e simula a resposta sem produtos. Nenhuma consulta real adicional ao iFood foi feita nesta entrega. O último teste real continua HTTP **403**, zero produtos.

A inspeção da configuração de produção confirmou ausência de `APIFY_TOKEN` e dos habilitadores da importação Apify/oficial. O fluxo público usa a consulta HTML existente; o navegador Browserbase pertence ao runner revisável no GitHub, não é chamado pelo campo público. Uma conta conectada no chat/navegador não configura automaticamente o servidor do site. Não anunciar importação automática com navegador como homologada. PDF, foto, TXT/CSV e solicitação assistida no painel continuam disponíveis.

O ambiente Work, GitHub e Sites responderam. Os dois computadores listados no Desktop Commander estavam **offline**; não afirmar reconexão do computador pessoal. Nenhuma configuração de acesso foi ampliada para tentar contornar o bloqueio.

## Calculadora por sabor

A tabela segue a referência visual enviada: cabeçalhos em salmão e linhas escuras, custo e percentuais editáveis e preço em destaque. Um sabor começa vazio. O botão **Usar exemplos da imagem** preenche cinco exemplos; esses valores não são custos declarados de uma pizzaria e não são produtos do catálogo.

Cada sabor oferece custo total, reserva estimada de despesas, lucro desejado sobre o custo, preço sugerido, lucro bruto e sobra após a reserva. A margem bruta sobre o preço também aparece separadamente. É possível adicionar, duplicar ou remover sabores, salvar imediatamente, reabrir a tabela e baixar CSV. A projeção mensal anterior permanece em **Projeção do lucro no mês**, com os cálculos e o armazenamento anteriores preservados.

Os percentuais são digitados como **15** para 15% e **135** para 135%. Na referência, “1,35” é um acréscimo de 135% sobre o custo, não uma margem de 135% sobre o faturamento.

```text
preço sugerido = custo × (1 + despesas% / 100 + lucro sobre custo% / 100)
lucro bruto = preço sugerido − custo
reserva = custo × despesas% / 100
sobra após reserva = lucro bruto − reserva
```

O preço final é arredondado uma única vez a centavos; a reserva também é exibida em centavos. Com os números visíveis da primeira linha da imagem, R$26,01 × 2,50 = R$65,025, portanto o resultado é **R$65,03**. A imagem não permite verificar casas decimais ocultas da planilha; não foi copiado R$65,02 apenas para coincidir visualmente. Para custo R$20, despesas 15% e lucro sobre custo 125%, a tabela mostra preço R$48, lucro bruto R$28, reserva R$3 e sobra R$25.

O CSV contém todos os sabores, valores em centavos, UTF-8 e separador `;`. Nomes que poderiam virar fórmula de planilha são escapados. Campos inválidos impedem a exportação completa; não são silenciosamente eliminados. Com armazenamento bloqueado, a interface avisa que não guardou, mas mantém o cálculo e permite baixar uma cópia.

## Testes e inspeção

Passaram **609 testes**, TypeScript, build Sites, Windows e **27 testes React**/TypeScript/build do Lovable. As dez suítes locais de Chrome passaram, incluindo nove cenários do criador, seis de recuperação e oito da compra completa. O teste da calculadora confere os cinco sabores, edição dos percentuais, duplicação/remoção, gravação e recarga imediatas, download CSV e armazenamento bloqueado, em telas de 320, 412 e 1280 px. A captura da nova tabela foi inspecionada antes de publicar.

- Chrome: [40040263228](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40040263228), artifact `12538763249`, SHA256 `a1e61fc6d70896f941106c81897a8d0989937f5aa71ba6bc46ffc897faebfff1`.
- Windows: [40040263321](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40040263321).
- Autenticação e pedidos: [40040263103](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40040263103).
- Lovable: [40040306820](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/40040306820).

O Chrome público da CI ocorreu na versão anterior, antes da v85. Depois de publicar a v85, houve verificação HTTP dos dois domínios: `/criar` e `/calculadora` retornaram 200; a tabela nova estava no HTML dos dois. A saúde do backend principal respondeu 200. O frontend Lovable não expõe `/healthz` e respondeu 404 nessa rota, sem afetar as páginas do cliente.

Os **sete registros completos de restaurantes** foram comparados antes e depois das publicações v84/v85 e permaneceram idênticos. Pedidos, comprovantes e cadastros de QA usam D1/R2 descartáveis. Supabase e falhas de provedores são simulados onde indicado. Nenhum pagamento, mensagem externa, e-mail, chamada paga de IA ou nova tentativa real iFood foi executado. Android físico, impressão física e pagamento bancário real não foram homologados.

A [entrega v84](JORNADA-CLIENTE-20261023.md) documenta as correções anteriores de compartilhamento, nome, sessão, salvamento e conversa privada, preservadas nesta versão.
